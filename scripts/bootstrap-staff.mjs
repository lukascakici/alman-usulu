#!/usr/bin/env node
/**
 * İlk owner / staff kullanıcıyı Supabase Auth + staff_profiles'a yazar.
 *
 * Kullanım:
 *   node scripts/bootstrap-staff.mjs <email> <password> "<full name>" <role>
 *
 * role: owner | admin | cashier | kitchen | waiter (varsayılan: owner)
 *
 * Örnek:
 *   node scripts/bootstrap-staff.mjs sahip@kafe.com Parola123 "Kafe Sahibi" owner
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim().replace(/^["']|["']$/g, "")];
    }),
);

const [, , email, password, fullNameArg, roleArg] = process.argv;
if (!email || !password) {
  console.error("Kullanım: node scripts/bootstrap-staff.mjs <email> <password> [fullName] [role]");
  process.exit(1);
}
const fullName = fullNameArg ?? email.split("@")[0];
const role = roleArg ?? "owner";
const validRoles = ["owner", "admin", "cashier", "kitchen", "waiter"];
if (!validRoles.includes(role)) {
  console.error(`Geçersiz rol: ${role}. Geçerliler: ${validRoles.join(", ")}`);
  process.exit(1);
}

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const BRANCH_ID = "00000000-0000-0000-0000-000000000011";

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// 1) Auth user: var mı kontrol et, yoksa oluştur
let userId;
{
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("listUsers error:", listErr);
    process.exit(1);
  }
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    console.log(`✓ Auth user zaten var: ${existing.id} (şifre değiştirilmedi)`);
    userId = existing.id;
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      console.error("createUser error:", createErr);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`✓ Auth user oluşturuldu: ${userId}`);
  }
}

// 2) staff_profiles
{
  const { data: profile, error: profileErr } = await supabase
    .from("staff_profiles")
    .select("id, role, active")
    .eq("user_id", userId)
    .eq("tenant_id", TENANT_ID)
    .maybeSingle();

  if (profileErr) {
    console.error("staff_profiles select error:", profileErr);
    process.exit(1);
  }

  if (profile) {
    const { error: updErr } = await supabase
      .from("staff_profiles")
      .update({ role, active: true, full_name: fullName, branch_id: BRANCH_ID })
      .eq("id", profile.id);
    if (updErr) {
      console.error("update error:", updErr);
      process.exit(1);
    }
    console.log(`✓ staff_profile güncellendi: rol=${role}`);
  } else {
    const { error: insErr } = await supabase.from("staff_profiles").insert({
      user_id: userId,
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      full_name: fullName,
      role,
      active: true,
    });
    if (insErr) {
      console.error("insert error:", insErr);
      process.exit(1);
    }
    console.log(`✓ staff_profile oluşturuldu: rol=${role}`);
  }
}

console.log(`\nHazır. http://localhost:3000/staff/login adresinden ${email} / (girdiğin şifre) ile giriş yapabilirsin.`);
