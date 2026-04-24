"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SignupSchema = z.object({
  cafeName: z.string().trim().min(2, "Kafe ismi en az 2 karakter").max(60),
  branchName: z.string().trim().max(60).optional().or(z.literal("")),
  ownerName: z.string().trim().min(2, "İsim en az 2 karakter").max(60),
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter"),
});

export type SignupResult = { error: string } | void;

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "kafe"}-${suffix}`;
}

export async function signUpCafe(formData: FormData): Promise<SignupResult> {
  const parsed = SignupSchema.safeParse({
    cafeName: formData.get("cafeName"),
    branchName: formData.get("branchName") ?? undefined,
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  }

  // Service role admin client (RLS bypass)
  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  // 1) Auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.ownerName },
  });
  if (authErr || !authData?.user) {
    const msg = authErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("exist")) {
      return { error: "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin." };
    }
    return { error: authErr?.message ?? "Kullanıcı oluşturulamadı." };
  }
  const userId = authData.user.id;

  // 2) Tenant
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({ name: parsed.data.cafeName, slug: slugify(parsed.data.cafeName) })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "Kafe kaydı oluşturulamadı." };
  }

  // 3) Branch
  const branchName = parsed.data.branchName?.trim() || "Merkez";
  const { data: branch, error: branchErr } = await admin
    .from("branches")
    .insert({
      tenant_id: tenant.id,
      name: branchName,
      slug: slugify(branchName),
    })
    .select("id")
    .single();

  if (branchErr || !branch) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.auth.admin.deleteUser(userId);
    return { error: "Şube oluşturulamadı." };
  }

  // 4) Default area — ileride kullanıcı daha ekler, masalar için çerçeve olsun
  await admin.from("areas").insert({
    tenant_id: tenant.id,
    branch_id: branch.id,
    name: "Salon",
    display_order: 1,
  });

  // 5) staff_profile (owner)
  const { error: profileErr } = await admin.from("staff_profiles").insert({
    user_id: userId,
    tenant_id: tenant.id,
    branch_id: branch.id,
    full_name: parsed.data.ownerName,
    role: "owner",
    active: true,
  });

  if (profileErr) {
    await admin.from("branches").delete().eq("id", branch.id);
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.auth.admin.deleteUser(userId);
    return { error: "Profil oluşturulamadı." };
  }

  // 6) Otomatik giriş (cookie-aware client ile)
  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInErr) {
    // Kayıt tamam ama oturum açılamadı — kullanıcıyı login'e yolla
    redirect("/staff/login");
  }

  // Yeni kafenin admin alanına at — masalar boş, rehber ekranı orada
  redirect("/staff/admin/masalar");
}
