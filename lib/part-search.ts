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
  const words = text.split(/\s+/).filter(Boolean);
  // "2013 audi a3" is a vehicle, not a part number: a year inside a sentence must
  // not be matched against part numbers (that returned unrelated parts).
  const isYear = (w: string) => /^(19[5-9]\d|20[0-4]\d)$/.test(w);
  const vehicleLike = words.length > 1 && words.some(isYear);
  if (vehicleLike) return [];

  const whole = alnum(text);
  const tokens = words
    .map(alnum)
    .filter((t) => t.length >= 4 && /\d/.test(t) && !isYear(t));
  return Array.from(new Set([whole, ...tokens].filter((t) => t.length >= 3)));
}

// Words that do not help find a part ("brake pads for my truck").
const STOP_WORDS = new Set(["a", "an", "and", "for", "the", "my", "of", "with", "to", "in", "on"]);

// Common catalog words, used to split text typed without spaces ("brakepadkit").
const KNOWN_WORDS = [
  "brake", "pad", "kit", "set", "water", "pump", "front", "rear", "ceramic", "disc",
  "engine", "timing", "belt", "semi", "metallic", "rotor", "hardware", "gasket",
  "coolant", "drum", "shoe", "caliper", "and", "with",
];

// "brakepadkit" -> ["brake", "pad", "kit"]; null when the text is not made of known words.
function splitRunTogether(token: string): string[] | null {
  const t = token.toLowerCase();
  const best: (string[] | null)[] = Array(t.length + 1).fill(null);
  best[0] = [];
  for (let i = 1; i <= t.length; i++) {
    for (const w of KNOWN_WORDS) {
      for (const form of [w, w + "s"]) {
        if (i >= form.length && best[i - form.length] && t.endsWith(form, i) ) {
          const prev = best[i - form.length]!;
          if (t.slice(i - form.length, i) === form && (!best[i] || prev.length + 1 < best[i]!.length)) {
            best[i] = [...prev, w];
          }
        }
      }
    }
  }
  return best[t.length];
}

// "brake pad kit" / "front brake pads" -> ["brake", "pad", "kit"] (plural "s" removed).
function searchWords(text: string) {
  const rough = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const parts = rough.flatMap((w) => splitRunTogether(w) ?? [w]);
  return Array.from(
    new Set(
      parts
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
        .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)),
    ),
  );
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
      supabase.from("products").select("id").eq("is_active", true).eq("is_delete", false).or(direct).limit(1000),
      supabase.from("product_interchanges").select("product_id").or(icOr).limit(1000),
      supabase.from("product_oe_numbers").select("product_id").or(oeOr).limit(1000),
    ]);
    return { p, ic, oe };
  };

  let res = await run(true);
  if (res.p.error || res.ic.error || res.oe.error) {
    // Normalized columns not created yet: use the plain search
    res = await run(false);
  }

  for (const r of res.p.data ?? []) ids.add(r.id);

  // Word search: every word must appear in the product name or the page title, in any
  // order, so "brake pad kit" finds the kits and "front brake pads" finds the pads.
  const words = searchWords(text);
  if (words.length > 0 && words.length <= 6 && !/\d/.test(text)) {
    let q = supabase.from("products").select("id").eq("is_active", true).eq("is_delete", false);
    for (const w of words) {
      q = q.or(`product_name.ilike.%${w}%,title_tag.ilike.%${w}%`);
    }
    const { data, error } = await q.limit(1000);
    if (!error) for (const r of data ?? []) ids.add(r.id);
  }
  for (const r of res.ic.data ?? []) ids.add(r.product_id);
  for (const r of res.oe.data ?? []) ids.add(r.product_id);
  return ids;
}
