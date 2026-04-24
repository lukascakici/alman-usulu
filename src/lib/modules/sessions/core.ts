import type { SupabaseClient } from "@supabase/supabase-js";

export const CLIENT_SESSION_COOKIE = "au_client_session";
export const ATTACH_HEADER = "x-au-attach-session";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 gün

export type AttachedSession = {
  tenantId: string;
  branchId: string;
  tableId: string;
  tableLabel: string;
  tableSessionId: string;
  clientSessionId: string;
  clientDisplayName: string | null;
};

export type AttachResult =
  | { kind: "ok"; session: AttachedSession; newClientSessionId: string | null }
  | { kind: "unknown_token" }
  | { kind: "error"; message: string };

/**
 * Token → table → (open) table_session → client_session akışı.
 * Pure DB logic — cookie yazmaz. Çağıran (middleware) cookie'yi response'a koyar.
 * Edge runtime'da çalışır: `server-only` import etmez.
 */
export async function attachCore(
  supabase: SupabaseClient,
  qrToken: string,
  existingClientSessionId?: string,
): Promise<AttachResult> {
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("table_qr_tokens")
    .select("id, table_id")
    .eq("token", qrToken)
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (tokenErr) return { kind: "error", message: tokenErr.message };
  if (!tokenRow) return { kind: "unknown_token" };

  const { data: table, error: tableErr } = await supabase
    .from("tables")
    .select("id, branch_id, tenant_id, label, active")
    .eq("id", tokenRow.table_id)
    .maybeSingle();

  if (tableErr) return { kind: "error", message: tableErr.message };
  if (!table || !table.active) return { kind: "unknown_token" };

  const { data: existingSession, error: sessErr } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("table_id", table.id)
    .in("state", ["open", "closing"])
    .maybeSingle();

  if (sessErr) return { kind: "error", message: sessErr.message };

  let tableSessionId = existingSession?.id as string | undefined;

  if (!tableSessionId) {
    const { data: created, error: createErr } = await supabase
      .from("table_sessions")
      .insert({
        tenant_id: table.tenant_id,
        branch_id: table.branch_id,
        table_id: table.id,
        state: "open",
      })
      .select("id")
      .single();
    if (createErr || !created) {
      return { kind: "error", message: createErr?.message ?? "cannot open session" };
    }
    tableSessionId = created.id as string;
  }

  let clientSessionId: string | null = null;
  let clientDisplayName: string | null = null;
  let newClientSessionId: string | null = null;

  if (existingClientSessionId) {
    const { data: cs } = await supabase
      .from("client_sessions")
      .select("id, table_session_id, display_name")
      .eq("id", existingClientSessionId)
      .maybeSingle();

    if (cs && cs.table_session_id === tableSessionId) {
      clientSessionId = cs.id as string;
      clientDisplayName = (cs.display_name as string | null) ?? null;
      await supabase
        .from("client_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", clientSessionId);
    }
  }

  if (!clientSessionId) {
    const { data: newClient, error: newClientErr } = await supabase
      .from("client_sessions")
      .insert({ table_session_id: tableSessionId })
      .select("id, display_name")
      .single();
    if (newClientErr || !newClient) {
      return { kind: "error", message: newClientErr?.message ?? "cannot create client" };
    }
    clientSessionId = newClient.id as string;
    clientDisplayName = (newClient.display_name as string | null) ?? null;
    newClientSessionId = clientSessionId;
  }

  return {
    kind: "ok",
    session: {
      tenantId: table.tenant_id,
      branchId: table.branch_id,
      tableId: table.id,
      tableLabel: table.label,
      tableSessionId: tableSessionId!,
      clientSessionId,
      clientDisplayName,
    },
    newClientSessionId,
  };
}
