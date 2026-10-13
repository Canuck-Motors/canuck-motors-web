import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import ImagesManager, { type ImageProductRow } from "@/components/admin/ImagesManager";

export const instant = false;

export const metadata: Metadata = {
  title: "Product Images Admin",
  robots: { index: false, follow: false },
};

export default async function ImagesAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) redirect("/");

  const rows: ImageProductRow[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("id, product_name, sku, is_active, product_images(path, sort_order)")
      .eq("is_delete", false)
      .order("sku")
      .range(from, from + 999);
    if (error) throw new Error("Unable to load products.");

    for (const p of data ?? []) {
      const imgs = (Array.isArray(p.product_images) ? p.product_images : []) as {
        path: string;
        sort_order: number;
      }[];
      const main = [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0];
      rows.push({
        id: p.id,
        name: p.product_name ?? "",
        sku: p.sku ?? "",
        isActive: Boolean(p.is_active),
        imageCount: imgs.length,
        thumb: main?.path ?? null,
      });
    }
    if (!data || data.length < 1000) break;
  }

  return (
    <main className="cm-container space-y-6 py-10">
      <AdminNav />
      <h1 className="text-3xl font-black tracking-tight text-ink">Product images</h1>
      <ImagesManager initial={rows} />
    </main>
  );
}
