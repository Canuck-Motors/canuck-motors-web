import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { saveProductEdit, setLowStockLevel } from "@/app/admin/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Edit Product",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) redirect("/");

  const { data: p } = await supabase
    .from("products")
    .select("id, product_name, sku, slug, description, price, is_active, product_images(id), inventory(quantity, reserved_quantity, low_stock_threshold)")
    .eq("id", productId)
    .maybeSingle();
  if (!p) notFound();

  const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
  const images = Array.isArray(p.product_images) ? p.product_images.length : 0;


  const { data: history } = await supabase.rpc("admin_stock_history", { p_product_id: productId });
  const log = (history ?? []) as {
    old_quantity: number | null;
    new_quantity: number;
    reason: string | null;
    changed_on: string;
    staff_email: string | null;
  }[];

  const field = "mt-1 w-full rounded-lg border border-black/10 px-3 py-2.5 font-normal";

  return (
    <main className="cm-container space-y-6 py-10">
      <AdminNav />
      <Link href="/admin/inventory" className="text-sm font-semibold text-brand hover:underline">
        Back to inventory
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Edit product</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Part number: {p.sku} · {images} image{images === 1 ? "" : "s"} · {inv?.quantity ?? 0} in stock
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/images/${p.id}`}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
          >
            Manage images
          </Link>
          <Link
            href={`/product/${p.slug ?? p.id}`}
            target="_blank"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
          >
            View on website
          </Link>
        </div>
      </div>

      <form
        action={saveProductEdit.bind(null, p.id)}
        className="max-w-3xl space-y-5 rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)]"
      >
        <label className="block text-sm font-semibold text-ink">
          Name
          <input name="name" required defaultValue={p.product_name ?? ""} className={field} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Price (CAD)
          <input
            name="price"
            type="number"
            step="0.01"
            min={0}
            required
            defaultValue={Number(p.price ?? 0)}
            className={`${field} max-w-48`}
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Description
          <textarea name="description" rows={10} defaultValue={p.description ?? ""} className={field} />
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold text-ink">
          <input type="checkbox" name="hidden" defaultChecked={!p.is_active} className="h-5 w-5 accent-[var(--brand,#d62828)]" />
          Hide this product on the website
        </label>
        <div className="flex gap-3">
          <button className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
            Save changes
          </button>
          <Link href="/admin/inventory" className="rounded-full border px-6 py-2.5 text-sm font-semibold">
            Cancel
          </Link>
        </div>
      </form>

      <section className="max-w-3xl rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)]">
        <h2 className="text-lg font-black text-ink">Stock</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {inv?.quantity ?? 0} on hand, {inv?.reserved_quantity ?? 0} reserved. Change the stock from the inventory list.
        </p>
        <form
          action={async (fd) => {
            "use server";
            await setLowStockLevel(p.id, Number(fd.get("threshold")));
          }}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="text-sm font-semibold text-ink">
            Low-stock level
            <input
              name="threshold"
              type="number"
              min={0}
              required
              defaultValue={inv?.low_stock_threshold ?? 5}
              className="mt-1 block w-32 rounded-lg border border-black/10 px-3 py-2 font-normal"
            />
          </label>
          <button className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-white hover:bg-brand">
            Save level
          </button>
          <span className="text-xs text-muted-foreground">Flagged as low when available stock is at or below this.</span>
        </form>

        <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Stock history
        </h3>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2">When</th>
                <th className="py-2">Change</th>
                <th className="py-2">Reason</th>
                <th className="py-2">By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {log.map((h, i) => (
                <tr key={i}>
                  <td className="py-2">{new Date(h.changed_on).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="py-2 font-semibold">
                    {h.old_quantity ?? "?"} → {h.new_quantity}
                  </td>
                  <td className="py-2 text-muted-foreground">{h.reason}</td>
                  <td className="py-2 text-muted-foreground">{h.staff_email ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
