import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InventoryManager, { type InventoryRow } from "@/components/admin/InventoryManager";
import { AdminNav } from "@/components/AdminNav";

export const instant = false;

export const metadata: Metadata = {
  title: "Inventory Admin",
  robots: { index: false, follow: false },
};

export default async function InventoryAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const { data: cats } = await supabase
    .from("product_categories")
    .select("id, category_name")
    .eq("is_delete", false)
    .order("category_name");

  const rows: InventoryRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, product_name, sku, description, price, is_active, product_category_id, product_images(id, path, sort_order), inventory(quantity, reserved_quantity, low_stock_threshold)"
      )
      .eq("is_delete", false)
      .order("product_name")
      .range(from, from + 999);

    if (error) {
      throw new Error("Unable to load inventory.");
    }

    for (const p of data ?? []) {
      const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
      const imgs = (Array.isArray(p.product_images) ? p.product_images : []) as {
        path: string;
        sort_order: number;
      }[];
      const main = [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0];
      rows.push({
        categoryId: p.product_category_id ?? null,
        thumb: main?.path ?? null,
        id: p.id,
        name: p.product_name ?? "",
        sku: p.sku ?? "",
        description: p.description ?? "",
        price: Number(p.price ?? 0),
        isActive: Boolean(p.is_active),
        imageCount: imgs.length,
        quantity: inv?.quantity ?? 0,
        reserved: inv?.reserved_quantity ?? 0,
        lowStock: inv?.low_stock_threshold ?? 5,
      });
    }
    if (!data || data.length < 1000) break;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-ink">Inventory</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Signed in as {role}
          </p>
        </div>

        <InventoryManager
          initial={rows}
          categories={(cats ?? []).map((c) => ({ id: c.id, name: c.category_name }))}
          initialFilter={
            ["visible", "hidden", "noimage", "low", "out"].includes(String(filter)) ? (filter as "visible") : "all"
          }
        />
      </div>
    </main>
  );
}
