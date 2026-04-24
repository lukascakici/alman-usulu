import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type OrderItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type OrderItemRow = {
  id: string;
  menu_item_id: string;
  name_snapshot: string;
  qty: number;
  unit_price_snapshot: number;
  modifiers_total: number;
  line_total: number;
  status: OrderItemStatus;
  created_by_client: string | null;
  created_at: string;
};

const ITEM_SELECT =
  "id, menu_item_id, name_snapshot, qty, unit_price_snapshot, modifiers_total, line_total, status, created_by_client, created_at";

export async function getOrderItemsBySession(
  tableSessionId: string,
): Promise<OrderItemRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("order_items")
    .select(ITEM_SELECT)
    .eq("table_session_id", tableSessionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as OrderItemRow[];
}
