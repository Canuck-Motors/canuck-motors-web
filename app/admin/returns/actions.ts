"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { processNotificationOutbox } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeAmountCheckoutSession, createStripeRefund } from "@/lib/stripe";
import { createAmazonMcfReturn, syncAmazonMcfReturn } from "@/lib/amazon-mcf-returns";
import { formatReturnAddress, saveReturnLabelSnapshot } from "@/lib/return-label";

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


async function logActivity(requestId: string, action: string, detail: string) {
  try {
    const supabase = await createClient();
    await supabase.rpc("admin_log_return_activity", {
      p_request_id: requestId,
      p_action: action,
      p_detail: detail,
    });
  } catch {
    // history is optional (database/admin_returns_extras.sql)
  }
}

// Queue an email to the customer (sent by the notification worker; needs RESEND_API_KEY).
async function queueReturnEmail(
  requestId: string,
  eventType: "return_update" | "return_instructions",
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("return_requests")
      .select("user_id, order_id, orders!order_id(customer_email, order_number), return_request_items(quantity, order_items!inner(product_name, sku))")
      .eq("id", requestId)
      .maybeSingle();
    const order = Array.isArray(row?.orders) ? row?.orders[0] : row?.orders;
    const email = (order as { customer_email?: string } | undefined)?.customer_email;
    if (!row || !email) return false;

    const { error } = await admin.from("notification_outbox").insert({
      order_id: row.order_id,
      user_id: row.user_id ?? null,
      channel: "email",
      event_type: eventType,
      recipient: email,
      template_key: eventType,
      payload: {
        ...payload,
        order_number: (order as { order_number?: string } | undefined)?.order_number ?? "",
        return_items: ((row.return_request_items ?? []) as Array<{
          quantity?: number;
          order_items?: { product_name?: string; sku?: string } | { product_name?: string; sku?: string }[];
        }>).map((entry) => {
          const item = Array.isArray(entry.order_items) ? entry.order_items[0] : entry.order_items;
          return {
            quantity: Number(entry.quantity ?? 1),
            name: String(item?.product_name ?? item?.sku ?? "Item"),
            sku: String(item?.sku ?? ""),
          };
        }),
      },
    });
    if (error) {
      console.error("[returns] could not queue email:", error.message);
      return false;
    }
    // Send right away instead of waiting for the scheduled job (which does not run locally).
    try {
      const r = await processNotificationOutbox(10);
      console.log("[returns] email flush:", JSON.stringify(r));
    } catch (e) {
      console.error("[returns] could not send queued email now:", e);
    }
    return true;
  } catch {
    return false;
  }
}

export async function updateReturnRequest(
  requestId: string,
  status: string,
  notes: string,
  returnCarrier?: string,
  returnTrackingNumber?: string,
  email?: { notify: boolean; message: string }
) {
  const supabase = await requireAuthenticatedStaff();

  if (status === "rejected" && !notes.trim()) {
    throw new Error("A reason is required when rejecting a return.");
  }

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

  let emailed = false;
  let labelEmailed = false;

  // Approving a return (not an Amazon MCF one, which uses Amazon's RMA): save the label with the return
  // and send it in the approval email, so the customer and the admin get exactly the same label.
  if (status === "approved") {
    const admin = createAdminClient();
    const { data: req } = await admin
      .from("return_requests")
      .select("fulfillment_provider, amazon_rma_id")
      .eq("id", requestId)
      .maybeSingle();
    const usesLabel = !req?.amazon_rma_id;
    if (usesLabel) {
      const label = await saveReturnLabelSnapshot(requestId);
      if (!label) console.error("[returns] could not build label for", requestId);
      if (label && email?.notify) {
        labelEmailed = await queueReturnEmail(requestId, "return_instructions", {
          message:
            email.message ||
            "Your return has been approved. Your return label is attached to this email as a PDF. Print it, attach it flat to the outside of the box and send the part back with any carrier. Return postage is not included.",
          return_address: formatReturnAddress(),
          return_label_url: `${getSiteUrl()}/account/returns/${encodeURIComponent(requestId)}/label`,
          return_label_request_id: requestId,
        });
        emailed = labelEmailed;
      }
    }
  }

  if (email?.notify && !labelEmailed) {
    emailed = await queueReturnEmail(requestId, "return_update", {
      status,
      message: email.message,
      carrier: returnCarrier || "",
      tracking: returnTrackingNumber || "",
    });
  }

  await logActivity(
    requestId,
    "status",
    `Status set to ${status.replaceAll("_", " ")}${returnTrackingNumber ? `, tracking ${returnTrackingNumber}` : ""}${notes ? ", note saved" : ""}${labelEmailed ? ", return label saved and emailed" : emailed ? ", customer emailed" : ""}`
  );
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
      refundId: refund.id,
      orderId,
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

  await logActivity(requestId, "refund", `Refund of $${amount.toFixed(2)} issued`);
  revalidatePath("/admin/returns");
  revalidatePath(`/account/orders/${orderId}`);
}


