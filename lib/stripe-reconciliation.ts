import { createAdminClient } from "@/lib/supabase/admin";
import {
  retrieveStripeDispute,
  retrieveStripePaymentIntent,
  retrieveStripeRefund,
} from "@/lib/stripe";

type ReconciliationIssue = {
  entity_type: "payment" | "refund" | "dispute";
  local_id: string;
  stripe_id: string | null;
  issue_code: string;
  local_value: string | null;
  stripe_value: string | null;
  details: string | null;
};

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<void>
) {
  let cursor = 0;

  async function next() {
    while (cursor < values.length) {
      const index = cursor++;
      await worker(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => next())
  );
}

export async function runStripeReconciliation(startedBy?: number | null) {
  const admin = createAdminClient();
  const rawLimit = Number(process.env.STRIPE_RECONCILIATION_LIMIT || 50);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(200, Math.max(1, Math.floor(rawLimit)))
    : 50;

  const { data: run, error: runError } = await admin
    .from("stripe_reconciliation_runs")
    .insert({
      started_by: startedBy ?? null,
      status: "running",
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message || "Unable to start reconciliation.");
  }

  const issues: ReconciliationIssue[] = [];
  let checkedPayments = 0;
  let checkedRefunds = 0;
  let checkedDisputes = 0;

  try {
    const [{ data: payments }, { data: refunds }, { data: disputes }] =
      await Promise.all([
        admin
          .from("payments")
          .select(
            "id, order_id, provider_payment_intent_id, provider_checkout_session_id, amount, currency, status, orders!inner(order_type)"
          )
          .not("provider_payment_intent_id", "is", null)
          .order("updated_on", { ascending: false })
          .limit(limit),
        admin
          .from("refunds")
          .select("id, order_id, stripe_refund_id, amount, currency, status")
          .not("stripe_refund_id", "is", null)
          .order("updated_on", { ascending: false })
          .limit(limit),
        admin
          .from("payment_disputes")
          .select(
            "id, stripe_dispute_id, stripe_payment_intent_id, amount, currency, status"
          )
          .order("updated_on", { ascending: false })
          .limit(limit),
      ]);

    await mapWithConcurrency(payments ?? [], 5, async (payment) => {
      checkedPayments++;

      if (!payment.provider_payment_intent_id) return;

      try {
        const stripe = await retrieveStripePaymentIntent(
          payment.provider_payment_intent_id
        );

        const localAmount = Number(payment.amount);
        const stripeAmount = Number(stripe.amount_received || stripe.amount) / 100;

        if (Math.abs(localAmount - stripeAmount) > 0.009) {
          issues.push({
            entity_type: "payment",
            local_id: payment.id,
            stripe_id: stripe.id,
            issue_code: "payment_amount_mismatch",
            local_value: localAmount.toFixed(2),
            stripe_value: stripeAmount.toFixed(2),
            details: "Local payment amount differs from Stripe.",
          });
        }

        if (stripe.status === "succeeded" && payment.status !== "succeeded") {
          const orderRelation = Array.isArray(payment.orders)
            ? payment.orders[0]
            : payment.orders;

          if (payment.provider_checkout_session_id) {
            const rpcName =
              orderRelation?.order_type === "exchange_replacement"
                ? "finalize_exchange_replacement_payment"
                : "finalize_checkout_order";

            const { error } = await admin.rpc(rpcName, {
              p_order_id: payment.order_id,
              p_checkout_session_id: payment.provider_checkout_session_id,
              p_payment_intent_id: stripe.id,
            });

            issues.push({
              entity_type: "payment",
              local_id: payment.id,
              stripe_id: stripe.id,
              issue_code: error
                ? "payment_repair_failed"
                : "payment_status_repaired",
              local_value: payment.status,
              stripe_value: stripe.status,
              details: error?.message || "Local order/payment was repaired from Stripe.",
            });
          } else {
            issues.push({
              entity_type: "payment",
              local_id: payment.id,
              stripe_id: stripe.id,
              issue_code: "missing_checkout_session_for_repair",
              local_value: payment.status,
              stripe_value: stripe.status,
              details: "Stripe succeeded but local payment has no checkout session ID.",
            });
          }
        } else if (
          payment.status === "succeeded" &&
          stripe.status !== "succeeded"
        ) {
          issues.push({
            entity_type: "payment",
            local_id: payment.id,
            stripe_id: stripe.id,
            issue_code: "stripe_payment_not_succeeded",
            local_value: payment.status,
            stripe_value: stripe.status,
            details: "Local payment is succeeded but Stripe reports a different state.",
          });
        }
      } catch (error) {
        issues.push({
          entity_type: "payment",
          local_id: payment.id,
          stripe_id: payment.provider_payment_intent_id,
          issue_code: "payment_lookup_failed",
          local_value: payment.status,
          stripe_value: null,
          details: error instanceof Error ? error.message : "Stripe lookup failed.",
        });
      }
    });

    await mapWithConcurrency(refunds ?? [], 5, async (refund) => {
      checkedRefunds++;
      if (!refund.stripe_refund_id) return;

      try {
        const stripe = await retrieveStripeRefund(refund.stripe_refund_id);
        const stripeAmount = Number(stripe.amount) / 100;
        const localAmount = Number(refund.amount);

        if (Math.abs(localAmount - stripeAmount) > 0.009) {
          issues.push({
            entity_type: "refund",
            local_id: refund.id,
            stripe_id: stripe.id,
            issue_code: "refund_amount_mismatch",
            local_value: localAmount.toFixed(2),
            stripe_value: stripeAmount.toFixed(2),
            details: "Local refund amount differs from Stripe.",
          });
        }

        if (stripe.status === "succeeded" && refund.status !== "succeeded") {
          const { error } = await admin.rpc("finalize_refund", {
            p_refund_id: refund.id,
            p_stripe_refund_id: stripe.id,
            p_succeeded: true,
            p_failure_reason: null,
          });

          issues.push({
            entity_type: "refund",
            local_id: refund.id,
            stripe_id: stripe.id,
            issue_code: error ? "refund_repair_failed" : "refund_status_repaired",
            local_value: refund.status,
            stripe_value: stripe.status,
            details: error?.message || "Local refund was repaired from Stripe.",
          });
        } else if (
          refund.status === "succeeded" &&
          stripe.status !== "succeeded"
        ) {
          issues.push({
            entity_type: "refund",
            local_id: refund.id,
            stripe_id: stripe.id,
            issue_code: "stripe_refund_not_succeeded",
            local_value: refund.status,
            stripe_value: stripe.status,
            details: "Local refund is succeeded but Stripe reports another state.",
          });
        }
      } catch (error) {
        issues.push({
          entity_type: "refund",
          local_id: refund.id,
          stripe_id: refund.stripe_refund_id,
          issue_code: "refund_lookup_failed",
          local_value: refund.status,
          stripe_value: null,
          details: error instanceof Error ? error.message : "Stripe lookup failed.",
        });
      }
    });

    await mapWithConcurrency(disputes ?? [], 5, async (dispute) => {
      checkedDisputes++;

      try {
        const stripe = await retrieveStripeDispute(dispute.stripe_dispute_id);

        if (stripe.status !== dispute.status) {
          const dueBy = stripe.evidence_details?.due_by
            ? new Date(stripe.evidence_details.due_by * 1000).toISOString()
            : null;

          const { error } = await admin.rpc("upsert_stripe_dispute", {
            p_stripe_dispute_id: stripe.id,
            p_stripe_charge_id: stripe.charge ?? null,
            p_stripe_payment_intent_id:
              stripe.payment_intent ?? dispute.stripe_payment_intent_id ?? null,
            p_amount: Number(stripe.amount) / 100,
            p_currency: stripe.currency,
            p_status: stripe.status,
            p_reason: stripe.reason ?? null,
            p_evidence_due_by: dueBy,
            p_is_charge_refundable: stripe.is_charge_refundable ?? null,
            p_raw_payload: stripe,
          });

          issues.push({
            entity_type: "dispute",
            local_id: dispute.id,
            stripe_id: stripe.id,
            issue_code: error
              ? "dispute_repair_failed"
              : "dispute_status_repaired",
            local_value: dispute.status,
            stripe_value: stripe.status,
            details: error?.message || "Local dispute state was repaired from Stripe.",
          });
        }
      } catch (error) {
        issues.push({
          entity_type: "dispute",
          local_id: dispute.id,
          stripe_id: dispute.stripe_dispute_id,
          issue_code: "dispute_lookup_failed",
          local_value: dispute.status,
          stripe_value: null,
          details: error instanceof Error ? error.message : "Stripe lookup failed.",
        });
      }
    });

    if (issues.length > 0) {
      const { error: issueError } = await admin
        .from("stripe_reconciliation_issues")
        .insert(
          issues.map((issue) => ({
            run_id: run.id,
            ...issue,
          }))
        );

      if (issueError) {
        throw new Error(issueError.message);
      }
    }

    await admin
      .from("stripe_reconciliation_runs")
      .update({
        status: issues.length > 0 ? "completed_with_issues" : "completed",
        checked_payments: checkedPayments,
        checked_refunds: checkedRefunds,
        checked_disputes: checkedDisputes,
        issue_count: issues.length,
        completed_on: new Date().toISOString(),
      })
      .eq("id", run.id);

    return {
      runId: run.id,
      checkedPayments,
      checkedRefunds,
      checkedDisputes,
      issueCount: issues.length,
    };
  } catch (error) {
    await admin
      .from("stripe_reconciliation_runs")
      .update({
        status: "failed",
        checked_payments: checkedPayments,
        checked_refunds: checkedRefunds,
        checked_disputes: checkedDisputes,
        issue_count: issues.length,
        error_message:
          error instanceof Error ? error.message : "Reconciliation failed.",
        completed_on: new Date().toISOString(),
      })
      .eq("id", run.id);

    throw error;
  }
}
