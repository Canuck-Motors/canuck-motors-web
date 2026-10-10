import type { SupabaseClient } from "@supabase/supabase-js";

// Shared part-number search (website search bar AND Axel).
// Ignores case, dashes, spaces and dots, so "CM-1252102" finds CM1252102,
// and another brand's number (OE or interchange) finds our equivalent part.
// Needs database/search_normalized.sql; falls back to the old matching if
// those columns do not exist yet.

export const cleanText = (s: string) =>
  s.replace(/[%,()*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

const alnum = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

// "ACDelco 252544" -> ["252544"]; "CM-1252102" -> ["CM1252102"]
function numberTokens(text: string) {
  const whole = alnum(text);
  const tokens = text
    .split(/\s+/)
    .map(alnum)
    .filter((t) => t.length >= 4 && /\d/.test(t));
  return Array.from(new Set([whole, ...tokens].filter((t) => t.length >= 3)));
}

export async function findProductIds(
  supabase: SupabaseClient,
  rawTerm: string,
): Promise<Set<number>> {
  const text = cleanText(rawTerm);
  const ids = new Set<number>();
  if (text.length < 2) return ids;

  const tokens = numberTokens(text);

  const run = async (useNorm: boolean) => {
    const direct = useNorm && tokens.length
      ? [
          `product_name.ilike.%${text}%`,
          `sku.ilike.%${text}%`,
          ...tokens.map((t) => `sku_norm.ilike.%${t}%`),
        ].join(",")
      : `sku.ilike.%${text}%,product_name.ilike.%${text}%`;

    const oeOr = useNorm && tokens.length
      ? tokens.map((t) => `oe_number_norm.ilike.%${t}%`).join(",")
      : `oe_number.ilike.%${text}%`;
    const icOr = useNorm && tokens.length
      ? tokens.map((t) => `interchange_number_norm.ilike.%${t}%`).join(",")
      : `interchange_number.ilike.%${text}%`;

    const [p, ic, oe] = await Promise.all([
      supabase.from("products").select("id").eq("is_active", true).eq("is_delete", false).or(direct).limit(50),
      supabase.from("product_interchanges").select("product_id").or(icOr).limit(100),
      supabase.from("product_oe_numbers").select("product_id").or(oeOr).limit(100),
    ]);
    return { p, ic, oe };
  };

  let res = await run(true);
  if (res.p.error || res.ic.error || res.oe.error) {
    // Normalized columns not created yet: use the plain search
    res = await run(false);
  }

  for (const r of res.p.data ?? []) ids.add(r.id);
  for (const r of res.ic.data ?? []) ids.add(r.product_id);
  for (const r of res.oe.data ?? []) ids.add(r.product_id);
  return ids;
}
