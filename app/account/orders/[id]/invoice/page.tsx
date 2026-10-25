import type { Metadata } from "next";
import { grandTotal, storedTaxLines } from "@/lib/order-totals";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InvoicePrintButton from "@/components/account/InvoicePrintButton";

export const instant = false;

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

type Addr = Record<string, string | null> | null;
const money = (n: number) => `$${n.toFixed(2)}`;

function AddressBlock({ title, a, fallbackName }: { title: string; a: Addr; fallbackName?: string | null }) {
  const name = a?.name || fallbackName;
  const city = [a?.city, a?.province, a?.postal_code].filter(Boolean).join(", ");
  return (
    <div>
      <p className="font-bold">{title}</p>
      {name && <p className="mt-1">{name}</p>}
      {a?.line1 && <p>{a.line1}</p>}
      {a?.line2 && <p>{a.line2}</p>}
      {city && <p>{city}</p>}
      {a?.country && <p>{a.country}</p>}
      {!name && !a?.line1 && !city && <p className="mt-1 text-black/50">Not provided</p>}
    </div>
  );
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("id").eq("auth_user_id", authData.user.id).maybeSingle();
  if (!profile) notFound();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_on, placed_on, payment_status, currency, subtotal, tax_amount, total_amount, delivery_fee, sales_tax, tax_lines, delivery_method, customer_name, customer_email, shipping_address, billing_address, order_items(product_name, sku, unit_price, quantity, cancelled_on)"
    )
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!order) notFound();

  const paid = ["paid", "refunded", "partially_refunded"].includes(String(order.payment_status));
  const items = ((order.order_items ?? []) as { product_name: string; sku: string; unit_price: number; quantity: number; cancelled_on?: string | null }[]).filter(
    (i) => !i.cancelled_on
  );
  const fee = Number(order.delivery_fee ?? 0);
  const taxLines = storedTaxLines(order.tax_lines);
  const oldTax = Number(order.tax_amount ?? 0);
  const subtotal = items.reduce((t, i) => t + Number(i.unit_price) * Number(i.quantity), 0);
  const total = grandTotal(order);
  const method = order.delivery_method === "uber" ? "Uber same-day delivery" : "Standard shipping";
  const date = new Date(order.placed_on || order.created_on).toLocaleDateString("en-CA", {
    dateStyle: "long",
    timeZone: "America/Vancouver",
  });
  const sellerAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS;
  const gst = process.env.NEXT_PUBLIC_GST_NUMBER;

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-black sm:p-10">
      <style>{"@media print{header,footer,nav{display:none!important}main{padding:0!important}}"}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/account/orders/${order.id}`} className="text-sm font-bold text-brand hover:underline">
          Back to order
        </Link>
        <InvoicePrintButton />
      </div>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Canuck Motors</h1>
          <p className="mt-1 text-sm text-black/70">
            {sellerAddress ? `${sellerAddress} · ` : ""}contactus@canuckmotors.ca · 604-445-0147
          </p>
          {gst && <p className="text-sm text-black/70">GST/HST no. {gst}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-black">{paid ? "Invoice / Receipt" : "Invoice"}</p>
          <p className="mt-1 text-sm">{order.order_number}</p>
          <p className="text-sm">{date}</p>
          {paid && <p className="mt-1 text-sm font-bold text-green-700">PAID</p>}
        </div>
      </div>

      <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
        <AddressBlock title="Bill to" a={(order.billing_address ?? null) as Addr} fallbackName={order.customer_name} />
        <AddressBlock title="Ship to" a={(order.shipping_address ?? null) as Addr} fallbackName={order.customer_name} />
      </div>
      <p className="mt-4 text-sm text-black/70">{order.customer_email}</p>

      <table className="mt-8 w-full border-t border-black text-left text-sm">
        <thead>
          <tr className="border-b border-black/30">
            <th className="py-2">Part</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={n} className="border-b border-black/15 align-top">
              <td className="py-2">
                {i.product_name}
                <span className="block text-xs text-black/60">{i.sku}</span>
              </td>
              <td className="py-2 text-right">{i.quantity}</td>
              <td className="py-2 text-right">{money(Number(i.unit_price))}</td>
              <td className="py-2 text-right">{money(Number(i.unit_price) * Number(i.quantity))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
        {fee > 0 && <div className="flex justify-between"><dt>{method}</dt><dd>{money(fee)}</dd></div>}
        {taxLines.map((t) => (
          <div key={t.name} className="flex justify-between"><dt>{t.name}</dt><dd>{money(Number(t.cents) / 100)}</dd></div>
        ))}
        {taxLines.length === 0 && oldTax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{money(oldTax)}</dd></div>}
        <div className="flex justify-between border-t border-black pt-2 text-base font-black">
          <dt>Total</dt>
          <dd>{money(total)} {order.currency}</dd>
        </div>
      </dl>

      <p className="mt-10 text-xs text-black/60">
        {paid ? "Paid by card through Stripe. " : ""}Thank you for shopping with Canuck Motors. Questions about this invoice? Email contactus@canuckmotors.ca or call 604-445-0147.
      </p>
    </main>
  );
}
