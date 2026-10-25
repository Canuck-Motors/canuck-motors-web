import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retrieveStripeCheckoutSession } from "@/lib/stripe";
import { AdminNav } from "@/components/AdminNav";
import OrdersManager, { type OrderRow } from "@/components/admin/OrdersManager";

export const instant = false;

export const metadata: Metadata = {
  title: "Orders Admin",
  robots: { index: false, follow: false },
};

const BASE =
  "id, order_number, status, fulfillment_status, payment_status, fulfillment_provider, fulfillment_routing_status, fulfillment_error, total_amount, currency, customer_email, customer_name, created_on, shipping_address, cancellation_reason, order_items(product_name, sku, quantity, unit_price, cancelled_on, cancel_reason), shipments(id, carrier, tracking_number, tracking_url, status, estimated_delivery)";

export default async function OrdersAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const load = (select: string) =>
    supabase.from("orders").select(select).order("created_on", { ascending: false }).limit(1000);

  // admin_note exists only after database/admin_order_notes.sql has been run
  const SHIP = "delivery_fee, delivery_method, shipping_zone, shipping_weight_kg, sales_tax";
  // Optional columns come from separate SQL files, so try the richest select first and
  // drop groups one at a time. A missing admin_note must not hide the shipping fee.
  const tries = [
    `${BASE}, admin_note, ${SHIP}, shipping_cost`,
    `${BASE}, ${SHIP}, shipping_cost`,
    `${BASE}, admin_note, ${SHIP}`,
    `${BASE}, ${SHIP}`,
    `${BASE}, admin_note`,
    BASE,
  ];
  let res = await load(tries[0]);
  for (let i = 1; i < tries.length && res.error; i++) res = await load(tries[i]);
  if (res.error) {
    throw new Error("Unable to load orders.");
  }

  // Older paid orders may have no address saved. Fetch it from Stripe (max 10 per page load).
  try {
    const rows = (res.data ?? []) as unknown as Record<string, unknown>[];
    const missing = rows
      .filter((o) => o.payment_status === "paid" && (!o.shipping_address || Object.keys(o.shipping_address as object).length === 0))
      .slice(0, 10);
    if (missing.length) {
      const admin = createAdminClient();
      for (const o of missing) {
        const { data: pay } = await admin
          .from("payments")
          .select("provider_checkout_session_id")
          .eq("order_id", o.id as string)
          .not("provider_checkout_session_id", "is", null)
          .order("created_on", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!pay?.provider_checkout_session_id) continue;
        const session = await retrieveStripeCheckoutSession(pay.provider_checkout_session_id);
        const shipTo = session.collected_information?.shipping_details ?? session.shipping_details;
        const a = shipTo?.address;
        if (!a) continue;
        const address = {
          name: shipTo?.name ?? null,
          line1: a.line1 ?? null,
          line2: a.line2 ?? null,
          city: a.city ?? null,
          province: a.state ?? null,
          postal_code: a.postal_code ?? null,
          country: a.country ?? null,
        };
        await admin.from("orders").update({ shipping_address: address }).eq("id", o.id as string);
        o.shipping_address = address;
      }
    }
  } catch (error) {
    console.error("Address backfill failed:", error);
  }

  const adminForSettings = createAdminClient();
  const { data: fulfillmentSettings } = await adminForSettings
    .from("fulfillment_settings")
    .select("amazon_mcf_enabled, delivery_partner_enabled")
    .eq("id", 1)
    .single();

  const orders: OrderRow[] = ((res.data ?? []) as unknown as Record<string, unknown>[]).map((o) => {
    const ship = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments;
    return {
      id: String(o.id),
      number: String(o.order_number ?? ""),
      status: String(o.status ?? ""),
      fulfillment: String(o.fulfillment_status ?? ""),
      payment: String(o.payment_status ?? ""),
      provider: (o.fulfillment_provider as string) ?? "",
      routingStatus: String(o.fulfillment_routing_status ?? "unrouted"),
      fulfillmentError: (o.fulfillment_error as string) ?? "",
      total: Number(o.total_amount ?? 0),
      shippingFee: Number(o.delivery_fee ?? 0),
      salesTax: Number(o.sales_tax ?? 0),
      shippingZone: (o.shipping_zone as string) ?? "",
      shippingWeight: o.shipping_weight_kg == null ? null : Number(o.shipping_weight_kg),
      shippingCost: o.shipping_cost == null ? null : Number(o.shipping_cost),
      deliveryMethod: String(o.delivery_method ?? "standard"),
      currency: String(o.currency ?? "CAD"),
      email: (o.customer_email as string) ?? "",
      name: (o.customer_name as string) ?? "",
      createdOn: String(o.created_on),
      address: (o.shipping_address as OrderRow["address"]) ?? null,
      note: (o.admin_note as string) ?? "",
      cancelReason: (o.cancellation_reason as string) ?? "",
      cancelledItems: (
        (o.order_items as { product_name: string; sku: string; quantity: number; cancelled_on?: string | null; cancel_reason?: string | null }[]) ?? []
      )
        .filter((i) => i.cancelled_on)
        .map((i) => ({
          product_name: i.product_name,
          sku: i.sku,
          quantity: Number(i.quantity ?? 0),
          reason: i.cancel_reason ?? "",
        })),
      items: ((o.order_items as (OrderRow["items"][number] & { cancelled_on?: string | null })[]) ?? [])
        .filter((i) => !i.cancelled_on)
        .map((i) => ({
        product_name: i.product_name,
        sku: i.sku,
        quantity: Number(i.quantity ?? 0),
        unit_price: Number(i.unit_price ?? 0),
      })),
      shipment: ship
        ? {
            carrier: (ship as Record<string, string>).carrier ?? "",
            tracking: (ship as Record<string, string>).tracking_number ?? "",
            url: (ship as Record<string, string>).tracking_url ?? "",
            status: (ship as Record<string, string>).status ?? "",
          }
        : null,
    };
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">Operations</p>
            <h1 className="cm-section-title mt-3">Orders</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Search, fulfil and ship orders. Click a row to see the items and address.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Signed in as {role}</p>
        </div>

        {(() => {
          const since = Date.now() - 30 * 86400000;
          const std = orders.filter(
            (o) => o.payment === "paid" && o.deliveryMethod === "standard" && o.shippingFee > 0 && new Date(o.createdOn).getTime() >= since
          );
          if (!std.length) return null;
          const collected = std.reduce((t, o) => t + o.shippingFee, 0);
          const withCost = std.filter((o) => o.shippingCost != null);
          const spent = withCost.reduce((t, o) => t + (o.shippingCost ?? 0), 0);
          const net = withCost.reduce((t, o) => t + (o.shippingFee - (o.shippingCost ?? 0)), 0);
          const missing = std.length - withCost.length;
          return (
            <div className="mt-6 rounded-2xl border border-black/5 bg-white p-4 text-sm shadow-sm">
              <p className="font-bold text-ink">Standard shipping, last 30 days</p>
              <p className="mt-1 text-muted-foreground">
                {std.length} orders · collected <b className="text-ink">${collected.toFixed(2)}</b>
                {withCost.length > 0 && (
                  <>
                    {" "}· label cost <b className="text-ink">${spent.toFixed(2)}</b> · net{" "}
                    <b className={net >= 0 ? "text-green-700" : "text-red-700"}>
                      {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
                    </b>
                  </>
                )}
              </p>
              {missing > 0 && (
                <p className="mt-1 text-xs text-amber-800">
                  {missing} order{missing === 1 ? " has" : "s have"} no label cost yet. Open the order and enter it so this stays accurate.
                </p>
              )}
            </div>
          );
        })()}

        <OrdersManager
          initial={orders}
          amazonMcfEnabled={Boolean(fulfillmentSettings?.amazon_mcf_enabled)}
          deliveryPartnerEnabled={Boolean(fulfillmentSettings?.delivery_partner_enabled)}
        />
      </div>
    </main>
  );
}
