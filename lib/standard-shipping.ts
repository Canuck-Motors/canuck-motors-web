import { createAdminClient } from "@/lib/supabase/admin";

export type ShippingZone = "BC" | "AB" | "ON" | "QC";

// First letter of a Canadian postal code -> pricing zone. Territories (X, Y) have no price: "contact us".
const ZONE_BY_LETTER: Record<string, ShippingZone> = {
  V: "BC",
  T: "AB", S: "AB",
  K: "ON", L: "ON", M: "ON", N: "ON", P: "ON", R: "ON",
  G: "QC", H: "QC", J: "QC", A: "QC", B: "QC", C: "QC", E: "QC",
};

export function cleanPostal(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function isPostalCode(raw: string) {
  return /^[ABCEGHJ-NPRSTVXY]\d[A-Z]\d[A-Z]\d$/.test(cleanPostal(raw));
}

export function zoneFromPostal(raw: string): ShippingZone | null {
  const c = cleanPostal(raw);
  return c ? ZONE_BY_LETTER[c[0]] ?? null : null;
}

export type ShippingQuote =
  | { ok: true; cents: number; zone: ShippingZone; weightKg: number; postal: string }
  | { ok: false; message: string };

export const CONTACT_MSG =
  "We need to quote shipping for this order. Please email contactus@canuckmotors.ca or call 604-445-0147 and we'll send you the price.";

// Box, filler and tape on top of the parts. Raise this if carriers keep billing more than the table says.
export const PACKAGING_KG = 0.2;

type Rate = { max_weight_kg: number; price_cents: number };

// Pure lookup: the smallest weight band that holds the parcel.
export function priceForWeight(rates: Rate[], weightKg: number): number | null {
  const band = [...rates].sort((a, b) => a.max_weight_kg - b.max_weight_kg).find((r) => weightKg <= r.max_weight_kg);
  return band ? band.price_cents : null;
}

// Reads the signed-in customer's active cart on the server, so the weight is never taken from the browser.
export async function quoteStandardForCart(
  supabase: { from: (t: string) => any },
  userAuthId: string,
  postalRaw: string
): Promise<ShippingQuote> {
  if (!isPostalCode(postalRaw)) {
    return { ok: false, message: "Enter a valid Canadian postal code to see the shipping price." };
  }
  const postal = cleanPostal(postalRaw);
  const zone = zoneFromPostal(postal);
  if (!zone) return { ok: false, message: CONTACT_MSG };

  const { data: profile } = await supabase.from("users").select("id").eq("auth_user_id", userAuthId).maybeSingle();
  if (!profile) return { ok: false, message: "Customer profile is unavailable." };
  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", profile.id).eq("status", "active").maybeSingle();
  if (!cart) return { ok: false, message: "Your cart is empty." };
  const { data: items } = await supabase.from("cart_items").select("product_id, quantity").eq("cart_id", cart.id);
  if (!items?.length) return { ok: false, message: "Your cart is empty." };

  const { data: products } = await supabase
    .from("products")
    .select("id, weight_kg")
    .in("id", items.map((i: { product_id: number }) => i.product_id));
  const weights = new Map<number, number | null>(
    (products ?? []).map((p: { id: number; weight_kg: number | null }) => [p.id, p.weight_kg == null ? null : Number(p.weight_kg)])
  );

  let total = 0;
  for (const it of items as { product_id: number; quantity: number }[]) {
    const w = weights.get(it.product_id);
    if (w == null || !(w > 0)) return { ok: false, message: CONTACT_MSG }; // never charge $0 for unknown weight
    total += w * it.quantity;
  }
  total = Math.round((total + PACKAGING_KG) * 1000) / 1000;

  const { data: rates } = await createAdminClient()
    .from("shipping_rates")
    .select("max_weight_kg, price_cents")
    .eq("zone", zone);
  const cents = priceForWeight(
    (rates ?? []).map((r: { max_weight_kg: number; price_cents: number }) => ({
      max_weight_kg: Number(r.max_weight_kg),
      price_cents: Number(r.price_cents),
    })),
    total
  );
  if (cents == null) return { ok: false, message: CONTACT_MSG };
  return { ok: true, cents, zone, weightKg: total, postal };
}

export const PROVINCE_CODES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];

// A postal code's first letter fixes the province, so a mismatched province is a typo or a trick.
export const PROVINCES_BY_LETTER: Record<string, string[]> = {
  A: ["NL"], B: ["NS"], C: ["PE"], E: ["NB"], G: ["QC"], H: ["QC"], J: ["QC"],
  K: ["ON"], L: ["ON"], M: ["ON"], N: ["ON"], P: ["ON"], R: ["MB"], S: ["SK"],
  T: ["AB"], V: ["BC"], X: ["NT", "NU"], Y: ["YT"],
};

export function provinceMatchesPostal(province: string, postalRaw: string) {
  const c = cleanPostal(postalRaw);
  return !!c && (PROVINCES_BY_LETTER[c[0]] ?? []).includes(province.toUpperCase());
}

export type ShipTo = {
  name: string; line1: string; line2: string; city: string; province: string; postal_code: string; country: "CA";
};

export function formatPostal(raw: string) {
  const c = cleanPostal(raw);
  return c.length > 3 ? `${c.slice(0, 3)} ${c.slice(3)}` : c;
}
