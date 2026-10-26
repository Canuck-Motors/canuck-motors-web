import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppEmail } from "@/lib/email";
import { buildReturnLabelPdf } from "@/lib/return-label";

type OutboxRow = {
  id: string;
  channel: "email" | "whatsapp";
  recipient: string;
  event_type: string;
  template_key: string;
  payload: Record<string, unknown>;
  attempts: number;
};

function messageFor(row: OutboxRow) {
  if (row.event_type === "exchange_payment_required") {
    const amount = Number(row.payload?.amount_due || 0).toFixed(2);
    const currency = String(row.payload?.currency || "CAD");
    const paymentUrl = String(row.payload?.payment_url || "");

    return {
      subject: "Action required for your Canuck Motors exchange",
      text:
        `Your exchange requires an additional payment of ${amount} ${currency}. ` +
        `Complete payment here: ${paymentUrl}`,
    };
  }

  if (row.event_type === "return_update" || row.event_type === "return_instructions") {
    const p = row.payload ?? {};
    const order = String(p.order_number || "");
    const lines: string[] = [];

    if (row.event_type === "return_instructions") {
      lines.push(`Here is how to send back your item for order ${order}.`);
      const amazonRmaId = String(p.amazon_rma_id || "");
      const amazonRmaPageUrl = String(p.amazon_rma_page_url || "");
      const address = String(p.return_address || "");

      if (amazonRmaId) lines.push(`Amazon MCF RMA: ${amazonRmaId}`);
      if (amazonRmaPageUrl) {
        lines.push(`Amazon return document: ${amazonRmaPageUrl}`);
        lines.push(
          "Print the Amazon document, attach the return-center mailing label to the package, and place the authorization slip inside. Return postage is not included."
        );
      } else {
        const labelUrl = String(p.return_label_url || "");
        lines.push(address ? `Return destination:\n${address}` : "Reply to this email and we will send you the return address.");
        if (labelUrl) {
          lines.push(`Your return-label PDF is attached to this email. You can also open it here: ${labelUrl}`);
          lines.push(
            "Print the PDF, fill in the blank FROM section with your address, attach the label flat to the outside of the box, and do not write anything else on the box."
          );
        }
        lines.push("Pack the item securely and keep your carrier receipt and tracking number until the return is completed.");
      }
    } else {
      const status = String(p.status || "");
      const headline: Record<string, string> = {
        under_review: "Your return request is under review.",
        approved: "Your request was approved.",
        rejected: "We are sorry, we could not approve your request.",
        label_issued: "Your return instructions are ready.",
        in_transit: "Your return is on its way to us.",
        received: "We received your returned item.",
        inspection_failed: "We inspected your returned item and there is an issue.",
        exchange_processing: "We are preparing your exchange.",
        completed: "Your return or exchange is complete.",
      };
      lines.push(`Update on your request for order ${order}: ${headline[status] || `status is now ${status.replaceAll("_", " ")}.`}`);
    }

    if (p.message) lines.push(String(p.message));
    if (p.tracking) lines.push(`Return tracking: ${String(p.carrier || "")} ${String(p.tracking)}`.trim());
    lines.push("Thank you, Canuck Motors");

    return {
      subject: `Canuck Motors return update (${order})`,
      text: lines.join("\n\n"),
    };
  }

  const status = String(row.payload?.status || "updated").replaceAll("_", " ");

  const num = String(row.payload?.order_number || "");
  return {
    subject: num ? `Canuck Motors order ${num}: ${status}` : "Canuck Motors order update",
    text: `${num ? `Your Canuck Motors order ${num}` : "Your Canuck Motors order"} is now: ${status}.\n\nQuestions? Reply to this email or call 604-445-0147.`,
  };
}

async function sendEmail(row: OutboxRow) {
  const message = messageFor(row);
  const requestId = String(row.payload?.return_label_request_id || "");
  const orderNumber = String(row.payload?.order_number || "");
  const attachments =
    row.event_type === "return_instructions" && requestId
      ? [
          {
            filename: `return-${orderNumber || "order"}.pdf`,
            content: buildReturnLabelPdf({ orderNumber, requestId }),
            contentType: "application/pdf",
          },
        ]
      : undefined;

  return sendAppEmail({
    to: row.recipient,
    subject: message.subject,
    text: message.text,
    attachments,
  });
}

async function sendWhatsApp(row: OutboxRow) {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;

  if (!url || !token) {
    throw new Error("WhatsApp provider is not configured.");
  }

  const message = messageFor(row);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: row.recipient,
      type: "text",
      text: { body: message.text },
    }),
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "WhatsApp send failed.");
  }

  return String(payload?.messages?.[0]?.id || "");
}

export async function processNotificationOutbox(limit = 50) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin.rpc(
    "claim_notification_outbox",
    { p_limit: limit }
  );

  if (error) {
    throw new Error(error.message);
  }

  let sent = 0;
  let failed = 0;

  for (const row of (rows ?? []) as OutboxRow[]) {

    try {
      const providerMessageId =
        row.channel === "email" ? await sendEmail(row) : await sendWhatsApp(row);

      await admin
        .from("notification_outbox")
        .update({
          status: "sent",
          provider_message_id: providerMessageId || null,
          sent_on: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);

      sent++;
    } catch (sendError) {
      const attempts = row.attempts;
      const delayMinutes = Math.min(60, 5 * Math.max(1, attempts));
      const nextAttempt = new Date(Date.now() + delayMinutes * 60_000).toISOString();

      await admin
        .from("notification_outbox")
        .update({
          status: attempts >= 5 ? "suppressed" : "failed",
          next_attempt_on: nextAttempt,
          last_error:
            sendError instanceof Error ? sendError.message : "Notification failed",
        })
        .eq("id", row.id);

      failed++;
    }
  }

  return { processed: rows?.length ?? 0, sent, failed };
}
