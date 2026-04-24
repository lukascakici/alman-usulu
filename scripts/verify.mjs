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

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: tokens, error: tokenErr } = await s
  .from("table_qr_tokens")
  .select("token, table_id, active")
  .limit(3);
console.log("table_qr_tokens sample:", tokens, "error:", tokenErr);

const { data: tables, error: tableErr } = await s
  .from("tables")
  .select("id, label, active")
  .limit(3);
console.log("tables sample:", tables, "error:", tableErr);

const { data: menu, error: menuErr } = await s
  .from("menu_items")
  .select("name, base_price")
  .limit(3);
console.log("menu_items sample:", menu, "error:", menuErr);
