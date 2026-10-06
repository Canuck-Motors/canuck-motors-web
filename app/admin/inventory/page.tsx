import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setInventoryQuantity } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Inventory Admin",
  robots: { index: false, follow: false },
};

export default async function InventoryAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, product_name, sku, price, inventory(quantity, reserved_quantity, low_stock_threshold, is_active)")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("product_name")
    .limit(200);

  if (error) {
    throw new Error("Unable to load inventory.");
  }

  return (
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-bold text-ink">Inventory</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Signed in as {role}
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-5 py-4 font-semibold text-ink">Part</th>
                  <th className="px-5 py-4 font-semibold text-ink">SKU</th>
                  <th className="px-5 py-4 font-semibold text-ink">On hand</th>
                  <th className="px-5 py-4 font-semibold text-ink">Reserved</th>
                  <th className="px-5 py-4 font-semibold text-ink">Available</th>
                  <th className="px-5 py-4 font-semibold text-ink">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(products ?? []).map((product) => {
                  const inventory = Array.isArray(product.inventory)
                    ? product.inventory[0]
                    : product.inventory;
                  const quantity = inventory?.quantity ?? 0;
                  const reserved = inventory?.reserved_quantity ?? 0;
                  const available = quantity - reserved;

                  return (
                    <tr key={product.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink">{product.product_name}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{product.sku}</td>
                      <td className="px-5 py-4 font-medium text-ink">{quantity}</td>
                      <td className="px-5 py-4 text-muted-foreground">{reserved}</td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            available <= (inventory?.low_stock_threshold ?? 5)
                              ? "font-semibold text-amber-700"
                              : "font-semibold text-ink"
                          }
                        >
                          {available}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <form
                          action={async (formData) => {
                            "use server";
                            const nextQuantity = Number(formData.get("quantity"));
                            const reason =
                              String(formData.get("reason") || "Admin inventory adjustment");
                            await setInventoryQuantity(product.id, nextQuantity, reason);
                          }}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            name="quantity"
                            type="number"
                            min={0}
                            defaultValue={quantity}
                            className="w-24 rounded-lg border px-3 py-2"
                            aria-label={`Inventory quantity for ${product.product_name}`}
                          />
                          <input
                            name="reason"
                            type="text"
                            defaultValue="Admin inventory adjustment"
                            className="min-w-56 rounded-lg border px-3 py-2"
                            aria-label={`Reason for adjusting ${product.product_name}`}
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-ink px-4 py-2 font-semibold text-white transition hover:bg-brand"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
