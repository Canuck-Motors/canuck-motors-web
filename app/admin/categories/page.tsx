import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { sortByTypeOrder } from "@/lib/product-order";
import CategoriesManager, { type CategoryRow } from "@/components/admin/CategoriesManager";

export const instant = false;

export const metadata: Metadata = {
  title: "Categories Admin",
  robots: { index: false, follow: false },
};

export default async function CategoriesAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) redirect("/");

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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10">
          <p className="cm-eyebrow">Catalog</p>
          <h1 className="cm-section-title mt-3">Categories</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Add categories, rename them, change the order and turn them on or off. A category shows on the
            website only when it is on and has at least one visible product.
          </p>
        </div>

        <CategoriesManager initial={rows} needsSql={needsSql} />
      </div>
    </main>
  );
}
