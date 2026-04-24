"use server";

import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentStaff } from "@/lib/modules/staff/current";

const ALLOWED_ROLES = ["owner", "admin", "cashier", "kitchen"] as const;

const StatusTransition = z.object({
  itemId: z.string().uuid(),
  to: z.enum(["preparing", "ready", "served", "cancelled"]),
});

export type StatusTransitionInput = z.infer<typeof StatusTransition>;

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateOrderItemStatus(
  input: StatusTransitionInput,
): Promise<ActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Yetkisiz." };
  if (!ALLOWED_ROLES.includes(staff.role as (typeof ALLOWED_ROLES)[number])) {
    return { ok: false, error: "Bu eylem için yetkiniz yok." };
  }

  const parsed = StatusTransition.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz veri." };

  const supabase = createSupabaseServiceClient();

  const patch: Record<string, unknown> = { status: parsed.data.to };
  if (parsed.data.to === "cancelled") {
    patch.cancelled_reason = "staff cancelled";
  }

  const { error } = await supabase
    .from("order_items")
    .update(patch)
    .eq("id", parsed.data.itemId);

  if (error) return { ok: false, error: error.message };

  // Audit
  await supabase.from("event_log").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    actor_type: "staff",
    actor_id: staff.profileId,
    action: `order_item.${parsed.data.to}`,
    subject_type: "order_item",
    subject_id: parsed.data.itemId,
  });

  return { ok: true };
}
