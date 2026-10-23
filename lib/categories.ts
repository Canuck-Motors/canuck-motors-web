import type { SupabaseClient } from "@supabase/supabase-js";
import { sortByTypeOrder } from "@/lib/product-order";

export type PublicCategory = {
  id: number;
  category_name: string;
  slug: string;
  image_path: string | null;
  sort_order: number | null;
};

// Active categories that contain at least one visible product, in the order set in admin
// (falls back to the built-in order until database/admin_categories.sql has been run).
export async function getVisibleCategories(supabase: SupabaseClient): Promise<PublicCategory[]> {
  let res: { data: unknown[] | null; error: unknown } = await supabase
    .from("product_categories")
    .select("id, category_name, slug, image_path, sort_order")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("category_name");

  if (res.error) {
    res = await supabase
      .from("product_categories")
      .select("id, category_name, slug")
      .eq("is_active", true)
      .eq("is_delete", false)
      .order("category_name");
  }
  if (res.error) throw new Error("Unable to load categories.");

  let rows: PublicCategory[] = ((res.data ?? []) as Partial<PublicCategory>[]).map((c) => ({
    id: c.id as number,
    category_name: c.category_name as string,
    slug: c.slug as string,
    image_path: c.image_path ?? null,
    sort_order: c.sort_order ?? null,
  }));

  const used = await supabase.rpc("categories_with_products");
  if (!used.error) {
    const ids = new Set(((used.data ?? []) as { category_id: number }[]).map((r) => Number(r.category_id)));
    rows = rows.filter((c) => ids.has(Number(c.id)));
  }

  if (rows.some((c) => c.sort_order !== null)) {
    return rows.sort(
      (a, b) =>
        (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
        a.category_name.localeCompare(b.category_name)
    );
  }
  return sortByTypeOrder(rows, (c) => c.category_name);
}
