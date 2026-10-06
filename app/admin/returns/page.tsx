import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import {
  createExchangeReplacement,
  issueReturnRefund,
  updateReturnRequest,
} from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Returns & Exchanges Admin",
  robots: { index: false, follow: false },
};

export default async function ReturnsAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const { data: requests, error } = await supabase
    .from("return_requests")
    .select(
      "id, order_id, request_type, status, reason_code, reason_text, resolution_notes, requested_on, return_carrier, return_tracking_number, replacement_order_id, replacement_payment_url, replacement_amount_due, replacement_refund_due, orders!inner(order_number, customer_name, customer_email, currency), return_request_items(id, quantity, received_quantity, order_items!inner(product_id, product_name, sku, unit_price))"
    )
    .order("requested_on", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("Unable to load return requests.");
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, sku, product_name, price")
    .eq("is_active", true)
    .eq("is_delete", false)
    .not("price", "is", null)
    .order("sku")
    .limit(1000);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10">
          <p className="cm-eyebrow">Operations</p>
          <h1 className="cm-section-title mt-3">Returns & exchanges</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Review requests, receive returned goods, issue refunds, and progress exchanges.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {(requests ?? []).length === 0 ? (
            <div className="cm-card p-10 text-center text-muted-foreground">
              No return or exchange requests.
            </div>
          ) : (
            (requests ?? []).map((request) => {
              const order = Array.isArray(request.orders)
                ? request.orders[0]
                : request.orders;
              const itemSubtotal = (request.return_request_items ?? []).reduce(
                (sum, item) => {
                  const orderItem = Array.isArray(item.order_items)
                    ? item.order_items[0]
                    : item.order_items;
                  const qty = item.received_quantity > 0
                    ? item.received_quantity
                    : item.quantity;
                  return sum + Number(orderItem?.unit_price ?? 0) * qty;
                },
                0
              );

              return (
                <article
                  key={request.id}
                  className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">
                        {request.request_type}
                      </p>
                      <h2 className="mt-2 text-xl font-black text-ink">
                        {order?.order_number}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order?.customer_name || "Customer"} · {order?.customer_email}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-tint px-3 py-1.5 text-xs font-bold capitalize text-brand">
                      {request.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
                    <div>
                      <div className="rounded-2xl bg-secondary/60 p-4">
                        <p className="font-bold capitalize text-ink">
                          {request.reason_code.replaceAll("_", " ")}
                        </p>
                        {request.reason_text && (
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {request.reason_text}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        {(request.return_request_items ?? []).map((item) => {
                          const orderItem = Array.isArray(item.order_items)
                            ? item.order_items[0]
                            : item.order_items;
                          return (
                            <div
                              key={item.id}
                              className="flex flex-wrap justify-between gap-3 rounded-2xl border border-black/5 p-4"
                            >
                              <div>
                                <p className="font-bold text-ink">
                                  {orderItem?.product_name}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {orderItem?.sku} · Requested {item.quantity} · Received{" "}
                                  {item.received_quantity}
                                </p>
                              </div>
                              <p className="font-bold text-ink">
                                ${Number(orderItem?.unit_price ?? 0).toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <form
                        action={async (formData) => {
                          "use server";
                          await updateReturnRequest(
                            request.id,
                            String(formData.get("status") || "under_review"),
                            String(formData.get("notes") || ""),
                            String(formData.get("carrier") || ""),
                            String(formData.get("tracking") || "")
                          );
                        }}
                        className="rounded-2xl border border-black/5 p-4"
                      >
                        <p className="font-bold text-ink">Update request</p>
                        <select
                          name="status"
                          defaultValue={request.status}
                          className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                        >
                          <option value="under_review">Under review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="label_issued">Return label issued</option>
                          <option value="in_transit">Return in transit</option>
                          <option value="received">Received</option>
                          <option value="inspection_failed">Inspection failed</option>
                          <option value="exchange_processing">Exchange processing</option>
                          <option value="completed">Completed</option>
                        </select>
                        <input
                          name="carrier"
                          defaultValue={request.return_carrier || ""}
                          placeholder="Return carrier"
                          className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                        />
                        <input
                          name="tracking"
                          defaultValue={request.return_tracking_number || ""}
                          placeholder="Return tracking number"
                          className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                        />
                        <textarea
                          name="notes"
                          defaultValue={request.resolution_notes || ""}
                          placeholder="Internal resolution notes"
                          className="mt-3 min-h-24 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                        />
                        <button type="submit" className="cm-button-dark mt-3 w-full">
                          Save
                        </button>
                      </form>

                      {request.request_type === "exchange" &&
                        ["received", "exchange_processing"].includes(request.status) && (
                          <div className="rounded-2xl bg-ink p-4 text-white">
                            <p className="font-bold">Replacement order</p>

                            {request.replacement_order_id ? (
                              <div className="mt-3 space-y-2 text-sm text-white/65">
                                <p>Replacement order created.</p>
                                {Number(request.replacement_amount_due) > 0 && (
                                  <p>
                                    Customer payment due: $
                                    {Number(request.replacement_amount_due).toFixed(2)}
                                  </p>
                                )}
                                {Number(request.replacement_refund_due) > 0 && (
                                  <p>
                                    Customer refund: $
                                    {Number(request.replacement_refund_due).toFixed(2)}
                                  </p>
                                )}
                                {request.replacement_payment_url && (
                                  <a
                                    href={request.replacement_payment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex font-bold text-brand hover:underline"
                                  >
                                    Open payment link
                                  </a>
                                )}
                              </div>
                            ) : (
                              <form
                                action={async (formData) => {
                                  "use server";

                                  await createExchangeReplacement({
                                    requestId: request.id,
                                    replacementProductId: Number(
                                      formData.get("replacement_product_id")
                                    ),
                                    quantity: Number(formData.get("quantity")),
                                  });
                                }}
                                className="mt-3 space-y-3"
                              >
                                <select
                                  name="replacement_product_id"
                                  defaultValue={String(
                                    Array.isArray(request.return_request_items?.[0]?.order_items)
                                      ? request.return_request_items?.[0]?.order_items?.[0]?.product_id ?? ""
                                      : request.return_request_items?.[0]?.order_items?.product_id ?? ""
                                  )}
                                  className="w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                                  required
                                >
                                  <option value="">Choose replacement product</option>
                                  {(products ?? []).map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.sku} · {product.product_name} · $
                                      {Number(product.price).toFixed(2)}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  name="quantity"
                                  type="number"
                                  min={1}
                                  max={
                                    request.return_request_items?.[0]?.received_quantity ||
                                    request.return_request_items?.[0]?.quantity ||
                                    1
                                  }
                                  defaultValue={
                                    request.return_request_items?.[0]?.received_quantity ||
                                    request.return_request_items?.[0]?.quantity ||
                                    1
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                                  required
                                />

                                <p className="text-xs leading-5 text-white/50">
                                  Equal price: replacement proceeds automatically. Higher
                                  price: customer receives a Stripe payment link. Lower
                                  price: admin-only difference refund is issued before
                                  fulfillment.
                                </p>

                                <button type="submit" className="cm-button-primary w-full">
                                  Create replacement
                                </button>
                              </form>
                            )}
                          </div>
                        )}

                      {request.request_type === "return" &&
                        ["received", "refund_pending"].includes(request.status) && (
                          <form
                            action={async (formData) => {
                              "use server";
                              await issueReturnRefund(
                                request.id,
                                request.order_id,
                                Number(formData.get("amount")),
                                String(formData.get("reason") || "Approved customer return")
                              );
                            }}
                            className="rounded-2xl bg-ink p-4 text-white"
                          >
                            <p className="font-bold">Issue Stripe refund</p>
                            <p className="mt-1 text-xs leading-5 text-white/55">
                              Suggested item refund excludes tax and shipping. Review the
                              amount before submitting.
                            </p>
                            <input
                              name="amount"
                              type="number"
                              min="0.01"
                              step="0.01"
                              defaultValue={itemSubtotal.toFixed(2)}
                              className="mt-3 w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                              required
                            />
                            <input
                              name="reason"
                              defaultValue="Approved customer return"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                            />
                            <button type="submit" className="cm-button-primary mt-3 w-full">
                              Refund customer
                            </button>
                          </form>
                        )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
