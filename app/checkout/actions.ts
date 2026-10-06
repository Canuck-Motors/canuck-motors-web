"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeCheckoutSession } from "@/lib/stripe";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export async function beginCheckout() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    redirect("/login");
  }

  const { data: prepared, error: prepareError } = await supabase.rpc(
    "prepare_checkout_order"
  );

  if (prepareError || !prepared?.[0]) {
    const message = prepareError?.message || "Unable to prepare checkout.";
    redirect(`/cart?checkout_error=${encodeURIComponent(message)}`);
  }

  const order = prepared[0] as {
    order_id: string;
    order_number: string;
  };

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, customer_email, total_amount, currency")
    .eq("id", order.order_id)
    .single();

  if (orderError || !orderRow) {
    redirect("/cart?checkout_error=Order%20could%20not%20be%20loaded");
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name, sku, unit_price, quantity")
    .eq("order_id", order.order_id)
    .order("id");

  if (itemsError || !items?.length) {
    redirect("/cart?checkout_error=Order%20items%20could%20not%20be%20loaded");
  }

  const admin = createAdminClient();

  try {
    const session = await createStripeCheckoutSession({
      orderId: orderRow.id,
      orderNumber: orderRow.order_number,
      customerEmail: orderRow.customer_email,
      successUrl: `${getSiteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${getSiteUrl()}/cart?checkout_cancelled=1`,
      items: items.map((item) => ({
        name: item.product_name,
        sku: item.sku,
        unitAmountCents: Math.round(Number(item.unit_price) * 100),
        quantity: item.quantity,
      })),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    const { error: paymentError } = await admin.from("payments").upsert(
      {
        order_id: orderRow.id,
        provider: "stripe",
        provider_checkout_session_id: session.id,
        provider_payment_intent_id: session.payment_intent ?? null,
        amount: orderRow.total_amount,
        currency: orderRow.currency,
        status: "pending",
        updated_on: new Date().toISOString(),
      },
      { onConflict: "provider_checkout_session_id" }
    );

    if (paymentError) {
      throw new Error("Unable to record the pending payment.");
    }

    redirect(session.url);
  } catch (error) {
    await admin.rpc("release_checkout_order", {
      p_order_id: orderRow.id,
      p_reason: "Stripe checkout session could not be created",
    });

    const message =
      error instanceof Error ? error.message : "Unable to start checkout.";

    redirect(`/cart?checkout_error=${encodeURIComponent(message)}`);
  }
}
