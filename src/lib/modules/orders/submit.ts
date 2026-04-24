"use server";

import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { CLIENT_SESSION_COOKIE } from "@/lib/modules/sessions/core";
import { SubmitOrderInputSchema, type SubmitOrderInput } from "@/lib/schemas/orders";

export type SubmitOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  const parsed = SubmitOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Geçersiz sipariş verisi." };
  }

  const cookieStore = await cookies();
  const clientSessionId = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!clientSessionId) {
    return { ok: false, error: "Masa oturumu bulunamadı. Sayfayı yenileyin." };
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc("order_submit", {
    p_table_session_id: parsed.data.tableSessionId,
    p_client_session_id: clientSessionId,
    p_items: parsed.data.items,
  });

  if (error) {
    console.error("[submitOrder] rpc error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, orderId: data as unknown as string };
}
