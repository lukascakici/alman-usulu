import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type AdminArea = {
  id: string;
  name: string;
  display_order: number;
};

export type AdminTable = {
  id: string;
  label: string;
  seats: number | null;
  active: boolean;
  area_id: string | null;
  area_name: string | null;
  active_token: string | null;
};

export async function getAreas(branchId: string): Promise<AdminArea[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("areas")
    .select("id, name, display_order")
    .eq("branch_id", branchId)
    .order("display_order", { ascending: true });
  return (data ?? []) as AdminArea[];
}

export async function getTablesWithTokens(
  branchId: string,
): Promise<AdminTable[]> {
  const supabase = createSupabaseServiceClient();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label, seats, active, area_id, areas(name)")
    .eq("branch_id", branchId)
    .order("label", { ascending: true });
  if (!tables) return [];

  const tableIds = (tables as Array<{ id: string }>).map((t) => t.id);
  const { data: tokens } = await supabase
    .from("table_qr_tokens")
    .select("table_id, token, active")
    .in("table_id", tableIds.length ? tableIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("active", true);

  const byTable = new Map<string, string>();
  for (const row of (tokens ?? []) as Array<{ table_id: string; token: string }>) {
    byTable.set(row.table_id, row.token);
  }

  return (tables as unknown as Array<{
    id: string;
    label: string;
    seats: number | null;
    active: boolean;
    area_id: string | null;
    areas: { name: string } | null;
  }>).map((t) => ({
    id: t.id,
    label: t.label,
    seats: t.seats,
    active: t.active,
    area_id: t.area_id,
    area_name: t.areas?.name ?? null,
    active_token: byTable.get(t.id) ?? null,
  }));
}
