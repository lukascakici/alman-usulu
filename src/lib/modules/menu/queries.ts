import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  vat_rate: number;
  allergens: string[];
  tags: string[];
  preparation_minutes: number | null;
  display_order: number;
};

export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  items: MenuItem[];
};

export async function getMenuByBranch(branchId: string): Promise<MenuCategory[]> {
  const supabase = createSupabaseServiceClient();

  const { data: categories, error: catErr } = await supabase
    .from("menu_categories")
    .select("id, name, description, display_order")
    .eq("branch_id", branchId)
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (catErr || !categories) return [];

  const { data: items, error: itemErr } = await supabase
    .from("menu_items")
    .select(
      "id, category_id, name, description, image_url, base_price, vat_rate, allergens, tags, preparation_minutes, display_order",
    )
    .eq("branch_id", branchId)
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (itemErr || !items) return categories.map((c) => ({ ...(c as MenuCategory), items: [] }));

  const byCategory = new Map<string, MenuItem[]>();
  for (const row of items as Array<MenuItem & { category_id: string }>) {
    const { category_id, ...rest } = row;
    const list = byCategory.get(category_id) ?? [];
    list.push(rest);
    byCategory.set(category_id, list);
  }

  return (categories as Array<Omit<MenuCategory, "items">>).map((cat) => ({
    ...cat,
    items: byCategory.get(cat.id) ?? [],
  }));
}
