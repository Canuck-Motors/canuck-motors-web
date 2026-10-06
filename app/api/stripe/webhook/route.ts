import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStripeWebhookSignature } from "@/lib/stripe";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      status?: string | null;
      payment_intent?: string | null;
      payment_status?: string | null;
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

  const { error: insertEventError } = await admin
    .from("webhook_events")
    .insert({
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      payload: event,
      status: "processing",
    });

  if (insertEventError) {
    if (
      insertEventError.code === "23505" ||
      insertEventError.message.toLowerCase().includes("duplicate")
    ) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.error("Unable to record Stripe webhook:", insertEventError.message);
    return NextResponse.json(
      { error: "Unable to record webhook" },
      { status: 500 }
    );
  }

  try {
    const object = event.data.object;

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded" ||
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const orderId =
        object.metadata?.order_id || object.client_reference_id || null;

      if (orderId) {
        if (
          (event.type === "checkout.session.completed" &&
            object.payment_status === "paid") ||
          event.type === "checkout.session.async_payment_succeeded"
        ) {
          const { error } = await admin.rpc("finalize_checkout_order", {
            p_order_id: orderId,
            p_checkout_session_id: object.id,
            p_payment_intent_id: object.payment_intent ?? null,
          });

          if (error) {
            throw new Error(error.message);
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
            throw new Error(error.message);
          }
        }
      }
    }

    if (
      event.type === "refund.updated" ||
      event.type === "refund.failed"
    ) {
      const refundId = object.metadata?.refund_id;

      if (refundId) {
        const succeeded = object.status === "succeeded";

        const { error } = await admin.rpc("finalize_refund", {
          p_refund_id: refundId,
          p_stripe_refund_id: object.id,
          p_succeeded: succeeded,
          p_failure_reason:
            succeeded
              ? null
              : `Stripe refund status: ${object.status || "failed"}`,
        });

        if (error) {
          throw new Error(error.message);
        }
      }
    }

    await admin
      .from("webhook_events")
      .update({
        status: "processed",
        processed_on: new Date().toISOString(),
        error_message: null,
      })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook processing failed";

    await admin
      .from("webhook_events")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);

    console.error("Stripe webhook processing failed:", message);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
