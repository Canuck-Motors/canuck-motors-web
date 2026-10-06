import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStripeWebhookSignature } from "@/lib/stripe";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      payment_intent?: string | null;
      metadata?: Record<string, string>;
      client_reference_id?: string | null;
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  const admin = createAdminClient();
  const session = event.data.object;
  const orderId =
    session.metadata?.order_id || session.client_reference_id || null;

  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const { error } = await admin.rpc("finalize_checkout_order", {
      p_order_id: orderId,
      p_checkout_session_id: session.id,
      p_payment_intent_id: session.payment_intent ?? null,
    });

    if (error) {
      console.error("Failed to finalize checkout order:", error.message);
      return NextResponse.json(
        { error: "Order finalization failed" },
        { status: 500 }
      );
    }
  }

  if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const { error } = await admin.rpc("release_checkout_order", {
      p_order_id: orderId,
      p_reason:
        event.type === "checkout.session.expired"
          ? "Stripe checkout session expired"
          : "Stripe asynchronous payment failed",
    });

    if (error) {
      console.error("Failed to release checkout order:", error.message);
      return NextResponse.json(
        { error: "Order release failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
