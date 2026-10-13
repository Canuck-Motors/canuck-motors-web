import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/admin/PrintButton";

export const instant = false;

export const metadata: Metadata = {
  title: "Packing slip",
  robots: { index: false, follow: false },
};

type Addr = Record<string, string | null> | null;

export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) redirect("/");

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_on, customer_name, customer_email, shipping_address, order_items(product_name, sku, quantity, cancelled_on)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const a = (order.shipping_address ?? null) as Addr;
  const items = ((order.order_items ?? []) as { product_name: string; sku: string; quantity: number; cancelled_on?: string | null }[]).filter(
    (i) => !i.cancelled_on
  );

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-black">
      <style>{"@media print{header{display:none!important}}"}</style>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black">Canuck Motors</h1>
          <p className="mt-1 text-sm">Packing slip</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-bold">Ship to</p>
          <p className="mt-1">{a?.name || order.customer_name || "Customer"}</p>
          {a?.line1 && <p>{a.line1}</p>}
          {a?.line2 && <p>{a.line2}</p>}
          <p>{[a?.city, a?.province, a?.postal_code].filter(Boolean).join(", ")}</p>
          {a?.country && <p>{a.country}</p>}
        </div>
        <div>
          <p className="font-bold">Order</p>
          <p className="mt-1">{order.order_number}</p>
          <p>{new Date(order.created_on).toLocaleDateString("en-CA")}</p>
          <p>{order.customer_email}</p>
        </div>
      </div>

      <table className="mt-8 w-full border-t border-black text-left text-sm">
        <thead>
          <tr className="border-b border-black/30">
            <th className="py-2">Part number</th>
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="w-12 py-2 text-center">Packed</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={n} className="border-b border-black/15">
              <td className="py-2 font-semibold">{i.sku}</td>
              <td className="py-2">{i.product_name}</td>
              <td className="py-2 text-right">{i.quantity}</td>
              <td className="py-2 text-center">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
