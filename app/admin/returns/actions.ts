"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeRefund } from "@/lib/stripe";

async function requireAuthenticatedStaff() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    throw new Error("You are not authorized to manage returns.");
  }

  return supabase;
}

export async function updateReturnRequest(
  requestId: string,
  status: string,
  notes: string,
  returnCarrier?: string,
  returnTrackingNumber?: string
) {
  const supabase = await requireAuthenticatedStaff();

  const { error } = await supabase.rpc("admin_update_return_request", {
    p_request_id: requestId,
    p_new_status: status,
    p_notes: notes || null,
    p_return_carrier: returnCarrier || null,
    p_return_tracking_number: returnTrackingNumber || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/returns");
}

export async function issueReturnRefund(
  requestId: string,
  orderId: string,
  amount: number,
  reason: string
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  const supabase = await requireAuthenticatedStaff();

  const { data: refundId, error: prepareError } = await supabase.rpc(
    "prepare_refund",
    {
      p_order_id: orderId,
      p_amount: amount,
      p_reason: reason || "Approved customer return",
      p_return_request_id: requestId,
    }
  );

  if (prepareError || !refundId) {
    throw new Error(prepareError?.message || "Unable to prepare refund.");
  }

  const admin = createAdminClient();

  const { data: refund, error: refundLoadError } = await admin
    .from("refunds")
    .select(
      "id, amount, idempotency_key, payments!inner(provider_payment_intent_id)"
    )
    .eq("id", refundId)
    .single();

  if (refundLoadError || !refund) {
    throw new Error("Unable to load refund payment information.");
  }

  const payment = Array.isArray(refund.payments)
    ? refund.payments[0]
    : refund.payments;

  if (!payment?.provider_payment_intent_id) {
    throw new Error("Stripe payment intent is unavailable.");
  }

  try {
    const stripeRefund = await createStripeRefund({
      paymentIntentId: payment.provider_payment_intent_id,
      amountCents: Math.round(Number(refund.amount) * 100),
      idempotencyKey: refund.idempotency_key,
    });

    const { error: finalizeError } = await admin.rpc("finalize_refund", {
      p_refund_id: refund.id,
      p_stripe_refund_id: stripeRefund.id,
      p_succeeded: true,
      p_failure_reason: null,
    });

    if (finalizeError) {
      throw new Error(finalizeError.message);
    }
  } catch (error) {
    await admin.rpc("finalize_refund", {
      p_refund_id: refund.id,
      p_stripe_refund_id: null,
      p_succeeded: false,
      p_failure_reason:
        error instanceof Error ? error.message : "Stripe refund failed",
    });
    throw error;
  }

  revalidatePath("/admin/returns");
  revalidatePath(`/account/orders/${orderId}`);
}
