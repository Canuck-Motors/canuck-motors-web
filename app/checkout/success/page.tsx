import type { Metadata } from "next";
import { recordStripeTax } from "@/lib/stripe-tax";
import { grandTotal, storedTaxLines } from "@/lib/order-totals";
import { sendOrderConfirmation } from "@/lib/order-confirmation";
import UberTracking from "@/components/uber/UberTracking";
import { bookUberForOrder } from "@/lib/uber-booking";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retrieveStripeCheckoutSession } from "@/lib/stripe";
import SuccessBadge from "@/components/checkout/SuccessBadge";
import AutoRefresh from "@/components/checkout/AutoRefresh";
import { Clock } from "lucide-react";

export const instant = false;

export const metadata: Metadata = {
  title: "Order Confirmation",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect("/");
  }

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
    redirect("/");
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("order_id, status")
    .eq("provider_checkout_session_id", sessionId)
    .maybeSingle();

  // Do not depend on the webhook alone: ask Stripe directly whether this session was paid.
  // Safe: we only act when Stripe itself says "paid" for this exact session and order.
  if (payment?.order_id && payment.status !== "succeeded") {
    try {
      const admin = createAdminClient();
      const { data: current } = await supabase
        .from("orders")
        .select("id, payment_status, total_amount, currency, delivery_method, delivery_fee, uber_dropoff, ship_to")
        .eq("id", payment.order_id)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (current && current.payment_status !== "paid") {
        const session = await retrieveStripeCheckoutSession(sessionId);
        const sameOrder =
          (session.metadata?.order_id || session.client_reference_id) === current.id;

        const amountMatches =
          Number(session.amount_total) ===
          Math.round(Number(current.total_amount) * 100) +
          Math.round(Number(current.delivery_fee ?? 0) * 100) +
          Number(session.total_details?.amount_tax ?? 0); // tax is added by Stripe Tax
        const currencyMatches =
          String(session.currency || "").toLowerCase() ===
          String(current.currency || "CAD").toLowerCase();

        if (
          sameOrder &&
          session.payment_status === "paid" &&
          amountMatches &&
          currencyMatches
        ) {
          const { data: orderMeta } = await admin
            .from("orders")
            .select("order_type")
            .eq("id", current.id)
            .maybeSingle();

          const { error: finalizeError } = await admin.rpc(
            orderMeta?.order_type === "exchange_replacement"
              ? "finalize_exchange_replacement_payment"
              : "finalize_checkout_order",
            {
              p_order_id: current.id,
              p_checkout_session_id: session.id,
              p_payment_intent_id: session.payment_intent ?? null,
            }
          );

          if (!finalizeError) {
            const addr = (
              name: string | null | undefined,
              a: Record<string, string | null> | null | undefined
            ) =>
              a
                ? {
                    name: name ?? null,
                    line1: a.line1 ?? null,
                    line2: a.line2 ?? null,
                    city: a.city ?? null,
                    province: a.state ?? null,
                    postal_code: a.postal_code ?? null,
                    country: a.country ?? null,
                  }
                : {};

            const shipTo = session.collected_information?.shipping_details ?? session.shipping_details;
            const uberDrop = current.uber_dropoff as
              | { name?: string; street?: string; city?: string; state?: string; zip?: string }
              | null;
            const isUber = current.delivery_method === "uber" && !!uberDrop?.street;
            // Standard shipping: the address was chosen in the cart and saved on the order.
            const std = (current as { ship_to?: Record<string, string> | null }).ship_to;
            const isStd = current.delivery_method === "standard" && !!std?.line1;
            await admin
              .from("orders")
              .update({
                shipping_address: isUber
                  ? {
                      name: uberDrop?.name ?? null,
                      line1: uberDrop?.street ?? null,
                      line2: null,
                      city: uberDrop?.city ?? null,
                      province: uberDrop?.state ?? null,
                      postal_code: uberDrop?.zip ?? null,
                      country: "CA",
                    }
                  : isStd
                    ? {
                        name: std?.name ?? null,
                        line1: std?.line1 ?? null,
                        line2: std?.line2 || null,
                        city: std?.city ?? null,
                        province: std?.province ?? null,
                        postal_code: std?.postal_code ?? null,
                        country: "CA",
                      }
                    : addr(shipTo?.name, shipTo?.address),
                billing_address: addr(session.customer_details?.name, session.customer_details?.address),
                customer_name:
                  session.customer_details?.name ?? shipTo?.name ?? undefined,
                customer_email: session.customer_details?.email ?? undefined,
              })
              .eq("id", current.id);

            await recordStripeTax(admin, current.id, session.id, Number(session.amount_total ?? 0));
            await sendOrderConfirmation(current.id);

            if (current.delivery_method === "uber") {
              try {
                await bookUberForOrder(current.id);
              } catch (uberError) {
                console.error("[uber] Booking failed for order", current.id, uberError);
              }
            }
          } else {
            console.error("Success-page payment sync failed:", finalizeError.message);
          }
        }
      }
    } catch (error) {
      console.error("Success-page payment sync failed:", error);
    }
  }

  let order:
    | {
        id: string;
        order_number: string;
        status: string;
        payment_status: string;
        total_amount: number;
        currency: string;
        delivery_method?: string | null;
        delivery_fee?: number | null;
        sales_tax?: number | null;
        tax_lines?: unknown;
        order_items?: { product_name: string; sku: string; quantity: number; unit_price: number }[] | null;
      }
    | null = null;

  if (payment?.order_id) {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, total_amount, delivery_fee, sales_tax, tax_lines, currency, delivery_method, order_items(product_name, sku, quantity, unit_price)"
      )
      .eq("id", payment.order_id)
      .eq("user_id", profile.id)
      .maybeSingle();

    order = data;
  }

  const paid = order?.payment_status === "paid";
  const failed = order?.payment_status === "failed";
  const nice = (v: string) => v.replace(/_/g, " ");
  const items = order?.order_items ?? [];

  return (
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {paid && order?.delivery_method === "uber" && <UberTracking orderId={order.id} />}
        <div className="mt-8 rounded-3xl border bg-white p-8 text-center md:p-12">
          {paid ? (
            <SuccessBadge />
          ) : (
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                failed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              <Clock className="h-8 w-8" aria-hidden="true" />
            </div>
          )}

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            {paid ? "Thank you" : "Checkout"}
          </p>

          <h1 className="mt-3 text-3xl font-bold text-ink md:text-5xl">
            {paid ? "Order confirmed" : failed ? "Payment did not go through" : "Confirming your payment…"}
          </h1>

          <p className="mt-4 leading-7 text-muted-foreground">
            {paid
              ? "Thanks for shopping with Canuck Motors. We are getting your order ready to ship."
              : failed
                ? "Your card was not charged. Please go back to your cart and try again."
                : "Stripe has sent you back to us. We are waiting for the bank to confirm your payment. This usually takes a few seconds."}
          </p>

          {!paid && !failed && <AutoRefresh />}

          {order && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl bg-secondary p-5 text-left">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Order number</dt>
                  <dd className="font-semibold text-ink">{order.order_number}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Order status</dt>
                  <dd className="font-semibold capitalize text-ink">{nice(order.status)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd className="font-semibold capitalize text-ink">
                    {order.payment_status === "pending" ? "Waiting for confirmation" : nice(order.payment_status)}
                  </dd>
                </div>
                {items.length > 0 && (
                  <div className="space-y-2 border-t border-black/10 pt-3">
                    {items.map((item) => (
                      <div key={item.sku} className="flex justify-between gap-4">
                        <dt className="text-ink">
                          {item.product_name}
                          <span className="block text-xs text-muted-foreground">
                            {item.sku} × {item.quantity}
                          </span>
                        </dt>
                        <dd className="font-semibold text-ink">
                          ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </dd>
                      </div>
                    ))}
                  </div>
                )}
                {Number(order.delivery_fee ?? 0) > 0 && (
                  <div className="flex justify-between gap-4 border-t border-black/10 pt-3">
                    <dt className="text-ink">{order.delivery_method === "uber" ? "Uber same-day delivery" : "Standard shipping"}</dt>
                    <dd className="font-semibold text-ink">${Number(order.delivery_fee).toFixed(2)}</dd>
                  </div>
                )}
                {storedTaxLines(order.tax_lines).map((t) => (
                  <div key={t.name} className="flex justify-between gap-4">
                    <dt className="text-ink">{t.name}</dt>
                    <dd className="font-semibold text-ink">${(Number(t.cents) / 100).toFixed(2)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-black/10 pt-3 text-base">
                  <dt className="font-semibold text-ink">Total</dt>
                  <dd className="font-black text-ink">
                    ${grandTotal(order).toFixed(2)} {order.currency}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {order ? (
              <Link
                href={`/account/orders/${order.id}`}
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white"
              >
                View my order
              </Link>
            ) : (
              <Link
                href="/account/orders"
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white"
              >
                My orders
              </Link>
            )}
            <Link
              href="/"
              className="rounded-full border bg-white px-6 py-3 text-sm font-semibold text-ink"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
