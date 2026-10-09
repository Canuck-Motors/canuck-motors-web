import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";

export const instant = false;

export const metadata: Metadata = {
  title: "Product Images Admin",
  robots: { index: false, follow: false },
};

export default async function ImagesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) redirect("/");

  const term = q.replace(/[%,()]/g, " ").trim().slice(0, 60);

  let query = supabase
    .from("products")
    .select("id, product_name, sku, product_images(id)")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("sku")
    .limit(100);
  if (term) query = query.or(`product_name.ilike.%${term}%,sku.ilike.%${term}%`);

  const { data: products } = await query;

  return (
    <main className="cm-container space-y-6 py-10">
      <AdminNav />
      <h1 className="text-3xl font-black tracking-tight text-ink">Product images</h1>

      <form className="flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search part number or name"
          className="flex-1 rounded-full border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button className="cm-button-primary">Search</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Part number</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Photos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium text-ink">{p.sku}</td>
                <td className="px-4 py-2.5">{p.product_name}</td>
                <td className="px-4 py-2.5">
                  {p.product_images?.length ? (
                    p.product_images.length
                  ) : (
                    <span className="font-semibold text-brand">None</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/admin/images/${p.id}`} className="font-bold text-brand hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
