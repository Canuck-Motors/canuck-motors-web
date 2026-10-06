import { createAdminClient } from "@/lib/supabase/admin";

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

  const status = String(row.payload?.status || "updated").replaceAll("_", " ");

  return {
    subject: "Canuck Motors order update",
    text: `Your Canuck Motors order status is now: ${status}.`,
  };
}

async function sendEmail(row: OutboxRow) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email provider is not configured.");
  }

  const message = messageFor(row);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [row.recipient],
      subject: message.subject,
      text: message.text,
    }),
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || "Email send failed.");
  }

  return String(payload?.id || "");
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
