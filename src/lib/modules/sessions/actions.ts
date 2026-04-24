"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { CLIENT_SESSION_COOKIE, COOKIE_MAX_AGE_SECONDS } from "./core";

const DisplayNameSchema = z
  .string()
  .trim()
  .min(1, "En az 1 karakter")
  .max(24, "En fazla 24 karakter");

export type SetDisplayNameResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setClientDisplayName(
  rawName: string,
): Promise<SetDisplayNameResult> {
  const parsed = DisplayNameSchema.safeParse(rawName);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const cookieStore = await cookies();
  const clientSessionId = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!clientSessionId) return { ok: false, error: "Masa oturumu bulunamadı." };

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("client_sessions")
    .update({ display_name: parsed.data })
    .eq("id", clientSessionId);

  if (error) {
    console.error("[setClientDisplayName] error:", error);
    return { ok: false, error: "Kayıt hatası." };
  }

  revalidatePath("/t/[tableToken]", "page");
  return { ok: true };
}

// "Ben daha önce bu isimle girmiştim" — başka bir client_session'ı sahiplen.
// Yalnızca aynı table_session içindeki, nickname'i olan oturumlara izin verilir.
// Mevcut boş oturum (cookie'de olan) silinir, cookie yeni id'ye çevrilir.
const ReclaimSchema = z.object({
  reclaimClientSessionId: z.string().uuid(),
});

export async function reclaimClientSession(input: {
  reclaimClientSessionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ReclaimSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz veri." };

  const cookieStore = await cookies();
  const currentClientId = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!currentClientId) return { ok: false, error: "Oturum bulunamadı." };

  const supabase = createSupabaseServiceClient();

  // Mevcut oturumun table_session'ını öğren
  const { data: current, error: curErr } = await supabase
    .from("client_sessions")
    .select("id, table_session_id, display_name")
    .eq("id", currentClientId)
    .maybeSingle();
  if (curErr || !current) return { ok: false, error: "Oturum bulunamadı." };

  // Sahiplenilecek oturumu doğrula
  const { data: target, error: tgtErr } = await supabase
    .from("client_sessions")
    .select("id, table_session_id, display_name")
    .eq("id", parsed.data.reclaimClientSessionId)
    .maybeSingle();
  if (tgtErr || !target) return { ok: false, error: "Hedef oturum bulunamadı." };

  if (target.table_session_id !== current.table_session_id) {
    return { ok: false, error: "Bu masaya ait bir oturum değil." };
  }
  if (!target.display_name) {
    return { ok: false, error: "Bu oturumun ismi yok." };
  }

  // Mevcut (boş) oturumu sil — orders/items'la ilişkisi yok olmalı
  //   (yeni açılmıştı, henüz sipariş vermedi)
  const { error: delErr } = await supabase
    .from("client_sessions")
    .delete()
    .eq("id", currentClientId)
    .is("display_name", null);

  if (delErr) {
    console.warn("[reclaimClientSession] eski oturum silinemedi:", delErr);
    // Kritik değil, devam ederiz — sadece "orphan" bir boş oturum kalır.
  }

  // Cookie'yi hedefe çevir
  cookieStore.set(CLIENT_SESSION_COOKIE, target.id as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  // Audit
  await supabase.from("event_log").insert({
    actor_type: "client",
    actor_id: target.id,
    action: "client_session.reclaimed",
    subject_type: "client_session",
    subject_id: target.id,
    payload: { from: currentClientId },
  });

  revalidatePath("/t/[tableToken]", "page");
  return { ok: true };
}

const CancelSchema = z.object({
  orderItemId: z.string().uuid(),
});

export async function cancelOwnOrderItem(input: {
  orderItemId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = CancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz veri." };

  const cookieStore = await cookies();
  const clientSessionId = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!clientSessionId) return { ok: false, error: "Oturum bulunamadı." };

  const supabase = createSupabaseServiceClient();

  // Yalnızca kendi kalemini, henüz 'pending' durumundayken iptal edebilir
  const { data: row, error: selErr } = await supabase
    .from("order_items")
    .select("id, status, created_by_client, tenant_id, branch_id")
    .eq("id", parsed.data.orderItemId)
    .maybeSingle();
  if (selErr || !row) return { ok: false, error: "Kalem bulunamadı." };
  if (row.created_by_client !== clientSessionId) {
    return { ok: false, error: "Bu kalem size ait değil." };
  }
  if (row.status !== "pending") {
    return { ok: false, error: "Bu kalem artık iptal edilemez." };
  }

  const { error } = await supabase
    .from("order_items")
    .update({ status: "cancelled", cancelled_reason: "customer cancelled" })
    .eq("id", parsed.data.orderItemId);

  if (error) return { ok: false, error: error.message };

  await supabase.from("event_log").insert({
    tenant_id: row.tenant_id,
    branch_id: row.branch_id,
    actor_type: "client",
    actor_id: clientSessionId,
    action: "order_item.cancelled_by_customer",
    subject_type: "order_item",
    subject_id: row.id,
  });

  return { ok: true };
}
