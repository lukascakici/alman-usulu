"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentStaff } from "@/lib/modules/staff/current";

const ALLOWED_ROLES = new Set(["owner", "admin"]);

const UpdateMenuItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "İsim boş olamaz").max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  base_price: z.number().min(0).max(100000).optional(),
  active: z.boolean().optional(),
});

export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;

export type MenuActionResult = { ok: true } | { ok: false; error: string };

export async function updateMenuItem(
  input: UpdateMenuItemInput,
): Promise<MenuActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Yetkisiz." };
  if (!ALLOWED_ROLES.has(staff.role)) {
    return { ok: false, error: "Bu eylem için yetkiniz yok." };
  }

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

  // Eski değerleri audit için oku
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
