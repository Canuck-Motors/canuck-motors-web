"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeRefund } from "@/lib/stripe";

export async function requestCancellation(orderId: string, reason: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { data: result, error } = await supabase.rpc("request_order_cancellation", {
    p_order_id: orderId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (result === "refund_required") {
    const admin = createAdminClient();

    const { data: prepared, error: prepareError } = await admin.rpc(
      "prepare_customer_cancellation_refund",
      { p_order_id: orderId }
    );

    if (prepareError) {
      throw new Error(prepareError.message);
    }

    const refund = prepared?.[0];

    if (refund) {
      try {
        const stripeRefund = await createStripeRefund({
          paymentIntentId: refund.payment_intent_id,
          amountCents: Math.round(Number(refund.amount) * 100),
          idempotencyKey: refund.idempotency_key,
        });

        const { error: finalizeError } = await admin.rpc("finalize_refund", {
          p_refund_id: refund.refund_id,
          p_stripe_refund_id: stripeRefund.id,
          p_succeeded: true,
          p_failure_reason: null,
        });

        if (finalizeError) {
          throw new Error(finalizeError.message);
        }
      } catch (refundError) {
        await admin.rpc("finalize_refund", {
          p_refund_id: refund.refund_id,
          p_stripe_refund_id: null,
          p_succeeded: false,
          p_failure_reason:
            refundError instanceof Error ? refundError.message : "Refund failed",
        });
        throw refundError;
      }
    }
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
}

export async function requestReturnOrExchange(input: {
  orderId: string;
  requestType: "return" | "exchange";
  reasonCode: string;
  reasonText: string;
  items: Array<{
    order_item_id: number;
    quantity: number;
    replacement_product_id?: number | null;
  }>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_return_request", {
    p_order_id: input.orderId,
    p_request_type: input.requestType,
    p_reason_code: input.reasonCode,
    p_reason_text: input.reasonText,
    p_items: input.items,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/account/orders/${input.orderId}`);
  revalidatePath("/account/orders");
}