function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export async function createExchangeReplacement(input: {
  requestId: string;
  replacementProductId: number;
  quantity: number;
}) {
  if (!Number.isInteger(input.replacementProductId) || input.replacementProductId <= 0) {
    throw new Error("Choose a valid replacement product.");
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("Exchange quantity must be a positive whole number.");
  }

  const supabase = await requireAuthenticatedStaff();

  const { data: prepared, error: prepareError } = await supabase.rpc(
    "prepare_exchange_replacement",
    {
      p_request_id: input.requestId,
      p_replacement_product_id: input.replacementProductId,
      p_quantity: input.quantity,
    }
  );

  if (prepareError || !prepared?.[0]) {
    throw new Error(
      prepareError?.message || "Unable to prepare replacement order."
    );
  }

  const preparedRow = prepared[0] as {
    replacement_order_id: string;
    amount_due: number | string;
    refund_due: number | string;
    currency: string;
    original_order_id: string;
    original_payment_intent_id: string | null;
    refund_id: string | null;
    refund_idempotency_key: string | null;
    replacement_sku: string;
    replacement_name: string;
  };

  const admin = createAdminClient();
  const amountDue = Number(preparedRow.amount_due);
  const refundDue = Number(preparedRow.refund_due);

  let exchangeDifferenceRefundCompleted = false;

  try {
    if (refundDue > 0) {
      if (
        !preparedRow.original_payment_intent_id ||
        !preparedRow.refund_id ||
        !preparedRow.refund_idempotency_key
      ) {
        throw new Error("Original Stripe payment information is unavailable.");
      }

      const stripeRefund = await createStripeRefund({
        paymentIntentId: preparedRow.original_payment_intent_id,
        amountCents: Math.round(refundDue * 100),
        idempotencyKey: preparedRow.refund_idempotency_key,
        refundId: preparedRow.refund_id,
        orderId: preparedRow.original_order_id,
      });

      const { error: finalizeError } = await admin.rpc("finalize_refund", {
        p_refund_id: preparedRow.refund_id,
        p_stripe_refund_id: stripeRefund.id,
        p_succeeded: true,
        p_failure_reason: null,
      });

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      await supabase.rpc("mark_exchange_price_difference_refund", {
        p_request_id: input.requestId,
        p_refund_due: refundDue,
      });

      exchangeDifferenceRefundCompleted = true;

      if (amountDue === 0) {
        const { error: exchangeFinalizeError } = await admin.rpc(
          "finalize_exchange_replacement_no_charge",
          { p_order_id: preparedRow.replacement_order_id }
        );

        if (exchangeFinalizeError) {
          throw new Error(exchangeFinalizeError.message);
        }
      }
    }

    if (amountDue > 0) {
      const { data: replacementOrder, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, customer_email, currency")
        .eq("id", preparedRow.replacement_order_id)
        .single();

      if (orderError || !replacementOrder) {
        throw new Error("Replacement order could not be loaded.");
      }

      const session = await createStripeAmountCheckoutSession({
        orderId: replacementOrder.id,
        orderNumber: replacementOrder.order_number,
        customerEmail: replacementOrder.customer_email,
        successUrl: `${getSiteUrl()}/account/orders/${preparedRow.original_order_id}?exchange_paid=1`,
        cancelUrl: `${getSiteUrl()}/account/orders/${preparedRow.original_order_id}?exchange_payment_cancelled=1`,
        label: `Exchange price difference - ${preparedRow.replacement_name}`,
        amountCents: Math.round(amountDue * 100),
        metadata: {
          return_request_id: input.requestId,
          original_order_id: preparedRow.original_order_id,
        },
      });

      if (!session.url) {
        throw new Error("Stripe did not return an exchange checkout URL.");
      }

      const { error: paymentError } = await admin.from("payments").upsert(
        {
          order_id: replacementOrder.id,
          provider: "stripe",
          provider_checkout_session_id: session.id,
          provider_payment_intent_id: session.payment_intent ?? null,
          amount: amountDue,
          currency: replacementOrder.currency,
          status: "pending",
          updated_on: new Date().toISOString(),
        },
        { onConflict: "provider_checkout_session_id" }
      );

      if (paymentError) {
        throw new Error("Unable to record exchange payment session.");
      }

      const { error: attachError } = await supabase.rpc("attach_exchange_checkout", {
        p_request_id: input.requestId,
        p_checkout_session_id: session.id,
        p_checkout_url: session.url,
        p_amount_due: amountDue,
      });

      if (attachError) {
        throw new Error(attachError.message);
      }

      const { data: requestRow } = await admin
        .from("return_requests")
        .select("user_id")
        .eq("id", input.requestId)
        .single();

      if (requestRow?.user_id) {
        const { data: user } = await admin
          .from("users")
          .select("email_id, phone_number, whatsapp_opt_in")
          .eq("id", requestRow.user_id)
          .single();

        if (user?.email_id) {
          await admin.from("notification_outbox").insert({
            order_id: preparedRow.original_order_id,
            user_id: requestRow.user_id,
            channel: "email",
            event_type: "exchange_payment_required",
            recipient: user.email_id,
            template_key: "exchange_payment_required",
            payload: {
              payment_url: session.url,
              amount_due: amountDue,
              currency: replacementOrder.currency,
              replacement_sku: preparedRow.replacement_sku,
            },
          });
        }

        if (user?.whatsapp_opt_in && user.phone_number) {
          await admin.from("notification_outbox").insert({
            order_id: preparedRow.original_order_id,
            user_id: requestRow.user_id,
            channel: "whatsapp",
            event_type: "exchange_payment_required",
            recipient: user.phone_number,
            template_key: "exchange_payment_required",
            payload: {
              payment_url: session.url,
              amount_due: amountDue,
              currency: replacementOrder.currency,
              replacement_sku: preparedRow.replacement_sku,
            },
          });
        }
      }
    }
  } catch (error) {
    if (!exchangeDifferenceRefundCompleted) {
      await admin.rpc("release_exchange_replacement", {
        p_order_id: preparedRow.replacement_order_id,
        p_reason: "Exchange replacement setup failed",
      });
    } else {
      await admin
        .from("orders")
        .update({
          status: "exception",
          updated_on: new Date().toISOString(),
        })
        .eq("id", preparedRow.replacement_order_id);
    }

    throw error;
  }

  await logActivity(input.requestId, "exchange", "Replacement order created");
  revalidatePath("/admin/returns");
  revalidatePath(`/account/orders/${preparedRow.original_order_id}`);
}


// Put received items back into stock (or record that they are damaged and not restocked).
export async function handleReturnStock(requestId: string, restock: boolean) {
  const supabase = await requireAuthenticatedStaff();

  const { data: itemCount, error } = await supabase.rpc("admin_handle_return_stock", {
    p_request_id: requestId,
    p_restock: restock,
  });

  if (error) {
    throw new Error(
      /admin_handle_return_stock|schema cache/.test(error.message)
        ? "The return stock handler is not installed in the database."
        : /return_stock_already_handled/.test(error.message)
          ? "Stock for this return was already handled."
          : error.message
    );
  }

  await logActivity(
    requestId,
    "restock",
    restock
      ? `Returned items added back to stock (${Number(itemCount ?? 0)} line item${Number(itemCount ?? 0) === 1 ? "" : "s"})`
      : "Marked damaged - not restocked"
  );

  revalidatePath("/admin/returns");
  revalidatePath("/admin/inventory");
}

export async function completeReturnInspection(
  requestId: string,
  outcome: "restock" | "damaged",
  requestType: string
) {
  await handleReturnStock(requestId, outcome === "restock");

  const nextStatus = requestType === "exchange" ? "exchange_processing" : "refund_pending";
  const message =
    outcome === "restock"
      ? requestType === "exchange"
        ? "Inspection completed successfully. The returned item was accepted and added back to inventory. Your replacement is now being prepared."
        : "Inspection completed successfully. The returned item was accepted and added back to inventory. Your refund is now being prepared."
      : requestType === "exchange"
        ? "Inspection completed successfully. The returned item was accepted but will not be restocked because it is damaged or not sellable. Your replacement is now being prepared."
        : "Inspection completed successfully. The returned item was accepted but will not be restocked because it is damaged or not sellable. Your refund is now being prepared.";

  await updateReturnRequest(
    requestId,
    nextStatus,
    message,
    "",
    "",
    { notify: true, message }
  );

  await logActivity(
    requestId,
    "inspection",
    outcome === "restock"
      ? "Inspection passed - item restocked"
      : "Inspection passed - item accepted as damaged / not restocked"
  );
}

export async function rejectAfterFailedInspection(
  requestId: string,
  reason: string
) {
  const why = reason.trim();
  if (!why) {
    throw new Error("Please enter the inspection failure reason.");
  }

  const customerMessage =
    `Inspection failed: ${why}. The return has been declined. No refund or replacement will be issued. The original item will need to be returned to you; our team will arrange the outbound return shipment separately.`;

  await updateReturnRequest(
    requestId,
    "rejected",
    customerMessage,
    "",
    "",
    { notify: true, message: customerMessage }
  );

  await logActivity(
    requestId,
    "inspection_resolution",
    "Failed inspection resolved as rejected - original item to be returned to customer"
  );
}


export async function sendReturnInstructions(requestId: string, message = "") {
  await requireAuthenticatedStaff();

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("return_requests")
    .select("id, amazon_rma_id, amazon_rma_page_url")
    .eq("id", requestId)
    .maybeSingle();

  const hasAmazonDocument = Boolean(request?.amazon_rma_id && request?.amazon_rma_page_url);
  const labelUrl = hasAmazonDocument
    ? ""
    : `${getSiteUrl()}/account/returns/${encodeURIComponent(requestId)}/label`;

  const ok = await queueReturnEmail(requestId, "return_instructions", {
    message:
      message ||
      (hasAmazonDocument
        ? "Your Amazon MCF return authorization is ready. Print the Amazon return document, attach the return-center mailing label to the package, and place the authorization slip inside."
        : "Your return is approved. Print the return label, fill in the FROM section, attach it flat to the outside of the box, and do not write anything else on the box."),
    return_address: hasAmazonDocument ? "" : formatReturnAddress(),
    return_label_url: labelUrl,
    return_label_request_id: hasAmazonDocument ? "" : requestId,
    amazon_rma_id: request?.amazon_rma_id || "",
    amazon_rma_page_url: request?.amazon_rma_page_url || "",
  });

  if (!ok) throw new Error("Could not queue the email (no customer email found).");
  await logActivity(requestId, "email", "Return instructions and label emailed to the customer");
  revalidatePath("/admin/returns");
}

// Photos the customer attached (private bucket, signed links valid for one hour).
export async function getReturnPhotos(requestId: string): Promise<string[]> {
  const supabase = await requireAuthenticatedStaff();
  const { data: row } = await supabase
    .from("return_requests")
    .select("user_id, order_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!row?.user_id || !row.order_id) return [];

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("users")
    .select("auth_user_id")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!customer?.auth_user_id) return [];

  // Customer uploads are stored under their Supabase Auth UID, not the
  // application-level public.users numeric id.
  const folder = `${customer.auth_user_id}/${row.order_id}`;
  const { data: files } = await admin.storage.from("return-photos").list(folder, { limit: 20 });
  const paths = (files ?? []).filter((f) => f.name && f.id).map((f) => `${folder}/${f.name}`);
  if (!paths.length) return [];

  const { data: signed } = await admin.storage.from("return-photos").createSignedUrls(paths, 3600);
  return (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[];
}


export async function createAmazonReturnAuthorization(requestId: string) {
  await requireAuthenticatedStaff();

  try {
    const result = await createAmazonMcfReturn(requestId);

    await queueReturnEmail(requestId, "return_instructions", {
      message:
        "Amazon MCF has created your return authorization. Use the Amazon return document for the mailing address and place the authorization slip inside the package. Return postage is not included.",
      return_address: "",
      amazon_rma_id: result.amazonRmaId,
      amazon_rma_page_url: result.rmaPageUrl,
    });

    await logActivity(
      requestId,
      "amazon_mcf_return",
      `Amazon MCF return authorization created${result.amazonRmaId ? ` (RMA ${result.amazonRmaId})` : ""}`
    );

    revalidatePath("/admin/returns");
    return result;
  } catch (rawError) {
    let error: Error = rawError instanceof Error ? rawError : new Error("Amazon MCF return failed.");
    if (/does not exist|not found|no such|invalid.*order/i.test(error.message)) {
      error = new Error(
        "Amazon has no record of this order (it was probably never sent to Amazon, for example a test order, or the sandbox is on). Use the manual return: email the customer the return instructions below, then mark the return Received when the part arrives."
      );
    }
    const admin = createAdminClient();
    await admin
      .from("return_requests")
      .update({
        amazon_return_status: "error",
        amazon_return_error: error.message.slice(0, 2000),
        amazon_return_synced_on: new Date().toISOString(),
        updated_on: new Date().toISOString(),
      })
      .eq("id", requestId);

    throw error;
  }
}

export async function syncAmazonReturnStatus(requestId: string) {
  await requireAuthenticatedStaff();

  try {
    const result = await syncAmazonMcfReturn(requestId);
    await logActivity(
      requestId,
      "amazon_mcf_return_sync",
      result.received
        ? "Amazon MCF reports the returned item has been received."
        : `Amazon MCF return status synchronized (${result.matchedItems} item${result.matchedItems === 1 ? "" : "s"}).`
    );

    revalidatePath("/admin/returns");
    return result;
  } catch (error) {
    const admin = createAdminClient();
    await admin
      .from("return_requests")
      .update({
        amazon_return_status: "error",
        amazon_return_error:
          error instanceof Error ? error.message.slice(0, 2000) : "Amazon MCF return sync failed.",
        amazon_return_synced_on: new Date().toISOString(),
        updated_on: new Date().toISOString(),
      })
      .eq("id", requestId);

    throw error;
  }
}
