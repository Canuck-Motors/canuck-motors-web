import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import ReturnsManager, { type ReturnRow } from "@/components/admin/ReturnsManager";

export const instant = false;

export const metadata: Metadata = {
  title: "Returns Admin",
  robots: { index: false, follow: false },
};

type Json = Record<string, unknown>;
const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));

export default async function ReturnsAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const { data: requests, error } = await supabase
    .from("return_requests")
    .select(
      "id, order_id, request_type, status, reason_code, reason_text, resolution_notes, requested_on, return_carrier, return_tracking_number, fulfillment_provider, amazon_return_status, amazon_rma_id, amazon_rma_page_url, amazon_return_error, amazon_return_synced_on, replacement_order_id, replacement_payment_url, replacement_amount_due, replacement_refund_due, orders!order_id!inner(order_number, customer_name, customer_email, currency, shipping_address), return_request_items(id, quantity, received_quantity, amazon_seller_sku, amazon_return_reason_code, amazon_return_item_status, amazon_return_condition, amazon_fulfillment_center_id, order_items!inner(product_id, product_name, sku, unit_price))"
    )
    .order("requested_on", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`Unable to load return requests: ${error.message}`);
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, sku, product_name, price")
    .eq("is_active", true)
    .eq("is_delete", false)
    .not("price", "is", null)
    .order("sku")
    .limit(1000);

  // Optional extras (database/admin_returns_extras.sql)
  const [act, rst] = await Promise.all([
    supabase.rpc("admin_return_activity"),
    supabase.rpc("admin_return_restocks"),
  ]);
  const needsSql = Boolean(act.error || rst.error);

  const activity = new Map<string, { action: string; detail: string; at: string; by: string }[]>();
  for (const a of (act.data ?? []) as Json[]) {
    const id = String(a.request_id);
    const list = activity.get(id) ?? [];
    list.push({
      action: String(a.action ?? ""),
      detail: String(a.detail ?? ""),
      at: String(a.created_on),
      by: String(a.staff_email ?? ""),
    });
    activity.set(id, list);
  }
  const restocked = new Map<string, boolean>(
    ((rst.data ?? []) as Json[]).map((r) => [String(r.request_id), Boolean(r.restocked)])
  );

  const rows: ReturnRow[] = (requests ?? []).map((r) => {
    const order = one(r.orders as Json | Json[] | null) as Json | undefined;
    const items = ((r.return_request_items ?? []) as Json[]).map((it) => {
      const oi = one(it.order_items as Json | Json[] | null) as Json | undefined;
      return {
        id: Number(it.id),
        quantity: Number(it.quantity ?? 0),
        received: Number(it.received_quantity ?? 0),
        productId: (oi?.product_id as number | undefined) ?? null,
        name: String(oi?.product_name ?? ""),
        sku: String(oi?.sku ?? ""),
        unitPrice: Number(oi?.unit_price ?? 0),
        amazonSellerSku: String(it.amazon_seller_sku ?? ""),
        amazonReturnReasonCode: String(it.amazon_return_reason_code ?? ""),
        amazonReturnItemStatus: String(it.amazon_return_item_status ?? ""),
        amazonReturnCondition: String(it.amazon_return_condition ?? ""),
        amazonFulfillmentCenterId: String(it.amazon_fulfillment_center_id ?? ""),
      };
    });
    const subtotal = items.reduce(
      (t, i) => t + i.unitPrice * (i.received > 0 ? i.received : i.quantity),
      0
    );
    return {
      id: String(r.id),
      orderId: String(r.order_id),
      type: String(r.request_type ?? "return"),
      status: String(r.status ?? ""),
      reasonCode: String(r.reason_code ?? ""),
      reasonText: (r.reason_text as string) ?? "",
      notes: (r.resolution_notes as string) ?? "",
      requestedOn: String(r.requested_on),
      carrier: (r.return_carrier as string) ?? "",
      tracking: (r.return_tracking_number as string) ?? "",
      fulfillmentProvider: (r.fulfillment_provider as string) ?? "",
      amazonReturnStatus: (r.amazon_return_status as string) ?? "",
      amazonRmaId: (r.amazon_rma_id as string) ?? "",
      amazonRmaPageUrl: (r.amazon_rma_page_url as string) ?? "",
      amazonReturnError: (r.amazon_return_error as string) ?? "",
      amazonReturnSyncedOn: (r.amazon_return_synced_on as string) ?? "",
      replacementOrderId: (r.replacement_order_id as string) ?? null,
      replacementPaymentUrl: (r.replacement_payment_url as string) ?? "",
      replacementAmountDue: Number(r.replacement_amount_due ?? 0),
      replacementRefundDue: Number(r.replacement_refund_due ?? 0),
      orderNumber: String(order?.order_number ?? ""),
      customerName: String(order?.customer_name ?? ""),
      customerEmail: String(order?.customer_email ?? ""),
      currency: String(order?.currency ?? "CAD"),
      address: (order?.shipping_address as ReturnRow["address"]) ?? null,
      items,
      subtotal,
      stock: restocked.has(String(r.id)) ? (restocked.get(String(r.id)) ? "restocked" : "damaged") : null,
      activity: activity.get(String(r.id)) ?? [],
    };
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10">
          <p className="cm-eyebrow">Operations</p>
          <h1 className="cm-section-title mt-3">Returns</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Review requests, receive returned goods and issue refunds.
          </p>
        </div>

        <ReturnsManager
          initial={rows}
          needsSql={needsSql}
          products={(products ?? []).map((p) => ({
            id: p.id,
            sku: p.sku ?? "",
            name: p.product_name ?? "",
            price: Number(p.price ?? 0),
          }))}
        />
      </div>
    </main>
  );
}
