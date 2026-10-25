import { retrieveStripeCheckoutSession } from "@/lib/stripe";

type Admin = { from: (t: string) => any };

// After a paid checkout: save the tax Stripe Tax really charged on the order (so invoices,
// emails and the admin pages show it) and set the payment row to the full amount paid.
export async function recordStripeTax(admin: Admin, orderId: string, sessionId: string, amountTotalCents: number | null) {
  try {
    const session = await retrieveStripeCheckoutSession(sessionId, true);
    const taxCents = Number(session.total_details?.amount_tax ?? 0);
    const rows = session.total_details?.breakdown?.taxes ?? [];
    const lines = rows
      .filter((t) => Number(t.amount) > 0)
      .map((t) => {
        const label = t.rate?.display_name || "Tax";
        const pct = t.rate?.percentage != null ? ` (${Number(t.rate.percentage)}%)` : "";
        return { name: `${label}${pct}`, cents: Number(t.amount) };
      });
    await admin
      .from("orders")
      .update({
        sales_tax: taxCents / 100,
        tax_lines: lines.length ? lines : taxCents > 0 ? [{ name: "Tax", cents: taxCents }] : [],
      })
      .eq("id", orderId);
    const total = amountTotalCents ?? Number(session.amount_total ?? 0);
    if (total > 0) {
      await admin.from("payments").update({ amount: total / 100 }).eq("order_id", orderId).eq("provider_checkout_session_id", sessionId);
    }
  } catch (error) {
    console.error("Could not record Stripe Tax on order", orderId, error);
  }
}
