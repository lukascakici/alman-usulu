import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type AdminMenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  vat_rate: number;
  active: boolean;
  display_order: number;
};

export type AdminMenuCategory = {
  id: string;
  name: string;
  active: boolean;
  display_order: number;
  items: AdminMenuItem[];
};

export async function getFullMenuForBranch(
  branchId: string,
): Promise<AdminMenuCategory[]> {
  const supabase = createSupabaseServiceClient();

  const { data: cats } = await supabase
    .from("menu_categories")
    .select("id, name, active, display_order")
    .eq("branch_id", branchId)
    .order("display_order", { ascending: true });
  if (!cats) return [];

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, category_id, name, description, base_price, vat_rate, active, display_order")
    .eq("branch_id", branchId)
    .order("display_order", { ascending: true });

  const byCat = new Map<string, AdminMenuItem[]>();
  for (const it of (items ?? []) as Array<AdminMenuItem & { category_id: string }>) {
    const list = byCat.get(it.category_id) ?? [];
    list.push(it);
    byCat.set(it.category_id, list);
  }

  return (cats as Array<Omit<AdminMenuCategory, "items">>).map((c) => ({
    ...c,
    items: byCat.get(c.id) ?? [],
  }));
}
