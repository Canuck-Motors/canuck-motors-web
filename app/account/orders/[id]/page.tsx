import type { Metadata } from "next";
import { grandTotal, storedTaxLines } from "@/lib/order-totals";
import UberTracking from "@/components/uber/UberTracking";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Image from "next/image";
import { imageUrl, isVideo } from "@/lib/product-images";
import ReturnPhotos from "@/components/account/ReturnPhotos";
import { deliveryCarrierLabel } from "@/lib/delivery-carrier";
import ItemActionToggle from "@/components/account/ItemActionToggle";
import {
  cancelOrderItem,
  cancelReturnRequest,
  requestCancellation,
  requestReturnOrExchange,
} from "@/app/account/orders/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

const cancellationStatuses = new Set([
  "paid",
  "processing",
  "packed",
  "cancellation_requested",
]);

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error("Customer profile is unavailable.");
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, fulfillment_status, payment_status, total_amount, subtotal, tax_amount, shipping_amount, currency, created_on, placed_on, delivered_on, return_window_ends_on, cancellation_reason, delivery_method, delivery_fee, sales_tax, tax_lines, uber_delivery_id, uber_status"
    )
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const [{ data: items }, { data: shipments }, { data: history }, { data: returnRequests }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select("id, product_id, sku, product_name, unit_price, quantity, line_total, cancelled_on")
        .eq("order_id", order.id)
        .order("id"),
      supabase
        .from("shipments")
        .select(
          "id, carrier, tracking_number, tracking_url, status, estimated_delivery, shipped_on, delivered_on, last_event_at"
        )
        .eq("order_id", order.id)
        .order("created_on", { ascending: false }),
      supabase
        .from("order_status_history")
        .select("id, from_status, to_status, source, reason, created_on")
        .eq("order_id", order.id)
        .order("created_on", { ascending: false }),
      supabase
        .from("return_requests")
        .select(
          "id, request_type, status, reason_code, reason_text, resolution_notes, requested_on, updated_on, return_tracking_number, return_carrier, fulfillment_provider, amazon_return_status, amazon_rma_id, amazon_rma_page_url, amazon_return_error, replacement_order_id, replacement_payment_url, replacement_amount_due, replacement_refund_due, return_request_items(order_item_id, quantity)"
        )
        .eq("order_id", order.id)
        .order("requested_on", { ascending: false }),
    ]);

  const returnRequestIds = (returnRequests ?? []).map((request) => String(request.id));
  let returnActivity: {
    id: number;
    request_id: string;
    action: string;
    detail: string | null;
    created_on: string;
  }[] = [];

  if (returnRequestIds.length > 0) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("return_activity")
      .select("id, request_id, action, detail, created_on")
      .in("request_id", returnRequestIds)
      .order("created_on", { ascending: true });

    returnActivity = (data ?? []) as typeof returnActivity;
  }

  const shipmentIds = (shipments ?? []).map((shipment) => shipment.id);

  const { data: shipmentEvents } =
    shipmentIds.length > 0
      ? await supabase
          .from("shipment_events")
          .select("id, shipment_id, status, message, location, event_time")
          .in("shipment_id", shipmentIds)
          .order("event_time", { ascending: false })
      : { data: [] };

  // First photo + page link for each product in the order.
  const productIds = Array.from(
    new Set((items ?? []).map((i) => i.product_id).filter((v): v is number => v != null))
  );
  const thumbByProduct = new Map<number, string>();
  const slugByProduct = new Map<number, string>();
  if (productIds.length) {
    const [{ data: imgRows }, { data: prodRows }] = await Promise.all([
      supabase
        .from("product_images")
        .select("product_id, path, sort_order")
        .in("product_id", productIds)
        .order("sort_order"),
      supabase.from("products").select("id, slug").in("id", productIds),
    ]);
    for (const r of imgRows ?? []) {
      if (!thumbByProduct.has(r.product_id) && !isVideo(r.path)) thumbByProduct.set(r.product_id, imageUrl(r.path));
    }
    for (const r of prodRows ?? []) slugByProduct.set(r.id, String(r.slug ?? r.id));
  }

  const activeItemCount = (items ?? []).filter((i) => !i.cancelled_on).length;

  // A booked Uber courier is already on the way: no cancelling until it is delivered.
  const uberLocked =
    order.delivery_method === "uber" &&
    !!order.uber_delivery_id &&
    !["canceled", "cancelled", "booking_failed"].includes(String(order.uber_status ?? "")) &&
    order.fulfillment_status !== "delivered";

  const canCancel =
    !uberLocked &&
    cancellationStatuses.has(order.status) &&
    ["unfulfilled", "processing", "packed"].includes(order.fulfillment_status) &&
    order.payment_status !== "refunded";

  // Quantity already part of a return that is still open or done (rejected/cancelled ones don't count).
  const returnedQty = new Map<number, number>();
  for (const rr of returnRequests ?? []) {
    if (["rejected", "cancelled"].includes(String(rr.status))) continue;
    for (const it of (rr.return_request_items ?? []) as { order_item_id: number; quantity: number }[]) {
      returnedQty.set(it.order_item_id, (returnedQty.get(it.order_item_id) ?? 0) + Number(it.quantity));
    }
  }

  const firstShipment = (shipments ?? [])[0] as { carrier?: string | null; tracking_number?: string | null } | undefined;
  const orderDeliveryCarrier = deliveryCarrierLabel({
    carrier: firstShipment?.carrier,
    tracking: firstShipment?.tracking_number,
    deliveryMethod: order.delivery_method,
  });
  const orderItemById = new Map((items ?? []).map((item) => [Number(item.id), item]));
  const returnNumberById = new Map(
    [...(returnRequests ?? [])]
      .reverse()
      .map((request, index) => [String(request.id), index + 1])
  );

  const returnItemsFor = (request: (typeof returnRequests extends (infer T)[] | null ? T : never)) => {
    return ((request?.return_request_items ?? []) as { order_item_id: number; quantity: number }[])
      .map((entry) => {
        const item = orderItemById.get(Number(entry.order_item_id));
        if (!item) return null;
        const quantity = Number(entry.quantity || 1);
        return {
          quantity,
          name: String(item.product_name || item.sku || "Item"),
          sku: String(item.sku || ""),
          label: (() => {
            const name = String(item.product_name || item.sku || "Item");
            const sku = String(item.sku || "");
            const display = sku && !name.toLowerCase().includes(sku.toLowerCase())
              ? `${name} · ${sku}`
              : name;
            return `${quantity > 1 ? `${quantity}× ` : ""}${display}`;
          })(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  };

  const now = Date.now();
  // Orders marked delivered before a window was stored get 30 days from the delivery date.
  const returnDeadline = order.return_window_ends_on
    ? new Date(order.return_window_ends_on).getTime()
    : order.fulfillment_status === "delivered" && order.delivered_on
      ? new Date(order.delivered_on).getTime() + 30 * 86400000
      : null;
  const canRequestReturn =
    order.fulfillment_status === "delivered" &&
    returnDeadline !== null &&
    returnDeadline >= now;

  type TimelineEvent = {
    key: string;
    status: string;
    title: string;
    detail?: string;
    at: string;
    returnRequestId?: string;
    returnLabel?: string;
    returnItemCount?: number;
    returnItemLabels?: string[];
  };

  const timelineTitle = (status: string) => {
    const titles: Record<string, string> = {
      placed: "Order placed",
      paid: "Payment confirmed",
      processing: "Order processing",
      packed: "Order packed",
      shipped: "Order shipped",
      out_for_delivery: "Out for delivery",
      delivered: "Delivered",
      cancellation_requested: "Cancellation requested",
      cancelled: "Order cancelled",
      refunded: "Refund completed",
      partially_refunded: "Partial refund completed",
      requested: "Return requested",
      under_review: "Return under review",
      approved: "Return request approved",
      rejected: "Return request rejected",
      label_issued: "Return label issued",
      in_transit: "Return in transit",
      received: "Returned item received",
      refund_pending: "Refund pending",
      inspection_failed: "Return inspection issue",
      exchange_processing: "Exchange processing",
      completed: "Return completed",
    };
    return titles[status] ?? status.replaceAll("_", " ");
  };

  const timelineTone = (status: string) => {
    if (["delivered", "received", "completed", "refunded"].includes(status)) {
      return {
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    }
    if (["rejected", "cancelled", "inspection_failed"].includes(status)) {
      return {
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700 ring-red-200",
      };
    }
    if (["approved", "label_issued", "in_transit", "out_for_delivery"].includes(status)) {
      return {
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-800 ring-amber-200",
      };
    }
    return {
      dot: "bg-brand",
      badge: "bg-brand-tint text-brand ring-brand/20",
    };
  };

  const timeline: TimelineEvent[] = [
    {
      key: "placed",
      status: "placed",
      title: "Order placed",
      detail: "Your order was successfully placed.",
      at: String(order.placed_on || order.created_on),
    },
  ];

  const customerOrderStatuses = new Set([
    "paid",
    "processing",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancellation_requested",
    "cancelled",
    "refunded",
    "partially_refunded",
  ]);

  for (const event of [...(history ?? [])].reverse()) {
    const status = String(event.to_status || "");
    if (!customerOrderStatuses.has(status)) continue;
    timeline.push({
      key: `order-${event.id}`,
      status,
      title: timelineTitle(status),
      detail: event.reason || undefined,
      at: String(event.created_on),
    });
  }

  if (
    order.delivered_on &&
    !timeline.some((event) => event.status === "delivered")
  ) {
    timeline.push({
      key: "delivered-fallback",
      status: "delivered",
      title: "Delivered",
      detail: "Your order was delivered.",
      at: String(order.delivered_on),
    });
  }

  for (const request of returnRequests ?? []) {
    const requestId = String(request.id);
    const requestItems = returnItemsFor(request);
    const returnLabel = `Return ${returnNumberById.get(requestId) ?? ""}`.trim();
    const returnItemCount = requestItems.reduce((sum, item) => sum + item.quantity, 0);
    const returnItemLabels = requestItems.map((item) => item.label);

    timeline.push({
      key: `return-request-${request.id}`,
      status: "requested",
      title: "Return requested",
      detail: [
        String(request.reason_code || "").replaceAll("_", " "),
        request.reason_text ? String(request.reason_text) : "",
      ]
        .filter(Boolean)
        .join(" · "),
      at: String(request.requested_on),
      returnRequestId: requestId,
      returnLabel,
      returnItemCount,
      returnItemLabels,
    });

    const activities = returnActivity.filter(
      (activity) => activity.request_id === requestId
    );

    let sawStatusActivity = false;
    for (const activity of activities) {
      if (activity.action === "status") {
        const match = String(activity.detail || "").match(/^Status set to ([^,]+)/i);
        const status = String(match?.[1] || "").trim().replaceAll(" ", "_");
        if (!status || status === "requested") continue;
        sawStatusActivity = true;

        const isCurrentStatus = status === String(request.status);
        const reason =
          isCurrentStatus && request.resolution_notes
            ? `Reason: ${String(request.resolution_notes)}`
            : undefined;

        timeline.push({
          key: `return-status-${activity.id}`,
          status,
          title: timelineTitle(status),
          detail: reason,
          at: String(activity.created_on),
          returnRequestId: requestId,
          returnLabel,
          returnItemCount,
          returnItemLabels,
        });
      }

      if (activity.action === "refund") {
        timeline.push({
          key: `return-refund-${activity.id}`,
          status: "refunded",
          title: "Refund completed",
          detail: activity.detail || "Your refund was processed.",
          at: String(activity.created_on),
          returnRequestId: requestId,
          returnLabel,
          returnItemCount,
          returnItemLabels,
        });
      }
    }

    if (!sawStatusActivity && String(request.status) !== "requested") {
      const status = String(request.status);
      timeline.push({
        key: `return-current-${request.id}`,
        status,
        title: timelineTitle(status),
        detail:
          request.resolution_notes && ["rejected", "inspection_failed"].includes(status)
            ? `Reason: ${String(request.resolution_notes)}`
            : undefined,
        at: String(request.updated_on || request.requested_on),
        returnRequestId: requestId,
        returnLabel,
        returnItemCount,
        returnItemLabels,
      });
    }
  }

  const customerTimeline = timeline
    .filter((event) => event.at && !Number.isNaN(new Date(event.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .filter(
      (event, index, all) =>
        index === 0 ||
        !(
          event.status === all[index - 1].status &&
          event.returnRequestId === all[index - 1].returnRequestId &&
          Math.abs(new Date(event.at).getTime() - new Date(all[index - 1].at).getTime()) < 60000
        )
    );

  const latestReturnEventKey = new Map<string, string>();
  for (const event of customerTimeline) {
    if (event.returnRequestId) latestReturnEventKey.set(event.returnRequestId, event.key);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12 md:py-16">
        <Link
          href="/account/orders"
          className="text-sm font-bold text-brand hover:underline"
        >
          Back to orders
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <section>
            <p className="cm-eyebrow">Order details</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink">
              {order.order_number}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {new Date(order.placed_on || order.created_on).toLocaleString()}
            </p>
            {["paid", "refunded", "partially_refunded"].includes(String(order.payment_status)) && (
              <Link
                href={`/account/orders/${order.id}/invoice`}
                className="mt-4 inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-bold text-ink shadow-sm hover:border-brand hover:text-brand"
              >
                View invoice / download PDF
              </Link>
            )}

            {order.delivery_method === "uber" && order.fulfillment_status !== "delivered" && <UberTracking orderId={order.id} />}

            <section className="mt-8 rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="cm-eyebrow">History</p>
                  <h2 className="mt-2 text-2xl font-black text-ink">
                    Order & return timeline
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Follow the complete history of your order, delivery and any return request.
                  </p>
                </div>
                {customerTimeline.length > 0 && (
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ring-1 ${timelineTone(
                      customerTimeline[customerTimeline.length - 1].status
                    ).badge}`}
                  >
                    {customerTimeline[customerTimeline.length - 1].title}
                  </span>
                )}
              </div>

              <ol className="relative mt-7 ml-2 border-l border-black/10 pl-7">
                {customerTimeline.map((event, index) => {
                  const tone = timelineTone(event.status);
                  const isLatestOverall = index === customerTimeline.length - 1;
                  const isCurrentReturnState =
                    Boolean(event.returnRequestId) &&
                    latestReturnEventKey.get(String(event.returnRequestId)) === event.key;
                  const highlight = isCurrentReturnState || (!event.returnRequestId && isLatestOverall);

                  return (
                    <li key={event.key} className="relative pb-7 last:pb-0">
                      <span
                        className={`absolute -left-[34px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${tone.dot}`}
                        aria-hidden="true"
                      />
                      <div className={highlight ? "rounded-2xl bg-secondary/60 p-4" : ""}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-ink">{event.title}</p>
                          {isCurrentReturnState && (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${tone.badge}`}>
                              Current status
                            </span>
                          )}
                        </div>
                        {event.returnRequestId && (
                          <div className="mt-2 rounded-xl border border-black/5 bg-white px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-brand">{event.returnLabel}</span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {event.returnItemCount || 0} {(event.returnItemCount || 0) === 1 ? "item" : "items"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-ink">
                              {(event.returnItemLabels ?? []).slice(0, 2).join(" · ")}
                              {(event.returnItemLabels?.length ?? 0) > 2
                                ? ` · +${(event.returnItemLabels?.length ?? 0) - 2} more`
                                : ""}
                            </p>
                          </div>
                        )}
                        {event.detail && (
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {event.detail}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                          {new Date(event.at).toLocaleString("en-CA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {(returnRequests ?? []).length > 0 && (
                <div className="mt-7 border-t border-black/5 pt-5">
                  <p className="text-sm font-black text-ink">Your returns</p>
                  <div className="mt-3 space-y-3">
                    {(returnRequests ?? []).map((request) => {
                      const status = String(request.status);
                      const items = returnItemsFor(request);
                      const canWithdraw =
                        ["requested", "under_review", "approved"].includes(status) &&
                        !request.amazon_rma_id &&
                        !request.return_tracking_number;
                      const canPrint =
                        ["approved", "label_issued", "in_transit"].includes(status) &&
                        request.request_type === "return" &&
                        !request.amazon_rma_id;
                      return (
                        <div key={request.id} className="rounded-2xl border border-black/5 bg-secondary/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-ink">
                              Return {returnNumberById.get(String(request.id))}{" "}
                              <span className="font-semibold text-muted-foreground">
                                · {items.map((i) => i.label).join(", ")}
                              </span>
                            </p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-ink ring-1 ring-black/10">
                              {status.replaceAll("_", " ")}
                            </span>
                          </div>
                          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-semibold text-muted-foreground">Item to return</dt>
                              <dd className="mt-0.5 space-y-0.5 font-semibold text-ink">
                                {(request.return_request_items ?? []).map((ri: { order_item_id: number; quantity: number }) => {
                                  const it = orderItemById.get(Number(ri.order_item_id));
                                  if (!it) return null;
                                  return (
                                    <p key={ri.order_item_id}>
                                      {ri.quantity} × {String(it.product_name)}
                                      <span className="float-right">${(Number(it.unit_price ?? 0) * Number(ri.quantity)).toFixed(2)}</span>
                                    </p>
                                  );
                                })}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold text-muted-foreground">Requested on</dt>
                              <dd className="font-semibold text-ink">
                                {new Date(request.requested_on).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold text-muted-foreground">Delivered by</dt>
                              <dd className="font-semibold text-ink">{orderDeliveryCarrier}</dd>
                            </div>
                          </dl>
                          {(request.return_tracking_number || request.return_carrier) && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Return shipping: {[request.return_carrier, request.return_tracking_number].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {(canPrint || canWithdraw || request.amazon_rma_page_url) && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {canPrint && (
                                <>
                                  <a
                                    href={`/account/returns/${request.id}/label`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white"
                                  >
                                    View / print return label
                                  </a>
                                  <a
                                    href={`/account/returns/${request.id}/label?download=1`}
                                    className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold text-ink hover:border-brand"
                                  >
                                    Download PDF
                                  </a>
                                </>
                              )}
                              {request.amazon_rma_page_url && (
                                <a
                                  href={request.amazon_rma_page_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white"
                                >
                                  Open return document
                                </a>
                              )}
                              {canWithdraw && (
                                <ItemActionToggle
                                  bare
                                  tone="danger"
                                  label="Cancel this return"
                                  question="Cancel this return request? You'll keep the item."
                                >
                                  <form
                                    action={async () => {
                                      "use server";
                                      await cancelReturnRequest(order.id, String(request.id));
                                    }}
                                    className="mt-3"
                                  >
                                    <button
                                      type="submit"
                                      className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                    >
                                      Yes, cancel my return
                                    </button>
                                  </form>
                                </ItemActionToggle>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(shipments ?? []).length > 0 && (
                <div className="mt-7 border-t border-black/5 pt-5">
                  <p className="text-sm font-black text-ink">Shipment details</p>
                </div>
              )}

              {(shipments ?? []).length > 0 && (
                <div className="mt-4 space-y-6">
                  {(shipments ?? []).map((shipment) => {
                    const events = (shipmentEvents ?? []).filter(
                      (event) => event.shipment_id === shipment.id
                    );

                    return (
                      <div key={shipment.id} className="rounded-2xl bg-secondary/60 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-black text-ink">{shipment.carrier}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Tracking: {shipment.tracking_number || "Pending"}
                            </p>
                            {shipment.estimated_delivery && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Estimated delivery:{" "}
                                {new Date(shipment.estimated_delivery).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {shipment.tracking_url && (
                            <a
                              href={shipment.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-bold text-brand hover:underline"
                            >
                              Track with carrier
                            </a>
                          )}
                        </div>

                        <ol className="mt-5 space-y-4">
                          {events.map((event) => (
                            <li key={event.id} className="flex gap-3">
                              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                              <div>
                                <p className="font-semibold capitalize text-ink">
                                  {event.status.replaceAll("_", " ")}
                                </p>
                                {event.message && (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {event.message}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {new Date(event.event_time).toLocaleString()}
                                  {event.location ? ` · ${event.location}` : ""}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-black text-ink">Items</h2>
              <div className="mt-4 space-y-4">
                {(items ?? []).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {item.product_id != null && thumbByProduct.get(item.product_id) ? (
                          <Link
                            href={`/product/${slugByProduct.get(item.product_id) ?? item.product_id}`}
                            className="shrink-0"
                          >
                            <Image
                              src={thumbByProduct.get(item.product_id)!}
                              alt={item.product_name}
                              width={88}
                              height={88}
                              className="h-[88px] w-[88px] rounded-2xl border border-black/5 bg-white object-contain p-1"
                            />
                          </Link>
                        ) : (
                          <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl border border-dashed text-[10px] font-bold text-muted-foreground">
                            No photo
                          </div>
                        )}
                      <div>
                        <p className={`font-black ${item.cancelled_on ? "text-muted-foreground line-through" : "text-ink"}`}>
                          {item.product_name}
                        </p>
                        {item.cancelled_on && (
                          <p className="mt-1 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                            Cancelled and refunded
                          </p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          Part number: {item.sku}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                        {(returnedQty.get(item.id) ?? 0) > 0 && (
                          <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                            You ordered {item.quantity} · returning {returnedQty.get(item.id)}
                            {item.quantity - (returnedQty.get(item.id) ?? 0) > 0
                              ? ` · ${item.quantity - (returnedQty.get(item.id) ?? 0)} kept`
                              : ""}
                          </p>
                        )}
                      </div>
                      </div>
                      <p className={`font-black ${item.cancelled_on ? "text-muted-foreground line-through" : "text-ink"}`}>
                        ${Number(item.line_total).toFixed(2)}
                      </p>
                    </div>

                    {canCancel &&
                      order.status !== "cancellation_requested" &&
                      order.payment_status === "paid" &&
                      !item.cancelled_on &&
                      activeItemCount > 1 && (
                        <ItemActionToggle tone="danger" label="Cancel this item" question="Do you want to cancel this item?">
                        <form
                          action={async (formData) => {
                            "use server";
                            await cancelOrderItem(
                              order.id,
                              item.id,
                              String(formData.get("reason") || "Customer cancelled this item")
                            );
                          }}
                          className="mt-3 flex flex-col gap-2 sm:flex-row"
                        >
                          <input
                            name="reason"
                            type="text"
                            required
                            placeholder="Why do you want to cancel this item?"
                            className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
                          />
                          <button
                            type="submit"
                            className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                          >
                            Cancel this item (refund ${Number(item.line_total).toFixed(2)})
                          </button>
                        </form>
                        </ItemActionToggle>
                      )}

                    {canRequestReturn && !item.cancelled_on && item.quantity - (returnedQty.get(item.id) ?? 0) > 0 && (
                      <ItemActionToggle label="Return this item" question="Do you want to return this item?">
                        <form
                          action={async (formData) => {
                            "use server";
                            const requestType = String(
                              formData.get("request_type") || "return"
                            ) as "return" | "exchange";
                            const quantity = Number(formData.get("quantity") || 1);
                            const reasonCode = String(
                              formData.get("reason_code") || ""
                            );
                            const reasonText = String(
                              formData.get("reason_text") || ""
                            );

                            await requestReturnOrExchange({
                              orderId: order.id,
                              requestType,
                              reasonCode,
                              reasonText,
                              items: [
                                {
                                  order_item_id: item.id,
                                  quantity,
                                },
                              ],
                            });
                          }}
                          className="mt-3 grid gap-3 md:grid-cols-2"
                        >
                          <input type="hidden" name="request_type" value="return" />
                          {item.quantity - (returnedQty.get(item.id) ?? 0) > 1 ? (
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                              Quantity to return
                              <input
                                name="quantity"
                                type="number"
                                min={1}
                                max={item.quantity - (returnedQty.get(item.id) ?? 0)}
                                defaultValue={1}
                                className="w-20 rounded-xl border border-black/10 px-3 py-2.5 text-sm text-ink"
                                required
                              />
                            </label>
                          ) : (
                            <input type="hidden" name="quantity" value="1" />
                          )}
                          <select
                            name="reason_code"
                            className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                            required
                          >
                            <option value="">Select reason</option>
                            <option value="damaged">Damaged</option>
                            <option value="wrong_item">Wrong item</option>
                            <option value="not_compatible">Not compatible</option>
                            <option value="defective">Defective</option>
                            <option value="changed_mind">Changed mind</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            name="reason_text"
                            type="text"
                            placeholder="Additional details"
                            className="rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                          />
                          <ReturnPhotos orderId={order.id} />
                          <button
                            type="submit"
                            className="cm-button-dark md:col-span-2"
                          >
                            Submit request
                          </button>
                        </form>
                      </ItemActionToggle>
                    )}
                  </article>
                ))}
              </div>
            </section>

            {uberLocked && order.payment_status === "paid" && (
              <section className="mt-8 rounded-[26px] border border-black/5 bg-white p-6 text-sm leading-6 text-muted-foreground shadow-sm">
                <p className="font-bold text-ink">Out for same-day delivery</p>
                <p className="mt-1">
                  Your order is with an Uber courier, so it can&apos;t be cancelled. After it&apos;s delivered you can request a
                  return from this page. Questions? Email contactus@canuckmotors.ca or call 604-445-0147.
                </p>
              </section>
            )}

            {canCancel && order.status !== "cancellation_requested" && (
              <section className="mt-8 rounded-[26px] border border-red-100 bg-red-50 p-6">
                <h2 className="text-xl font-black text-red-900">
                  Cancel order
                </h2>
                <p className="mt-2 text-sm leading-6 text-red-800/80">
                  Cancellation is available only before the order enters the delivery
                  flow. If payment has already been captured, an eligible cancellation
                  automatically starts a full Stripe refund.
                </p>
                <form
                  action={async (formData) => {
                    "use server";
                    await requestCancellation(
                      order.id,
                      String(formData.get("reason") || "Customer requested cancellation")
                    );
                  }}
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    name="reason"
                    type="text"
                    required
                    placeholder="Reason for cancellation"
                    className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white"
                  >
                    Cancel order
                  </button>
                </form>
              </section>
            )}
          </section>

          <aside className="h-fit rounded-[28px] bg-ink p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.12)]">
            <h2 className="text-xl font-black">Order summary</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Status</dt>
                <dd className="font-bold capitalize">
                  {order.status.replaceAll("_", " ")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Payment</dt>
                <dd className="font-bold capitalize">
                  {order.payment_status.replaceAll("_", " ")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Fulfillment</dt>
                <dd className="font-bold capitalize">
                  {order.fulfillment_status.replaceAll("_", " ")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Subtotal</dt>
                <dd className="font-bold">${Number(order.subtotal).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Shipping</dt>
                <dd className="font-bold">
                  ${(Number(order.shipping_amount) + Number(order.delivery_fee ?? 0)).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Tax</dt>
                <dd className="font-bold">
                  ${(Number(order.tax_amount) + Number(order.sales_tax ?? 0)).toFixed(2)}
                  {storedTaxLines(order.tax_lines).length > 0 && (
                    <span className="block text-xs font-normal text-white/50">
                      {storedTaxLines(order.tax_lines).map((t) => `${t.name} $${(Number(t.cents) / 100).toFixed(2)}`).join(" · ")}
                    </span>
                  )}
                </dd>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between gap-4 text-lg font-black">
                  <dt>Total</dt>
                  <dd>
                    ${grandTotal(order).toFixed(2)} {order.currency}
                  </dd>
                </div>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
