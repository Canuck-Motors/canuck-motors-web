import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendAppEmail } from "@/lib/email";
import { brandedEmail } from "@/lib/email-template";


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

    const html = brandedEmail({
      preheader: `Your order ${number} has shipped.`,
      title: "Your order is on its way",
      blocks: [
        { type: "text", text: `Hi ${name}, your Canuck Motors order ${number} has shipped.` },
        { type: "rows", rows },
        { type: "button", label: "Track your package", url: d.trackingUrl },
        { type: "note", text: "Thank you for shopping with Canuck Motors." },
      ],
    });

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
