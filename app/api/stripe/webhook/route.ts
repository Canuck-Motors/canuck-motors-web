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
      charge?: string | null;
      amount?: number | null;
      currency?: string | null;
      reason?: string | null;
      is_charge_refundable?: boolean | null;
      evidence_details?: { due_by?: number | null };
      payment_intent?: string | null;
      payment_status?: string | null;
      metadata?: Record<string, string>;
      client_reference_id?: string | null;
    };
  };
};

async function recordWebhookEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: StripeEvent
) {
  const { error } = await admin.from("webhook_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    payload: event,
    status: "processing",
  });

  if (!error) {
    return { shouldProcess: true };
  }

  if (
    error.code !== "23505" &&
    !error.message.toLowerCase().includes("duplicate")
  ) {
    throw new Error(`Unable to record Stripe webhook: ${error.message}`);
  }

  const { data: existing, error: existingError } = await admin
    .from("webhook_events")
    .select("status")
    .eq("provider", "stripe")
    .eq("provider_event_id", event.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.status === "processed" || existing?.status === "ignored") {
    return { shouldProcess: false };
  }

  await admin
    .from("webhook_events")
    .update({
      status: "processing",
      error_message: null,
    })
    .eq("provider", "stripe")
    .eq("provider_event_id", event.id);

  return { shouldProcess: true };
}

async function finishWebhookEvent(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  status: "processed" | "failed" | "ignored",
  errorMessage: string | null = null
) {
  await admin
    .from("webhook_events")
    .update({
      status,
      processed_on:
        status === "processed" || status === "ignored"
          ? new Date().toISOString()
          : null,
      error_message: errorMessage,
    })
    .eq("provider", "stripe")
    .eq("provider_event_id", eventId);
}

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

  try {
    const recorded = await recordWebhookEvent(admin, event);

    if (!recorded.shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

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
        const { data: order, error: orderError } = await admin
          .from("orders")
          .select("id, order_type")
          .eq("id", orderId)
          .maybeSingle();

        if (orderError) {
          throw new Error(orderError.message);
        }

        const paid =
          (event.type === "checkout.session.completed" &&
            object.payment_status === "paid") ||
          event.type === "checkout.session.async_payment_succeeded";

        const failed =
          event.type === "checkout.session.expired" ||
          event.type === "checkout.session.async_payment_failed";

        if (paid) {
          const rpcName =
            order?.order_type === "exchange_replacement"
              ? "finalize_exchange_replacement_payment"
              : "finalize_checkout_order";

          const { error } = await admin.rpc(rpcName, {
            p_order_id: orderId,
            p_checkout_session_id: object.id,
            p_payment_intent_id: object.payment_intent ?? null,
          });

          if (error) {
            throw new Error(error.message);
          }
        }

        if (failed) {
          const rpcName =
            order?.order_type === "exchange_replacement"
              ? "release_exchange_replacement"
              : "release_checkout_order";

          const { error } = await admin.rpc(rpcName, {
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
    } else if (
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
    } else if (
      event.type === "charge.dispute.created" ||
      event.type === "charge.dispute.updated" ||
      event.type === "charge.dispute.closed"
    ) {
      const dueBy = object.evidence_details?.due_by
        ? new Date(object.evidence_details.due_by * 1000).toISOString()
        : null;

      const { error } = await admin.rpc("upsert_stripe_dispute", {
        p_stripe_dispute_id: object.id,
        p_stripe_charge_id: object.charge ?? null,
        p_stripe_payment_intent_id: object.payment_intent ?? null,
        p_amount: Number(object.amount ?? 0) / 100,
        p_currency: object.currency ?? "cad",
        p_status: object.status ?? "unknown",
        p_reason: object.reason ?? null,
        p_evidence_due_by: dueBy,
        p_is_charge_refundable: object.is_charge_refundable ?? null,
        p_raw_payload: object,
      });

      if (error) {
        throw new Error(error.message);
      }
    } else {
      await finishWebhookEvent(admin, event.id, "ignored");
      return NextResponse.json({ received: true, ignored: true });
    }

    await finishWebhookEvent(admin, event.id, "processed");
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook processing failed";

    await finishWebhookEvent(admin, event.id, "failed", message);

    console.error("Stripe webhook processing failed:", message);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
