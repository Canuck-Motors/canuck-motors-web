import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppEmail } from "@/lib/email";
import { buildReturnLabelPdf, loadReturnLabelData } from "@/lib/return-label";
import { brandedEmail, type EmailBlock } from "@/lib/email-template";

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
            "Print the PDF at 100% (do not scale it), attach the label flat to the outside of the box without covering the barcode, and drop the box off with any carrier. Postage is not included."
          );
        }
        lines.push("Pack the item securely and keep your carrier receipt and tracking number until the return is completed.");
      }
    } else {
      const status = String(p.status || "");
      const statusLabel = status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const reason = String(p.message || "").trim();

      lines.push("Dear Customer,");
      lines.push(
        "We are writing to inform you that the status of your return request has been updated."
      );
      lines.push(`Order Number: ${order}`);

      const returnItems = Array.isArray(p.return_items)
        ? (p.return_items as Array<{ quantity?: number; name?: string; sku?: string }>)
        : [];

      if (returnItems.length === 1) {
        const item = returnItems[0];
        const name = String(item.name || item.sku || "Item");
        const sku = String(item.sku || "");
        const product = sku && !name.toLowerCase().includes(sku.toLowerCase())
          ? `${name} (SKU: ${sku})`
          : name;
        lines.push(`Product: ${product}`);
        if (Number(item.quantity || 1) > 1) {
          lines.push(`Quantity: ${Number(item.quantity)}`);
        }
      } else if (returnItems.length > 1) {
        const products = returnItems.map((item) => {
          const name = String(item.name || item.sku || "Item");
          const sku = String(item.sku || "");
          const product = sku && !name.toLowerCase().includes(sku.toLowerCase())
            ? `${name} (SKU: ${sku})`
            : name;
          return `- ${Number(item.quantity || 1)} × ${product}`;
        });
        lines.push(`Products:\n${products.join("\n")}`);
      }

      lines.push(`Status: ${statusLabel || "Updated"}`);
      if (reason) {
        const isDecline = ["rejected", "inspection_failed", "denied", "cancelled", "canceled"].includes(status);
        lines.push(`${isDecline ? "Reason" : "Note from our team"}: ${reason}`);
      }
      if (p.tracking) {
        lines.push(`Return Tracking: ${String(p.carrier || "")} ${String(p.tracking)}`.trim());
      }
      lines.push(
        "If you have any questions regarding this update, please reply to this email and our team will be happy to assist you."
      );
      lines.push("Sincerely,\nCanuck Motors");

      return {
        subject: `Return Request Update - Order ${order}`,
        text: lines.join("\n\n"),
      };
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

// Branded HTML version of the same message (the plain-text version above stays as the fallback).
function htmlFor(row: OutboxRow): string {
  const p = row.payload ?? {};
  const order = String(p.order_number || "");
  const returnItems = Array.isArray(p.return_items)
    ? (p.return_items as Array<{ quantity?: number; name?: string; sku?: string }>)
    : [];
  const itemsBlock: EmailBlock[] = returnItems.length
    ? [{
        type: "items",
        items: returnItems.map((i) => ({
          name: String(i.name || i.sku || "Item"),
          sub: [i.sku, `Qty ${Number(i.quantity || 1)}`].filter(Boolean).join(" · "),
        })),
      }]
    : [];

  if (row.event_type === "exchange_payment_required") {
    const amount = Number(p.amount_due || 0).toFixed(2);
    const currency = String(p.currency || "CAD");
    return brandedEmail({
      preheader: "An extra payment is needed to complete your exchange.",
      title: "Action required for your exchange",
      blocks: [
        { type: "text", text: "Your exchange requires an additional payment before we can send the replacement." },
        { type: "rows", rows: [["Amount due", `$${amount} ${currency}`]], strongLast: true },
        { type: "button", label: "Complete payment", url: String(p.payment_url || "") },
      ],
    });
  }

  if (row.event_type === "return_instructions") {
    const labelUrl = String(p.return_label_url || "");
    const amazonRmaPageUrl = String(p.amazon_rma_page_url || "");
    const amazonRmaId = String(p.amazon_rma_id || "");
    const address = String(p.return_address || "");
    const rows: [string, string][] = [["Order", order]];
    if (amazonRmaId) rows.push(["Amazon MCF RMA", amazonRmaId]);
    const blocks: EmailBlock[] = [
      { type: "text", text: String(p.message || "").trim() || `Here is how to send back your item for order ${order}.` },
      { type: "rows", rows },
      ...itemsBlock,
    ];
    if (amazonRmaPageUrl) {
      blocks.push(
        { type: "button", label: "Open Amazon return document", url: amazonRmaPageUrl },
        { type: "steps", steps: [
          "Print the Amazon document.",
          "Attach the return-center mailing label to the package and place the authorization slip inside.",
          "Pack the item securely and keep your carrier receipt and tracking number.",
        ] },
        { type: "note", text: "Return postage is not included." },
      );
    } else {
      if (address) blocks.push({ type: "box", title: "Return destination", lines: address.split("\n").filter(Boolean) });
      if (labelUrl) {
        blocks.push(
          { type: "box", title: "Your return label", lines: ["The label is attached to this email as a PDF."] },
          { type: "button", label: "Open return label", url: labelUrl },
          { type: "steps", steps: [
            "Print the PDF at 100% (do not scale it).",
            "Attach the label flat to the outside of the box without covering the barcode.",
            "Pack the item securely and drop the box off with any carrier.",
            "Keep your carrier receipt and tracking number until the return is completed.",
          ] },
          { type: "note", text: "Postage is not included." },
        );
      } else {
        blocks.push({ type: "text", text: address ? "Pack the item securely and keep your carrier receipt and tracking number until the return is completed." : "Reply to this email and we will send you the return address." });
      }
    }
    return brandedEmail({
      preheader: labelUrl ? "Your return label is attached." : `How to send back your item for order ${order}.`,
      title: labelUrl ? "Your return label is ready" : "How to send back your item",
      blocks,
    });
  }

  if (row.event_type === "return_update") {
    const status = String(p.status || "");
    const statusLabel = status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Updated";
    const reason = String(p.message || "").trim();
    const isDecline = ["rejected", "inspection_failed", "denied", "cancelled", "canceled"].includes(status);
    const rows: [string, string][] = [["Order", order], ["Status", statusLabel]];
    if (p.tracking) rows.push(["Return tracking", `${String(p.carrier || "")} ${String(p.tracking)}`.trim()]);
    return brandedEmail({
      preheader: `Return update for order ${order}: ${statusLabel}.`,
      title: "Your return request was updated",
      blocks: [
        { type: "text", text: "We are writing to let you know that the status of your return request has changed." },
        { type: "rows", rows },
        ...itemsBlock,
        ...(reason ? [{ type: "box" as const, title: isDecline ? "Reason" : "Note from our team", lines: reason.split("\n"), tone: isDecline ? ("warn" as const) : ("neutral" as const) }] : []),
        { type: "note", text: "If you have any questions, just reply to this email and our team will be happy to help." },
      ],
    });
  }

  const status = String(p.status || "updated").replaceAll("_", " ");
  return brandedEmail({
    preheader: `Order update: ${status}.`,
    title: "Order update",
    blocks: [
      { type: "text", text: `${order ? `Your Canuck Motors order ${order}` : "Your Canuck Motors order"} is now: ${status}.` },
    ],
  });
}

async function sendEmail(row: OutboxRow) {
  const message = messageFor(row);
  const requestId = String(row.payload?.return_label_request_id || "");
  const orderNumber = String(row.payload?.order_number || "");
  let labelData: Awaited<ReturnType<typeof loadReturnLabelData>> = null;
  if (row.event_type === "return_instructions" && requestId) {
    try {
      labelData = await loadReturnLabelData(requestId);
    } catch (e) {
      console.error("[notifications] could not build return label:", e);
    }
    if (!labelData) console.error("[notifications] no return label data for request", requestId);
  }
  const attachments = labelData
    ? [
        {
          filename: `return-label-${labelData.returnRef}.pdf`,
          content: buildReturnLabelPdf(labelData),
          contentType: "application/pdf",
        },
      ]
    : undefined;

  return sendAppEmail({
    to: row.recipient,
    subject: message.subject,
    text: message.text,
    html: htmlFor(row),
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
      console.error("[notifications] send failed:", row.event_type, row.recipient, sendError instanceof Error ? sendError.message : sendError);
    }
  }

  return { processed: rows?.length ?? 0, sent, failed };
}
