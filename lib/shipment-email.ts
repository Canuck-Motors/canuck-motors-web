import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendAppEmail } from "@/lib/email";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Details = {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  serviceLevel: string;
  estimatedDelivery: string;
};

// Emails the customer their shipping details right away. Never throws:
// returns a short plain message so the admin knows what happened.
export async function emailShipmentToCustomer(d: Details): Promise<string> {
  try {
    if (!isEmailConfigured()) {
      return "Email is not set up, so the customer was not emailed.";
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("order_number, customer_email, customer_name")
      .eq("id", d.orderId)
      .maybeSingle();

    const to = String(order?.customer_email ?? "").trim();
    if (!to) return "This order has no customer email, so no email was sent.";

    const number = String(order?.order_number ?? "");
    const name = String(order?.customer_name ?? "").trim() || "there";
    const eta = d.estimatedDelivery
      ? new Date(d.estimatedDelivery).toLocaleDateString("en-CA", {
          dateStyle: "long",
          timeZone: "America/Vancouver",
        })
      : "";

    const rows: [string, string][] = [
      ["Order", number],
      ["Carrier", d.carrier],
      ["Tracking number", d.trackingNumber],
    ];
    if (d.serviceLevel) rows.push(["Service", d.serviceLevel]);
    if (eta) rows.push(["Estimated delivery", eta]);

    const text = [
      `Hi ${name},`,
      `Good news, your Canuck Motors order ${number} is on its way.`,
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      d.trackingUrl ? `Track your package: ${d.trackingUrl}` : "",
      "Thank you for shopping with Canuck Motors.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
<h2 style="margin:0 0 12px">Your order is on its way</h2>
<p>Hi ${esc(name)}, your Canuck Motors order <b>${esc(number)}</b> has shipped.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${esc(v)}</td></tr>`
      )
      .join("")}</table>
${
  d.trackingUrl && /^https?:\/\//i.test(d.trackingUrl)
    ? `<p><a href="${esc(d.trackingUrl)}" style="display:inline-block;background:#d62828;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Track your package</a></p>`
    : ""
}
<p style="color:#666;font-size:13px">Thank you for shopping with Canuck Motors.</p></div>`;

    await sendAppEmail({
      to,
      subject: `Your Canuck Motors order ${number} has shipped`,
      text,
      html,
    });
    return `Customer emailed at ${to}.`;
  } catch (error) {
    console.error("Shipment email failed:", error);
    const message = error instanceof Error ? error.message : "Unknown email error";
    return `Shipment saved, but the email could not be sent: ${message}`;
  }
}
