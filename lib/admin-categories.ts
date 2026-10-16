import type { SupabaseClient } from "@supabase/supabase-js";
import { sortByTypeOrder } from "@/lib/product-order";
import type { CategoryRow } from "@/components/admin/CategoriesManager";

/** Categories with product counts, for the admin category manager. */
export async function loadAdminCategories(supabase: SupabaseClient): Promise<{ rows: CategoryRow[]; needsSql: boolean }> {
  let needsSql = false;
  let res: { data: unknown[] | null; error: unknown } = await supabase
    .from("product_categories")
    .select("id, category_name, slug, is_active, sort_order, image_path")
    .eq("is_delete", false)
    .order("category_name");
  if (res.error) {
    needsSql = true;
    res = await supabase
      .from("product_categories")
      .select("id, category_name, slug, is_active")
      .eq("is_delete", false)
      .order("category_name");
  }
  if (res.error) throw new Error("Unable to load categories.");

  // product counts per category
  const visible = new Map<number, number>();
  const total = new Map<number, number>();
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase
      .from("products")
      .select("product_category_id, is_active")
      .eq("is_delete", false)
      .not("product_category_id", "is", null)
      .range(from, from + 999);
    for (const p of data ?? []) {
      const id = Number(p.product_category_id);
      total.set(id, (total.get(id) ?? 0) + 1);
      if (p.is_active) visible.set(id, (visible.get(id) ?? 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }

  let rows: CategoryRow[] = (res.data as Record<string, unknown>[]).map((c) => ({
    id: Number(c.id),
    name: String(c.category_name ?? ""),
    slug: String(c.slug ?? ""),
    isActive: Boolean(c.is_active),
    sortOrder: (c.sort_order as number | null) ?? null,
    imagePath: (c.image_path as string | null) ?? null,
    visibleProducts: visible.get(Number(c.id)) ?? 0,
    totalProducts: total.get(Number(c.id)) ?? 0,
  }));

  rows = rows.some((r) => r.sortOrder !== null)
    ? rows.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.name.localeCompare(b.name))
    : sortByTypeOrder(rows, (r) => r.name);

  return { rows, needsSql };
}
