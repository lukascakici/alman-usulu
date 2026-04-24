import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ClientNameMap = Record<string, string | null>;

export async function getClientsBySession(
  tableSessionId: string,
): Promise<ClientNameMap> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_sessions")
    .select("id, display_name")
    .eq("table_session_id", tableSessionId);
  if (error || !data) return {};
  const map: ClientNameMap = {};
  for (const row of data as Array<{ id: string; display_name: string | null }>) {
    map[row.id] = row.display_name;
  }
  return map;
}
