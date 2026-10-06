import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
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
      "id, order_number, status, fulfillment_status, payment_status, total_amount, subtotal, tax_amount, shipping_amount, currency, created_on, placed_on, delivered_on, return_window_ends_on, cancellation_reason"
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
        .select("id, product_id, sku, product_name, unit_price, quantity, line_total")
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
          "id, request_type, status, reason_code, reason_text, requested_on, return_tracking_number, return_carrier, replacement_order_id, replacement_payment_url, replacement_amount_due, replacement_refund_due"
        )
        .eq("order_id", order.id)
        .order("requested_on", { ascending: false }),
    ]);

  const shipmentIds = (shipments ?? []).map((shipment) => shipment.id);

  const { data: shipmentEvents } =
    shipmentIds.length > 0
      ? await supabase
          .from("shipment_events")
          .select("id, shipment_id, status, message, location, event_time")
          .in("shipment_id", shipmentIds)
          .order("event_time", { ascending: false })
      : { data: [] };

  const canCancel =
    cancellationStatuses.has(order.status) &&
    ["unfulfilled", "processing", "packed"].includes(order.fulfillment_status) &&
    order.payment_status !== "refunded";

  const now = Date.now();
  const returnDeadline = order.return_window_ends_on
    ? new Date(order.return_window_ends_on).getTime()
    : null;
  const canRequestReturn =
    order.fulfillment_status === "delivered" &&
    returnDeadline !== null &&
    returnDeadline >= now;

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

            <section className="mt-8 rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="cm-eyebrow">Tracking</p>
                  <h2 className="mt-2 text-2xl font-black text-ink">
                    Delivery progress
                  </h2>
                </div>
                <span className="rounded-full bg-brand-tint px-3 py-1.5 text-xs font-bold capitalize text-brand">
                  {order.fulfillment_status.replaceAll("_", " ")}
                </span>
              </div>

              {(shipments ?? []).length === 0 ? (
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  Tracking will appear here as soon as a delivery label is created.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
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
                      <div>
                        <p className="font-black text-ink">{item.product_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Part number: {item.sku}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <p className="font-black text-ink">
                        ${Number(item.line_total).toFixed(2)}
                      </p>
                    </div>

                    {canRequestReturn && (
                      <div className="mt-5 border-t pt-5">
                        <p className="text-sm font-bold text-ink">
                          Return or exchange this item
                        </p>
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
                          <select
                            name="request_type"
                            className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                            required
                          >
                            <option value="return">Return</option>
                            <option value="exchange">Exchange</option>
                          </select>
                          <input
                            name="quantity"
                            type="number"
                            min={1}
                            max={item.quantity}
                            defaultValue={1}
                            className="rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                            required
                          />
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
                          <button
                            type="submit"
                            className="cm-button-dark md:col-span-2"
                          >
                            Submit request
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            {(returnRequests ?? []).length > 0 && (
              <section className="mt-8 rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
                <p className="cm-eyebrow">Returns & exchanges</p>
                <h2 className="mt-2 text-2xl font-black text-ink">
                  Requests
                </h2>
                <div className="mt-5 divide-y">
                  {(returnRequests ?? []).map((request) => (
                    <div key={request.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-bold capitalize text-ink">
                            {request.request_type}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {request.reason_code.replaceAll("_", " ")}
                          </p>
                        </div>
                        <span className="text-sm font-bold capitalize text-brand">
                          {request.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      {request.request_type === "exchange" &&
                        request.replacement_order_id && (
                          <div className="mt-4 rounded-2xl bg-secondary/60 p-4">
                            {Number(request.replacement_amount_due) > 0 && (
                              <p className="text-sm font-semibold text-ink">
                                Exchange payment due: $
                                {Number(request.replacement_amount_due).toFixed(2)}
                              </p>
                            )}

                            {Number(request.replacement_refund_due) > 0 && (
                              <p className="text-sm font-semibold text-ink">
                                Exchange refund: $
                                {Number(request.replacement_refund_due).toFixed(2)}
                              </p>
                            )}

                            {request.replacement_payment_url && (
                              <a
                                href={request.replacement_payment_url}
                                className="cm-button-primary mt-3"
                              >
                                Pay exchange difference
                              </a>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(history ?? []).length > 0 && (
              <section className="mt-8 rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
                <p className="cm-eyebrow">Order activity</p>
                <h2 className="mt-2 text-2xl font-black text-ink">Timeline</h2>
                <ol className="mt-5 space-y-4">
                  {(history ?? []).map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                      <div>
                        <p className="font-semibold capitalize text-ink">
                          {event.to_status.replaceAll("_", " ")}
                        </p>
                        {event.reason && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {event.reason}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(event.created_on).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
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
                  ${Number(order.shipping_amount).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Tax</dt>
                <dd className="font-bold">${Number(order.tax_amount).toFixed(2)}</dd>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between gap-4 text-lg font-black">
                  <dt>Total</dt>
                  <dd>
                    ${Number(order.total_amount).toFixed(2)} {order.currency}
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
