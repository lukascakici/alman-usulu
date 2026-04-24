"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentStaff } from "@/lib/modules/staff/current";

const ALLOWED_ROLES = new Set(["owner", "admin"]);

export type MenuActionResult = { ok: true } | { ok: false; error: string };

async function requireOwnerOrAdmin() {
  const staff = await getCurrentStaff();
  if (!staff || !ALLOWED_ROLES.has(staff.role)) return null;
  return staff;
}

// ---------- UPDATE ------------------------------------------------------

const UpdateMenuItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "İsim boş olamaz").max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  base_price: z.number().min(0).max(100000).optional(),
  active: z.boolean().optional(),
});

export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;

export async function updateMenuItem(
  input: UpdateMenuItemInput,
): Promise<MenuActionResult> {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false, error: "Yetkisiz." };

  const parsed = UpdateMenuItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz veri.",
    };
  }

  const { id, ...fields } = parsed.data;
  if (Object.keys(fields).length === 0) {
    return { ok: false, error: "Değişiklik yok." };
  }

  const supabase = createSupabaseServiceClient();

  const { data: before } = await supabase
    .from("menu_items")
    .select("id, name, base_price, active, tenant_id, branch_id")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Ürün bulunamadı." };

  const { error } = await supabase.from("menu_items").update(fields).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("event_log").insert({
    tenant_id: before.tenant_id,
    branch_id: before.branch_id,
    actor_type: "staff",
    actor_id: staff.profileId,
    action: "menu_item.updated",
    subject_type: "menu_item",
    subject_id: id,
    payload: { before, after: fields },
  });

  revalidatePath("/staff/admin");
  revalidatePath("/t/[tableToken]", "page");
  return { ok: true };
}

// ---------- CREATE ITEM -------------------------------------------------

const CreateMenuItemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  base_price: z.number().min(0).max(100000),
  preparation_minutes: z.number().int().min(1).max(120).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
  vat_rate: z.number().min(0).max(50).optional(),
});

export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;

export async function createMenuItem(
  input: CreateMenuItemInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false, error: "Yetkisiz." };
  if (!staff.branchId) return { ok: false, error: "Şube bilgisi yok." };

  const parsed = CreateMenuItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz veri.",
    };
  }

  const supabase = createSupabaseServiceClient();

  // Kategori gerçekten bu şubeye ait mi?
  const { data: cat } = await supabase
    .from("menu_categories")
    .select("id, branch_id, display_order")
    .eq("id", parsed.data.category_id)
    .eq("branch_id", staff.branchId)
    .maybeSingle();
  if (!cat) return { ok: false, error: "Kategori bulunamadı." };

  // Sıradaki display_order
  const { data: last } = await supabase
    .from("menu_items")
    .select("display_order")
    .eq("category_id", parsed.data.category_id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((last?.display_order as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_price: parsed.data.base_price,
      vat_rate: parsed.data.vat_rate ?? 10,
      preparation_minutes: parsed.data.preparation_minutes ?? null,
      tags: parsed.data.tags ?? [],
      display_order: nextOrder,
      active: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("event_log").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    actor_type: "staff",
    actor_id: staff.profileId,
    action: "menu_item.created",
    subject_type: "menu_item",
    subject_id: data!.id as string,
    payload: { name: parsed.data.name, base_price: parsed.data.base_price },
  });

  revalidatePath("/staff/admin");
  revalidatePath("/t/[tableToken]", "page");
  return { ok: true, id: data!.id as string };
}

// ---------- DELETE ITEM -------------------------------------------------
// Sipariş geçmişi varsa FK kısıtı verir; o zaman pasife alınmasını öner.

export async function deleteMenuItem(input: {
  id: string;
}): Promise<MenuActionResult> {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false, error: "Yetkisiz." };

  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz veri." };

  const supabase = createSupabaseServiceClient();

  const { data: item } = await supabase
    .from("menu_items")
    .select("id, name, tenant_id, branch_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!item) return { ok: false, error: "Ürün bulunamadı." };

  // Referans sayısı
  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_item_id", parsed.data.id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Bu ürün geçmiş siparişlerde kullanılmış, silinemez. &ldquo;Aktif&rdquo; seçeneğini kapatarak gizleyebilirsiniz.",
    };
  }

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("event_log").insert({
    tenant_id: item.tenant_id,
    branch_id: item.branch_id,
    actor_type: "staff",
    actor_id: staff.profileId,
    action: "menu_item.deleted",
    subject_type: "menu_item",
    subject_id: parsed.data.id,
    payload: { name: item.name },
  });

  revalidatePath("/staff/admin");
  revalidatePath("/t/[tableToken]", "page");
  return { ok: true };
}

// ---------- CREATE CATEGORY ---------------------------------------------

const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable().optional(),
});

export async function createMenuCategory(
  input: z.infer<typeof CreateCategorySchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const staff = await requireOwnerOrAdmin();
  if (!staff) return { ok: false, error: "Yetkisiz." };
  if (!staff.branchId) return { ok: false, error: "Şube bilgisi yok." };

  const parsed = CreateCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz veri." };

  const supabase = createSupabaseServiceClient();

  const { data: last } = await supabase
    .from("menu_categories")
    .select("display_order")
    .eq("branch_id", staff.branchId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((last?.display_order as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      display_order: nextOrder,
      active: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("event_log").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    actor_type: "staff",
    actor_id: staff.profileId,
    action: "menu_category.created",
    subject_type: "menu_category",
    subject_id: data!.id as string,
    payload: { name: parsed.data.name },
  });

  revalidatePath("/staff/admin");
  revalidatePath("/t/[tableToken]", "page");
  return { ok: true, id: data!.id as string };
}
