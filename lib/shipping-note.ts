import { createAdminClient } from "@/lib/supabase/admin";

let cached: { at: number; text: string } | null = null;

// A short, always-current summary of standard shipping prices for the chat assistant.
export async function shippingNote(): Promise<string> {
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.text;
  let text = "";
  try {
    const { data } = await createAdminClient()
      .from("shipping_rates")
      .select("zone, max_weight_kg, price_cents")
      .order("max_weight_kg");
    const names: Record<string, string> = { BC: "BC", AB: "Alberta and Saskatchewan", ON: "Ontario and Manitoba", QC: "Quebec and Atlantic Canada" };
    const bands = [...new Set((data ?? []).map((r) => Number(r.max_weight_kg)))].sort((a, b) => a - b);
    if (data?.length) {
      const lines = Object.keys(names).map((z) => {
        const prices = bands.map((b) => {
          const r = data.find((x) => x.zone === z && Number(x.max_weight_kg) === b);
          return r ? `$${(Number(r.price_cents) / 100).toFixed(0)}` : "-";
        });
        return `${names[z]}: ${prices.join(" / ")}`;
      });
      text =
        `\n\nSHIPPING (only answer if asked): standard shipping is worked out at checkout from the customer's postal code and the parcel weight, so say the exact price shows in the cart once they enter their postal code. ` +
        `Typical prices in CAD for parcels up to ${bands.join(" kg / ")} kg: ${lines.join("; ")}. ` +
        `Heavier orders get a custom quote (contactus@canuckmotors.ca, 604-445-0147). Parcels usually arrive 2 to 5 business days after they ship. Vancouver and Burnaby customers can also choose Uber same-day delivery. Do not state refund or return rules.`;
    }
  } catch {
    text = "";
  }
  cached = { at: Date.now(), text };
  return text;
}
