import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogProduct } from "@/lib/catalog";

export type SpecFilter = { name: string; value: string | null }; // null = "Not sure"
export type SpecMap = Map<number, Map<string, string>>;
export type SpecQuestion = { name: string; options: string[] };

// Easiest things to check on the old part come first (used to break ties)
const PREFERRED = [
  "Pulley Included",
  "Includes Back Housing",
  "Water Pump Drive Type",
  "Impeller Material",
  "Housing Material",
  "Impeller Rotation",
  "Hub Pilot Diameter",
  "Hub Diameter (in)",
  "Hub Height",
];

const low = (s: string) => s.trim().toLowerCase();

export async function getSpecsForProducts(ids: number[]): Promise<SpecMap> {
  const map: SpecMap = new Map();
  if (!ids.length) return map;

  const { data, error } = await createPublicClient()
    .from("product_specifications")
    .select("product_id, spec_name, spec_value")
    .in("product_id", ids);

  if (error) {
    // Table missing or blocked: Axel just skips the questions
    console.error("Spec lookup failed:", error.message);
    return map;
  }

  for (const r of data ?? []) {
    if (!map.has(r.product_id)) map.set(r.product_id, new Map());
    map.get(r.product_id)!.set(r.spec_name, r.spec_value);
  }
  return map;
}

// Reads the trailing "Spec: Name = Value" messages the chips send
export function readFilters(
  messages: { role: string; content: string }[],
): SpecFilter[] {
  const out: SpecFilter[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant") continue;
    const hit = m.content.match(/^Spec:\s*(.+?)\s*=\s*(.+)$/i);
    if (!hit) break;
    out.unshift({
      name: hit[1],
      value: low(hit[2]) === "not sure" ? null : hit[2].trim(),
    });
  }
  return out;
}

export function isSpecMessage(text: string) {
  return /^Spec:\s*.+=.+$/i.test(text);
}

export function narrow(
  products: CatalogProduct[],
  specs: SpecMap,
  filters: SpecFilter[],
): { candidates: CatalogProduct[]; question: SpecQuestion | null } {
  // Keep a product unless a known spec clearly differs from the answer
  const candidates = products.filter((p) =>
    filters.every((f) => {
      if (f.value === null) return true;
      const v = specs.get(p.id)?.get(f.name);
      return v === undefined || low(v) === low(f.value);
    }),
  );

  if (candidates.length < 2) return { candidates, question: null };

  const asked = new Set(filters.map((f) => f.name));
  const names = new Set<string>();
  for (const p of candidates) {
    for (const n of specs.get(p.id)?.keys() ?? []) names.add(n);
  }

  let best: { name: string; options: string[]; score: number; pref: number } | null = null;

  for (const name of names) {
    if (asked.has(name)) continue;

    const groups = new Map<string, number>();
    for (const p of candidates) {
      const v = specs.get(p.id)?.get(name);
      if (v !== undefined) groups.set(v, (groups.get(v) ?? 0) + 1);
    }
    if (groups.size < 2) continue;
    if ([...groups.keys()].some((v) => v.length > 28)) continue;

    // Smaller biggest group = better question
    const score = Math.max(...groups.values());
    const idx = PREFERRED.indexOf(name);
    const pref = idx === -1 ? 99 : idx;

    if (!best || score < best.score || (score === best.score && pref < best.pref)) {
      best = { name, options: [...groups.keys()].sort(), score, pref };
    }
  }

  return {
    candidates,
    question: best ? { name: best.name, options: best.options } : null,
  };
}

export function questionText(q: SpecQuestion, count: number) {
  const yesNo = q.options.every((o) => ["yes", "no"].includes(low(o)));
  const ask = yesNo
    ? `Does your old part have "${q.name}": Yes or No?`
    : `What is the ${q.name} of your old part?`;
  return `I found ${count} parts for your vehicle. To pick the exact one: ${ask}`;
}
