"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentStaff } from "@/lib/modules/staff/current";

const ALLOWED_ROLES = new Set(["owner", "admin"]);

async function requireOwnerOrAdmin() {
  const staff = await getCurrentStaff();
  if (!staff || !ALLOWED_ROLES.has(staff.role)) return null;
  return staff;
}

function generateToken() {
  return randomBytes(16).toString("hex");
}

// ------------------------- AREAS ----------------------------------------

const CreateAreaSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export async function createArea(input: { name: string }) {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false as const, error: "Yetkisiz." };
  if (!staff.branchId) return { ok: false as const, error: "Şube bilgisi yok." };

  const parsed = CreateAreaSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz isim." };

  const supabase = createSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("areas")
    .select("display_order")
    .eq("branch_id", staff.branchId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((existing?.display_order as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("areas")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      name: parsed.data.name,
      display_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/staff/admin/masalar");
  return { ok: true as const, id: data!.id as string };
}

// ------------------------- TABLES ---------------------------------------

const CreateTableSchema = z.object({
  label: z.string().trim().min(1).max(30),
  area_id: z.string().uuid().nullable().optional(),
  seats: z.number().int().min(1).max(30).nullable().optional(),
});

export async function createTable(input: {
  label: string;
  area_id?: string | null;
  seats?: number | null;
}) {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false as const, error: "Yetkisiz." };
  if (!staff.branchId) return { ok: false as const, error: "Şube bilgisi yok." };

  const parsed = CreateTableSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri." };

  const supabase = createSupabaseServiceClient();

  const { data: table, error } = await supabase
    .from("tables")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      label: parsed.data.label,
      area_id: parsed.data.area_id ?? null,
      seats: parsed.data.seats ?? null,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Bu etiketle zaten bir masa var." };
    }
    return { ok: false as const, error: error.message };
  }

  // Token yaratmaya çalış, çakışırsa yeniden dene
  for (let i = 0; i < 5; i++) {
    const token = generateToken();
    const { error: tokenErr } = await supabase.from("table_qr_tokens").insert({
      table_id: table!.id,
      token,
      active: true,
    });
    if (!tokenErr) break;
    if (tokenErr.code !== "23505") {
      return { ok: false as const, error: tokenErr.message };
    }
  }

  await logEvent(supabase, staff, "table.created", "table", table!.id as string, {
    label: parsed.data.label,
  });

  revalidatePath("/staff/admin/masalar");
  return { ok: true as const, id: table!.id as string };
}

const UpdateTableSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(30).optional(),
  area_id: z.string().uuid().nullable().optional(),
  seats: z.number().int().min(1).max(30).nullable().optional(),
  active: z.boolean().optional(),
});

export async function updateTable(input: z.infer<typeof UpdateTableSchema>) {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false as const, error: "Yetkisiz." };

  const parsed = UpdateTableSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri." };
  const { id, ...fields } = parsed.data;
  if (Object.keys(fields).length === 0) {
    return { ok: false as const, error: "Değişiklik yok." };
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tables").update(fields).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Bu etiketle zaten bir masa var." };
    }
    return { ok: false as const, error: error.message };
  }

  await logEvent(supabase, staff, "table.updated", "table", id, fields);

  revalidatePath("/staff/admin/masalar");
  return { ok: true as const };
}

// Rotate: eski token'ı pasifle, yenisini yarat
export async function rotateTableToken(input: { table_id: string }) {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false as const, error: "Yetkisiz." };

  const parsed = z.object({ table_id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri." };

  const supabase = createSupabaseServiceClient();

  await supabase
    .from("table_qr_tokens")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("table_id", parsed.data.table_id)
    .eq("active", true);

  for (let i = 0; i < 5; i++) {
    const token = generateToken();
    const { error } = await supabase.from("table_qr_tokens").insert({
      table_id: parsed.data.table_id,
      token,
      active: true,
    });
    if (!error) {
      await logEvent(supabase, staff, "table.token_rotated", "table", parsed.data.table_id, {});
      revalidatePath("/staff/admin/masalar");
      return { ok: true as const, token };
    }
    if (error.code !== "23505") return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: "Token üretilemedi, tekrar deneyin." };
}

// ------------------------- helpers --------------------------------------

async function logEvent(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  staff: { tenantId: string; branchId: string | null; profileId: string },
  action: string,
  subjectType: string,
  subjectId: string,
  payload: Record<string, unknown>,
) {
  await supabase.from("event_log").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    actor_type: "staff",
    actor_id: staff.profileId,
    action,
    subject_type: subjectType,
    subject_id: subjectId,
    payload,
  });
}
