import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogProduct } from "@/lib/catalog";

export type SpecFilter = { name: string; value: string | null }; // null = "Not sure"
export type SpecMap = Map<number, Map<string, string>>;
export type SpecQuestion = { name: string; options: string[] };

// Easiest things to check on the old part come first (used to break ties)
const PREFERRED = [
  "Position",
  "Trim",
  "Body Type",
  "Fuel Type",
  "Engine",
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

const MAX_QUESTIONS = 4;
const SEAL = "Gasket or O-ring included";

// Last resort when two parts still fit and nothing else tells them apart: ask about
// build details (customer can answer "Not sure" and then sees the parts).
const LAST_RESORT = ["Impeller Material", "Impeller Rotation", "Housing Material", "Hub Pilot Diameter", "Hub Height"];

// "2.91 IN" vs "2.9 IN", or "Aluminum" vs "Cast Aluminum", are the same thing to a customer
function nearlySame(a: string, b: string) {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (x.includes(y) || y.includes(x)) return true;
  const n = (v: string) => parseFloat(v.replace(/[^0-9.]/g, ""));
  const nx = n(x);
  const ny = n(y);
  return Number.isFinite(nx) && Number.isFinite(ny) && Math.abs(nx - ny) / Math.max(nx, ny) < 0.05;
}

// Specs that need a ruler or a taken-apart pump, and extras that come in the box
// (gasket, O-ring). These never decide fitment, so Axel never asks about them.
const MEASUREMENT =
  /diameter|height|length|width|thickness|depth|\(in\)|\(mm\)|housing material|impeller material|impeller rotation|gasket|o-?ring/i;

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
// Several values for one question are stored in one string, joined like this
const SEP = " | ";
const values = (v: string) => v.split(SEP).map((x) => x.trim()).filter(Boolean);

// Clauses of a fitment note ("Heavy Duty Brakes; Built after 03/2012") that
// the brake facts above do not already cover.
const HANDLED = /heavy duty|piston|brake code|front disc/i;
function noteClauses(note: string): string[] {
  return note
    .split(/[;|\n]/)
    .map((c) => c.replace(/=/g, "-").replace(/\s+/g, " ").trim().replace(/\.$/, ""))
    .filter((c) => c.length >= 3 && c.length <= 70 && !HANDLED.test(c) && !/^(front|rear|front and rear)$/i.test(c));
}

// Adds "Position", the vehicle details (trim, body type, fuel type, and engine
// when the customer did not know it) and the facts from the fitment notes as
// extra specs, so the same narrowing questions (with "Not sure") work for them.
export function addNoteSpecs(
  specs: SpecMap,
  products: CatalogProduct[],
  opts: { includeEngine?: boolean } = {},
) {
  // Which note clauses does each part have? Only clauses that tell parts apart are kept.
  const clausesOf = new Map<number, Set<string>>();
  const clauseText = new Map<string, string>();
  for (const p of products) {
    const notes = p.notes ?? [];
    if (!notes.length) continue;
    const perNote = notes.map((n) => new Set(noteClauses(n).map((c) => c.toLowerCase())));
    for (const n of notes) for (const c of noteClauses(n)) clauseText.set(c.toLowerCase(), c);
    // A clause counts for the part only when every note of the part has it
    const common = [...perNote[0]].filter((c) => perNote.every((set) => set.has(c)));
    clausesOf.set(p.id, new Set(common));
  }
  const allClauses = new Set<string>();
  for (const set of clausesOf.values()) for (const c of set) allClauses.add(c);
  const askable = [...allClauses].filter((c) => {
    if (/pulley/i.test(c)) return false; // handled as the single "Pulley Included" question
    const have = [...clausesOf.values()].filter((set) => set.has(c)).length;
    return have < clausesOf.size; // some parts have it, some do not
  });
  // Does any part's fitment note mention a pulley? ("Supplied With Pulley", "Without Pulley")
  const anyPulleyNote = [...clausesOf.values()].some((set) => [...set].some((c) => /pulley/i.test(c)));

  for (const p of products) {
    const own = specs.get(p.id) ?? new Map<string, string>();
    if (!specs.has(p.id)) specs.set(p.id, own);

    if (p.position) own.set("Position", p.position);

    // What this part's fitment rows say about the vehicle
    const fits = p.fits ?? [];
    const dim = (name: string, pick: (f: NonNullable<CatalogProduct["fits"]>[number]) => string) => {
      const set = new Set(fits.map(pick).filter(Boolean));
      if (set.size) own.set(name, [...set].sort().join(SEP));
    };
    dim("Trim", (f) => f.trim);
    dim("Body Type", (f) => f.body);
    dim("Fuel Type", (f) => f.fuel);
    if (opts.includeEngine !== false) dim("Engine", (f) => f.engine);

    // A fact counts only when every note of this part agrees on it
    const seen = new Map<string, Set<string>>();
    for (const note of p.notes ?? []) {
      const found = noteFeatures(note);
      for (const name of ["Heavy Duty Brakes", "Caliper Pistons", "Brake Code", "Front Disc Size"]) {
        (seen.get(name) ?? seen.set(name, new Set()).get(name)!).add(found[name] ?? "");
      }
    }
    for (const [name, vals] of seen) {
      if (vals.size === 1 && [...vals][0]) own.set(name, [...vals][0]);
    }

    // Other note clauses become Yes / No questions
    // A part whose notes do not mention the clause (or that has no notes) is the plain one
    const mine = clausesOf.get(p.id);
    for (const c of askable) own.set(`Note: ${clauseText.get(c)}`, mine?.has(c) ? "Yes" : "No");

    // "Pulley Included" has two sources: the spec table and the fitment note. Merge them into
    // ONE spec so the customer is asked only once. A real spec always wins over the note.
    if (anyPulleyNote && !own.has("Pulley Included")) {
      const clause = [...(mine ?? [])].find((c) => /pulley/i.test(c));
      if (clause) own.set("Pulley Included", /(without|w\/o|\bno\b|non)[ -]*pulley/i.test(clause) ? "No" : "Yes");
      else own.set("Pulley Included", "No"); // the plain part: its note does not mention a pulley
    }

    // Gasket and O-ring are one thing to the customer ("a seal in the box").
    // Ask about it only when some parts have one and some do not.
    const hasSeal = [...(mine ?? [])].some((c) => /gasket|o-?ring/i.test(c));
    own.set(SEAL, hasSeal ? "Yes" : "No");
  }

  // If some parts are "Heavy Duty", the parts that do not say so are the standard ones
  const anyHeavy = products.some((p) => specs.get(p.id)?.get("Heavy Duty Brakes") === "Yes");
  if (anyHeavy) {
    for (const p of products) {
      const own = specs.get(p.id)!;
      if (!own.has("Heavy Duty Brakes")) own.set("Heavy Duty Brakes", "No");
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

// Reads EVERY spec answer of the current search, not only the trailing ones, so a
// free-text message in the middle ("what fits my vehicle?") does not lose the answers.
// A new vehicle, VIN or engine/trim button starts a new search.
export function readAllFilters(
  messages: { role: string; content: string }[],
): SpecFilter[] {
  let out: SpecFilter[] = [];
  for (const m of messages) {
    if (m.role !== "user") continue;
    const t = m.content.trim();
    const hit = t.match(/^Spec:\s*(.+?)\s*=\s*(.+)$/i);
    if (hit) {
      const f: SpecFilter = { name: hit[1], value: low(hit[2]) === "not sure" ? null : hit[2].trim() };
      out = out.filter((x) => x.name !== f.name);
      out.push(f);
      continue;
    }
    const compact = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (
      /^(Make|Model|Engine|Trim):\s*\S/i.test(t) ||
      /\b(19[5-9]\d|20[0-4]\d)\b/.test(t) ||
      /^[A-HJ-NPR-Z0-9]{17}$/.test(compact)
    ) {
      out = [];
    }
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

// "All" on the front/rear question means: keep both front and rear parts,
// but still ask the other questions (heavy duty, brake code, ...).
export const wantsAll = (filters: SpecFilter[]) =>
  filters.some((f) => f.name === "Position" && f.value !== null && low(f.value) === "all");

// Customer said "Not sure" to every question after front/rear: they should check with the dealership.
export const notSureAboutEverything = (filters: SpecFilter[]) => {
  const rest = filters.filter((f) => f.name !== "Position");
  return rest.length > 0 && rest.every((f) => f.value === null);
};

export function narrow(
  products: CatalogProduct[],
  specs: SpecMap,
  filters: SpecFilter[],
): { candidates: CatalogProduct[]; question: SpecQuestion | null } {
  // Keep a product unless a known spec clearly differs from the answer
  const candidates = products.filter((p) =>
    filters.every((f) => {
      if (f.value === null) return true;
      if (f.name === "Position" && low(f.value) === "all") return true;
      const v = specs.get(p.id)?.get(f.name);
      return v === undefined || values(v).some((x) => low(x) === low(f.value as string));
    }),
  );

  if (candidates.length < 2) return { candidates, question: null };

  // Never ask more than 3 questions: then show what is left
  if (filters.length >= MAX_QUESTIONS) return { candidates, question: null };

  const asked = new Set(filters.map((f) => f.name));
  // The same question can be stored under several names: treat them as one
  if ([...asked].some((n) => /pulley/i.test(n))) asked.add("Pulley Included");
  const names = new Set<string>();
  for (const p of candidates) {
    for (const n of specs.get(p.id)?.keys() ?? []) names.add(n);
  }

  let best: { name: string; options: string[]; score: number; pref: number } | null = null;

  // Front / rear / kit is always asked first
  const ordered = [...names].sort((a, b) => Number(b === "Position") - Number(a === "Position"));
  const positionGroups = new Set(candidates.map((p) => specs.get(p.id)?.get("Position")).filter(Boolean));
  const positionFirst = !asked.has("Position") && positionGroups.size > 1;

  // Pass 0: questions about the old part. Pass 1 (only when pass 0 finds nothing and
  // parts are still left): "do you want the gasket / O-ring included?" so the customer
  // still gets a choice instead of a list.
  for (const pass of [0, 1, 2]) {
  if (best) break;
  for (const name of ordered) {
    if (positionFirst && name !== "Position") continue;
    if (asked.has(name)) continue;
    // Customers can't measure their old part: skip measurement questions
    // (hub pilot diameter, hub height, ...) and let them pick from the parts shown
    if (pass === 0 && MEASUREMENT.test(name)) continue;
    if (pass === 1 && name !== SEAL) continue;
    if (pass === 2 && !LAST_RESORT.includes(name)) continue;

    const groups = new Map<string, number>();
    for (const p of candidates) {
      const v = specs.get(p.id)?.get(name);
      if (v !== undefined) groups.set(v, (groups.get(v) ?? 0) + 1);
    }
    const singles = [...new Set([...groups.keys()].flatMap(values))];
    // Engine, then trim, are always asked when the vehicle comes in several trims, even if every
    // part fits them all: the customer confirms their own vehicle.
    const trimAlways = (name === "Trim" || name === "Engine") && singles.length >= 2;
    if (groups.size < 2 && !trimAlways) continue;
    if (singles.some((v) => v.length > 28)) continue;
    if (pass === 2 && singles.every((v, i) => singles.every((w, j) => i === j || nearlySame(v, w)))) continue;

    // Smaller biggest group = better question
    const score = trimAlways ? (name === "Engine" ? -2 : -1) : Math.max(...groups.values());
    const idx = PREFERRED.indexOf(name);
    let pref = idx === -1 ? 99 : idx;
    if (/pulley/i.test(name)) pref = -3; // easy to check on the old part, so it comes first
    // Fitment notes that a customer can see on the old part come first
    if (name.startsWith("Note: ")) {
      if (/pulley/i.test(name)) pref = -3;
      else if (/gasket|o-?ring|seal/i.test(name)) pref = -2;
      else if (/housing|kit|bypass|tensioner|thermostat|idler|belt/i.test(name)) pref = -1;
      else pref = 40;
    }

    if (!best || score < best.score || (score === best.score && pref < best.pref)) {
      best = { name, options: singles.sort(), score, pref };
    }
  }
  }

  return {
    candidates,
    question: best
      ? { name: best.name, options: orderOptions(best.name, best.options) }
      : null,
  };
}

// Turns a fitment note ("Supplied With Pulley") into a plain question
function noteQuestion(clause: string) {
  const c = clause.trim();
  if (/(without|w\/o|no)\s+pulley/i.test(c)) return "Is your old part WITHOUT a pulley (bare pump)?";
  if (/pulley/i.test(c)) return "Does your old water pump come with the pulley attached?";
  if (/gasket/i.test(c)) return "Both fit your vehicle. Do you want the gasket included in the box?";
  if (/o-?ring/i.test(c)) return "Both fit your vehicle. Do you want the O-ring included in the box?";
  const bolts = c.match(/(\d+)[ -]*bolt/i);
  if (bolts) return `Does the mounting flange of your old part have ${bolts[1]} bolts?`;
  return `Does this describe your old part: "${c}"?`;
}

export function questionText(q: SpecQuestion, count: number) {
  const lead = `I found ${count} parts for your vehicle. `;
  if (q.name === "Position") return `${lead}Which brakes are you replacing: front, rear, or a front and rear kit?`;
  if (q.name === "Heavy Duty Brakes") return `${lead}Does your vehicle have Heavy Duty brakes?`;
  if (q.name === "Caliper Pistons") return `${lead}How many pistons does your brake caliper have: 1 (single) or 2 (dual)?`;
  if (q.name === "Brake Code") return `${lead}Do you know your brake code?`;
  if (q.name === "Front Disc Size") return `${lead}What is the diameter of your front brake disc (rotor)?`;

  if (q.name === "Pulley Included") return `${lead}Does your old water pump come with the pulley attached?`;

  if (q.name.startsWith("Note: ")) {
    return `${lead}${noteQuestion(q.name.slice(6))}`;
  }
  if (q.name === SEAL) return `${lead}Both fit your vehicle. Do you want the one that comes with a gasket / O-ring in the box?`;
  if (q.name === "Impeller Material") return `${lead}Both fit your vehicle. Do you know what the impeller (the fan inside the pump) is made of?`;
  if (q.name === "Impeller Rotation") return `${lead}Both fit your vehicle. Which way does the impeller turn on your old pump?`;
  if (q.name === "Trim") return `${lead}Which trim is your vehicle?`;
  if (q.name === "Body Type") return `${lead}What body style is your vehicle?`;
  if (q.name === "Fuel Type") return `${lead}What fuel type does your vehicle use?`;
  if (q.name === "Engine") return `${lead}Which engine does your vehicle have?`;

  const yesNo = q.options.every((o) => ["yes", "no"].includes(low(o)));
  const ask = yesNo
    ? `Does your old part have "${q.name}": Yes or No?`
    : `What is the ${q.name} of your old part?`;
  return `I found ${count} parts for your vehicle. To pick the exact one: ${ask}`;
}
