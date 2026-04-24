import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { OrderItemStatus } from "@/lib/modules/orders/queries";

export type KitchenItem = {
  id: string;
  name_snapshot: string;
  qty: number;
  notes: string | null;
  status: OrderItemStatus;
  created_at: string;
  created_by_client: string | null;
  table_session_id: string;
  table_label: string;
};

export type KitchenTable = {
  tableSessionId: string;
  tableLabel: string;
  items: KitchenItem[];
};

const ACTIVE_STATUSES: OrderItemStatus[] = ["pending", "preparing", "ready"];

export async function getActiveKitchenItems(
  branchId: string,
): Promise<KitchenItem[]> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id, name_snapshot, qty, notes, status, created_at, created_by_client, table_session_id, table_sessions(tables(label))",
    )
    .eq("branch_id", branchId)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  type EmbedRow = {
    id: string;
    name_snapshot: string;
    qty: number;
    notes: string | null;
    status: OrderItemStatus;
    created_at: string;
    created_by_client: string | null;
    table_session_id: string;
    table_sessions: { tables: { label: string } | null } | null;
  };

  return (data as unknown as EmbedRow[]).map((r) => ({
    id: r.id,
    name_snapshot: r.name_snapshot,
    qty: r.qty,
    notes: r.notes,
    status: r.status,
    created_at: r.created_at,
    created_by_client: r.created_by_client,
    table_session_id: r.table_session_id,
    table_label: r.table_sessions?.tables?.label ?? "?",
  }));
}

export async function getClientNamesForSessions(
  tableSessionIds: string[],
): Promise<Record<string, string | null>> {
  if (tableSessionIds.length === 0) return {};
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_sessions")
    .select("id, display_name")
    .in("table_session_id", tableSessionIds);
  if (error || !data) return {};
  const map: Record<string, string | null> = {};
  for (const row of data as Array<{ id: string; display_name: string | null }>) {
    map[row.id] = row.display_name;
  }
  return map;
}

export function groupByTable(items: KitchenItem[]): KitchenTable[] {
  const map = new Map<string, KitchenTable>();
  for (const it of items) {
    const entry = map.get(it.table_session_id);
    if (entry) {
      entry.items.push(it);
    } else {
      map.set(it.table_session_id, {
        tableSessionId: it.table_session_id,
        tableLabel: it.table_label,
        items: [it],
      });
    }
  }
  // En eski kalemi en başta olan masa önce gelsin
  return [...map.values()].sort((a, b) =>
    (a.items[0]?.created_at ?? "").localeCompare(b.items[0]?.created_at ?? ""),
  );
}
