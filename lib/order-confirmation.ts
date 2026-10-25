import { createAdminClient } from "@/lib/supabase/admin";
import { grandTotal, storedTaxLines } from "@/lib/order-totals";
import { isEmailConfigured, sendAppEmail } from "@/lib/email";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n: number) => `$${n.toFixed(2)}`;

// Emails the receipt once per order. Safe to call from both the webhook and the success page:
// the first caller claims the order, the second does nothing. Never throws.
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  try {
    if (!isEmailConfigured()) return;
    const admin = createAdminClient();

    const { data: claimed, error: claimError } = await admin
      .from("orders")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("confirmation_sent_at", null)
      .select("id, order_number, customer_email, customer_name, subtotal, tax_amount, total_amount, delivery_fee, sales_tax, tax_lines, delivery_method, shipping_address")
      .maybeSingle();
    if (claimError || !claimed) return; // column missing (SQL not run) or already sent

    const to = String(claimed.customer_email ?? "").trim();
    if (!to) return;

    const { data: items } = await admin
      .from("order_items")
      .select("product_name, sku, unit_price, quantity, cancelled_on")
      .eq("order_id", orderId)
      .order("id");
    const lines = (items ?? []).filter((i) => !i.cancelled_on);

    const fee = Number(claimed.delivery_fee ?? 0);
    const taxLines = storedTaxLines(claimed.tax_lines);
    const oldTax = Number(claimed.tax_amount ?? 0);
    const total = grandTotal(claimed);
    const subtotal = lines.reduce((t, i) => t + Number(i.unit_price) * Number(i.quantity), 0);
    const a = (claimed.shipping_address ?? {}) as Record<string, string | null>;
    const addr = [a.name, a.line1, a.line2, [a.city, a.province, a.postal_code].filter(Boolean).join(", ")]
      .filter(Boolean) as string[];
    const method = claimed.delivery_method === "uber" ? "Uber same-day delivery" : "Standard shipping";
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const invoiceUrl = `${site}/account/orders/${orderId}/invoice`;
    const name = String(claimed.customer_name ?? "").trim() || "there";
    const number = String(claimed.order_number ?? "");

    const rows: [string, string][] = [["Subtotal", money(subtotal)]];
    if (fee > 0) rows.push([method, money(fee)]);
    for (const t of taxLines) rows.push([t.name, money(Number(t.cents) / 100)]);
    if (taxLines.length === 0 && oldTax > 0) rows.push(["Tax", money(oldTax)]);
    rows.push(["Total", `${money(total)} CAD`]);

    const text = [
      `Hi ${name},`,
      `Thank you for your order ${number}. We are getting it ready to ship.`,
      lines.map((i) => `${i.quantity} x ${i.product_name} (${i.sku}) - ${money(Number(i.unit_price) * Number(i.quantity))}`).join("\n"),
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      addr.length ? `Shipping to:\n${addr.join("\n")}` : "",
      `Invoice and receipt (log in to view or save as PDF): ${invoiceUrl}`,
      "We will email you again with tracking as soon as it ships. Questions? Reply to this email or call 604-445-0147.",
      "Canuck Motors",
    ]
      .filter(Boolean)
      .join("\n\n");

    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
<h2 style="margin:0 0 8px">Thanks for your order</h2>
<p>Hi ${esc(name)}, order <b>${esc(number)}</b> is confirmed. We are getting it ready to ship.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">${lines
      .map(
        (i) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(String(i.product_name))}<div style="color:#777;font-size:12px">${esc(String(i.sku))} × ${Number(i.quantity)}</div></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(Number(i.unit_price) * Number(i.quantity))}</td></tr>`
      )
      .join("")}${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-weight:bold">${esc(v)}</td></tr>`
      )
      .join("")}</table>
${addr.length ? `<p style="margin:0"><b>Shipping to</b><br>${addr.map(esc).join("<br>")}</p>` : ""}
<p style="margin-top:16px"><a href="${esc(invoiceUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:bold">View invoice / download PDF</a></p>
<p style="color:#666;font-size:13px;margin-top:20px">We will email you again with tracking as soon as it ships. Questions? Reply to this email or call 604-445-0147.</p></div>`;

    await sendAppEmail({ to, subject: `Your Canuck Motors order ${number} is confirmed`, text, html });
  } catch (error) {
    console.error("Order confirmation email failed:", error);
  }
}
