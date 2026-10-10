import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogProduct } from "@/lib/catalog";

export type SpecFilter = { name: string; value: string | null }; // null = "Not sure"
export type SpecMap = Map<number, Map<string, string>>;
export type SpecQuestion = { name: string; options: string[] };

// Easiest things to check on the old part come first (used to break ties)
const PREFERRED = [
  "Position",
  "Caliper Pistons",
  "Heavy Duty Brakes",
  "Brake Code",
  "Front Disc Size",
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

const MAX_QUESTIONS = 3;

const low = (s: string) => s.trim().toLowerCase();

// ---- Facts read from the vehicle's fitment notes (the old "Comment" column)
// e.g. "Heavy Duty Brakes; 2 Piston Caliper; 330mm Front Disc; with Brake Code Br3"
function noteFeatures(note: string): Record<string, string> {
  const f: Record<string, string> = {};
  const n = note.replace(/\s+/g, " ");

  if (/(without|w\/o|non)[ -]*heavy duty/i.test(n)) f["Heavy Duty Brakes"] = "No";
  else if (/heavy duty/i.test(n)) f["Heavy Duty Brakes"] = "Yes";

  if (/\b(1|one|single)[ -]*piston/i.test(n)) f["Caliper Pistons"] = "1 piston";
  else if (/\b(2|two|dual|twin)[ -]*piston/i.test(n)) f["Caliper Pistons"] = "2 piston (dual)";

  const code = n.match(/brake code[: ]*([A-Za-z0-9]{2,4})\b/i);
  if (code) f["Brake Code"] = code[1].toUpperCase();

  const disc = n.match(/(\d{3})\s*mm\s*front disc/i);
  if (disc) f["Front Disc Size"] = `${disc[1]} mm`;

  return f;
}

// Adds "Position" and the note facts as extra specs, so the same
// narrowing questions (with "Not sure") work for them too.
export function addNoteSpecs(specs: SpecMap, products: CatalogProduct[]) {
  for (const p of products) {
    const own = specs.get(p.id) ?? new Map<string, string>();
    if (!specs.has(p.id)) specs.set(p.id, own);

    if (p.position) own.set("Position", p.position);

    // A fact counts only when every note of this part agrees on it
    const seen = new Map<string, Set<string>>();
    for (const note of p.notes ?? []) {
      const found = noteFeatures(note);
      for (const name of ["Heavy Duty Brakes", "Caliper Pistons", "Brake Code", "Front Disc Size"]) {
        (seen.get(name) ?? seen.set(name, new Set()).get(name)!).add(found[name] ?? "");
      }
    }
    for (const [name, values] of seen) {
      if (values.size === 1 && [...values][0]) own.set(name, [...values][0]);
    }
  }
}

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

// Friendly order: Front, Rear, Front and Rear / Yes before No
function orderOptions(name: string, options: string[]) {
  const rank = (o: string) => {
    const x = low(o);
    if (name === "Position") return x === "front" ? 0 : x === "rear" ? 1 : 2;
    return x === "yes" ? 0 : x === "no" ? 1 : 2;
  };
  return [...options].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// "All" on the front/rear question means: stop asking, show everything
export const wantsAll = (filters: SpecFilter[]) =>
  filters.some((f) => f.name === "Position" && f.value !== null && low(f.value) === "all");

export function narrow(
  products: CatalogProduct[],
  specs: SpecMap,
  filters: SpecFilter[],
): { candidates: CatalogProduct[]; question: SpecQuestion | null } {
  if (wantsAll(filters)) return { candidates: products, question: null };

  // Keep a product unless a known spec clearly differs from the answer
  const candidates = products.filter((p) =>
    filters.every((f) => {
      if (f.value === null) return true;
      const v = specs.get(p.id)?.get(f.name);
      return v === undefined || low(v) === low(f.value);
    }),
  );

  if (candidates.length < 2) return { candidates, question: null };

  // Never ask more than 3 questions: then show what is left
  if (filters.length >= MAX_QUESTIONS) return { candidates, question: null };

  const asked = new Set(filters.map((f) => f.name));
  const names = new Set<string>();
  for (const p of candidates) {
    for (const n of specs.get(p.id)?.keys() ?? []) names.add(n);
  }

  let best: { name: string; options: string[]; score: number; pref: number } | null = null;

  // Front / rear / kit is always asked first
  const ordered = [...names].sort((a, b) => Number(b === "Position") - Number(a === "Position"));
  const positionGroups = new Set(candidates.map((p) => specs.get(p.id)?.get("Position")).filter(Boolean));
  const positionFirst = !asked.has("Position") && positionGroups.size > 1;

  for (const name of ordered) {
    if (positionFirst && name !== "Position") continue;
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
    question: best
      ? { name: best.name, options: orderOptions(best.name, best.options) }
      : null,
  };
}

export function questionText(q: SpecQuestion, count: number) {
  const lead = `I found ${count} parts for your vehicle. `;
  if (q.name === "Position") return `${lead}Which brakes are you replacing: front, rear, or a front and rear kit?`;
  if (q.name === "Heavy Duty Brakes") return `${lead}Does your vehicle have Heavy Duty brakes?`;
  if (q.name === "Caliper Pistons") return `${lead}How many pistons does your brake caliper have: 1 (single) or 2 (dual)?`;
  if (q.name === "Brake Code") return `${lead}Do you know your brake code?`;
  if (q.name === "Front Disc Size") return `${lead}What is the diameter of your front brake disc (rotor)?`;

  const yesNo = q.options.every((o) => ["yes", "no"].includes(low(o)));
  const ask = yesNo
    ? `Does your old part have "${q.name}": Yes or No?`
    : `What is the ${q.name} of your old part?`;
  return `I found ${count} parts for your vehicle. To pick the exact one: ${ask}`;
}
