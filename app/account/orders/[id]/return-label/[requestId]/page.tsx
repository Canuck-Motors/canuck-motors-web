import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InvoicePrintButton from "@/components/account/InvoicePrintButton";

export const instant = false;

export const metadata: Metadata = {
  title: "Return label",
  robots: { index: false, follow: false },
};

type Addr = Record<string, string | null> | null;

function Block({ title, lines }: { title: string; lines: (string | null | undefined)[] }) {
  const rows = lines.filter(Boolean) as string[];
  return (
    <div className="rounded-xl border-2 border-black p-4">
      <p className="text-xs font-black uppercase tracking-wide">{title}</p>
      {rows.length ? (
        rows.map((l, i) => (
          <p key={i} className={i === 0 ? "mt-2 text-lg font-bold" : "text-base"}>
            {l}
          </p>
        ))
      ) : (
        <p className="mt-2 text-black/50">Not provided</p>
      )}
    </div>
  );
}

export default async function ReturnLabelPage({ params }: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("id").eq("auth_user_id", authData.user.id).maybeSingle();
  if (!profile) notFound();

  // The order must belong to this customer.
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, shipping_address, fulfillment_provider")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!order) notFound();

  const { data: request } = await supabase
    .from("return_requests")
    .select("id, order_id, request_type, status, reason_code, requested_on")
    .eq("id", requestId)
    .eq("order_id", order.id)
    .maybeSingle();
  if (!request) notFound();

  const printable = ["approved", "label_issued", "in_transit"].includes(String(request.status));

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("return_request_items")
    .select("quantity, order_items(product_name, sku)")
    .eq("return_request_id", request.id);
  const items = (rows ?? []).map((r) => {
    const oi = Array.isArray(r.order_items) ? r.order_items[0] : r.order_items;
    return { qty: Number(r.quantity), name: String(oi?.product_name ?? ""), sku: String(oi?.sku ?? "") };
  });

  const from = (order.shipping_address ?? null) as Addr;
  const fromCity = [from?.city, from?.province, from?.postal_code].filter(Boolean).join(", ");
  const toRaw = (process.env.RETURN_ADDRESS || process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "").trim();
  const toLines = toRaw ? toRaw.split(/\s*[\n|]\s*/).filter(Boolean) : [];
  const returnNo = `RET-${String(request.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const date = new Date(request.requested_on).toLocaleDateString("en-CA", { dateStyle: "long", timeZone: "America/Vancouver" });

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-black sm:p-10">
      <style>{"@media print{header,footer,nav{display:none!important}main{padding:0!important}}"}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/account/orders/${order.id}`} className="text-sm font-bold text-brand hover:underline">
          Back to order
        </Link>
        <InvoicePrintButton />
      </div>

      {!printable ? (
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          A return label is available once your return has been approved. Current status: {String(request.status).replaceAll("_", " ")}.
        </p>
      ) : (
        <>
          <div className="mt-6 flex items-start justify-between gap-4 border-b-4 border-black pb-4">
            <div>
              <h1 className="text-3xl font-black">Canuck Motors</h1>
              <p className="text-sm text-black/70">contactus@canuckmotors.ca · 604-445-0147</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">RETURN LABEL</p>
              <p className="text-sm">{date}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Block
              title="Ship from"
              lines={[from?.name || order.customer_name, from?.line1, from?.line2, fromCity, from?.country]}
            />
            <Block title="Ship to" lines={["Canuck Motors Returns", ...toLines]} />
          </div>

          <div className="mt-6 rounded-xl border-2 border-black p-4 text-center">
            <p className="text-xs font-black uppercase tracking-wide">Return number</p>
            <p className="mt-1 text-4xl font-black tracking-widest">{returnNo}</p>
            <p className="mt-2 text-lg font-bold">Order {order.order_number}</p>
          </div>

          <table className="mt-6 w-full border-t border-black text-left text-sm">
            <thead>
              <tr className="border-b border-black/30">
                <th className="py-2">Part</th>
                <th className="py-2 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, n) => (
                <tr key={n} className="border-b border-black/15">
                  <td className="py-2">
                    {i.name}
                    <span className="block text-xs text-black/60">{i.sku}</span>
                  </td>
                  <td className="py-2 text-right">{i.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm">Reason: {String(request.reason_code).replaceAll("_", " ")}</p>

          <ol className="mt-6 list-decimal space-y-1 pl-5 text-sm">
            <li>Pack the part in its original packaging.</li>
            <li>Put a copy of this page inside the box and stick another copy on the outside.</li>
            <li>Send it with any carrier you like. Return postage is not included.</li>
            <li>Email the tracking number to contactus@canuckmotors.ca so we can watch for it.</li>
          </ol>
        </>
      )}
    </main>
  );
}
