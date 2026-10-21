/**
 * Simulated customers on REAL catalog data.
 * For every vehicle group (year/make/model/engine + category) with 2+ parts, and for every
 * part P in it and every distinct fitment row r of P, a "customer" owns that exact vehicle
 * (row r) and has P as the old part. They answer each question truthfully from r and P,
 * "Not sure" when their data does not state it, and "None of these" when their value is
 * not offered. We then check the invariants the brief asks for.
 */
import { groups as dbGroups, toFinderProducts as dbProducts, acesGroups, specs, refs, type Group, type Row } from "./snapshot";
// SOURCE=db (live website data, default) | aces1 | aces3 (sheets of the ACES workbook)
const SOURCE = process.env.SOURCE ?? "db";
const aces = SOURCE === "aces1" ? acesGroups("Aces_Canuck_01_29_2025") : SOURCE === "aces3" ? acesGroups("Same Engine Multi WP") : SOURCE === "aces2" ? acesGroups("Multi WP Vehicles") : null;
const groups = aces ? aces.groups : dbGroups;
const toFinderProducts = aces ? aces.products : dbProducts;
import { findPart, buildFacts, parseComment, NOT_SURE, NONE_OF_THESE, type Answer, type FinderProduct, type FinderResult } from "../../lib/part-finder";
import { addNoteSpecs, narrow, type SpecFilter } from "../../lib/axel-narrow";

const low = (s: string) => s.trim().toLowerCase();
const canon = (v: string) => { const x = low(v).replace(/\s*(in|mm)$/, ""); const n = Number(x); return Number.isFinite(n) && x !== "" ? String(n) : x; };
const eq = (a: string, b: string) => canon(a) === canon(b);
const WILD = new Set(["", "all", "alltypes", "unknown", "none", "n/a"]);

// ---- the customer's vehicle facts, read the same way the finder reads a fitment row
function vehicleFacts(products: FinderProduct[], pid: number, r: Row) {
  const fp = products.find((p) => p.id === pid)!;
  const single = { ...fp, fits: [{ trim: r.trim, engine: r.engine, fuel: r.fuel, body: r.body, comment: r.comment }] };
  return buildFacts([single], specs, refs, [])[0];
}

// ---- does product C really fit the customer's vehicle (row r)?
function reallyFits(g: Group, cid: number, r: Row, prods: FinderProduct[], truthOverride?: Map<string, string>) {
  const truth = truthOverride ?? vehicleFacts(prods, [...g.rows.keys()].find((id) => g.rows.get(id)!.includes(r))!, r).rows[0];
  return g.rows.get(cid)!.some((c) => {
    if (c.vf.engine_size_id !== r.vf.engine_size_id && c.engine !== r.engine) return false;
    if (!WILD.has(low(c.trim)) && !WILD.has(low(r.trim)) && low(c.trim) !== low(r.trim)) return false;
    const tb = truth.get("Body Type") ?? r.body;
    if (!WILD.has(low(c.body)) && !WILD.has(low(tb)) && low(c.body) !== low(tb)) return false;
    const cRow = vehicleFacts(prods, cid, c).rows[0];
    for (const [k, v] of cRow) {
      if (["Trim", "Engine", "Fuel Type", "Body Type"].includes(k)) continue;
      if (truth.has(k) && !eq(truth.get(k)!, v)) return false;
    }
    return true;
  });
}

// What the simulated customer knows
const PROFILE = process.env.PROFILE ?? "realistic";
const KNOWS_VEHICLE = new Set(["Build Date", "Caliper Pistons", "Brake Code", "Front Rotor Size", "Rear Rotor Size", "Rotor Size", "Duty Rating", "Trim", "Body Type", "Fuel Type", "Engine", "Doors", "Drive", "Position", "Brake Type", "Wheel Lugs", "Parking Brake", "Wheel Size", "Heavy Duty Brakes"]);
const KNOWS_PART = new Set(["Water Pump Drive Type", "Pulley Included", "Includes Back Housing", "Housing Included", "Thermostat And Housing Included", "Thermostat Included", "Outlet Quantity", "Application", "Pulley Flange Bolts", "Pulley Grooves", "Build Date"]);
function knows(name: string) {
  if (PROFILE === "expert" || PROFILE === "mutant") return true;
  if (KNOWS_VEHICLE.has(name)) return true;
  if (name.startsWith("Has: ")) return true; // packages: customer can check
  if (PROFILE === "realistic" && KNOWS_PART.has(name)) return true;
  return false; // "no-old-part": knows only the vehicle basics
}

type Outcome = { status: string; questions: number; pEliminated: boolean; falseClaim: boolean; repeated: boolean; badOption: boolean; trace: string[] };

// ---------------- NEW engine
function runNew(g: Group, prods: FinderProduct[], pid: number, r: Row): Outcome {
  const truthRow = new Map(vehicleFacts(prods, pid, r).rows[0]);
  // "mutant" customers: same vehicle, but one listed condition is different (e.g. no
  // heavy-duty brakes), so the old part's listing may NOT fit them
  if (PROFILE === "mutant") {
    const keys = [...truthRow.keys()].filter((k) => !["Trim", "Engine", "Fuel Type", "Body Type"].includes(k));
    if (!keys.length) return { status: "skip", questions: 0, pEliminated: false, falseClaim: false, repeated: false, badOption: false, trace: [] };
    const k = keys[(pid + r.pf.id) % keys.length];
    const v = truthRow.get(k)!;
    truthRow.set(k, v === "Yes" ? "No" : v === "No" ? "Yes" : "Something Else");
  }
  const oldPart = buildFacts([prods.find((p) => p.id === pid)!], specs, refs, [])[0].part;
  const answers: Answer[] = [];
  const trace: string[] = [];
  let res: FinderResult;
  let repeated = false, badOption = false;
  for (let i = 0; i < 20; i++) {
    res = findPart(prods, specs, answers, { refs, vehicle: g.vehicle });
    if (res.status !== "question") break;
    const q = res.question!;
    if (answers.some((a) => a.name === q.name)) repeated = true;
    // every real option must exist in a remaining part's data
    const facts = buildFacts(res.candidates, specs, refs, []);
    for (const o of q.options) {
      if (o === NOT_SURE || o === NONE_OF_THESE || ((o === "Yes" || o === "No") && q.options.includes("Yes") && q.options.includes("No"))) continue;
      const exists = facts.some((f) => f.rows.some((row) => row.has(q.name) && eq(row.get(q.name)!, o)) || (f.part.has(q.name) && eq(f.part.get(q.name)!, o)));
      if (!exists) badOption = true;
    }
    const truth = !knows(q.name) ? undefined : q.kind === "vehicle" ? truthRow.get(q.name) : oldPart.get(q.name);
    let a: string | null;
    if (truth === undefined) a = null;
    else {
      const opt = q.options.find((o) => o !== NOT_SURE && eq(o, truth));
      a = opt ?? (q.options.includes(NONE_OF_THESE) ? NONE_OF_THESE : null);
    }
    answers.push({ name: q.name, value: a });
    trace.push(`${q.name}? [${q.options.join(" / ")}] -> ${a ?? NOT_SURE}`);
  }
  res = res!;
  const ids = res.candidates.map((c) => c.id);
  const claims = res.status === "match" || res.status === "likely" ? [ids[0]] : res.status === "equivalent" ? ids : [];
  // A claim is false unless the result itself warns about the condition that does not match
  const falseClaim = claims.some((id) => {
    if (reallyFits(g, id, r, prods, truthRow)) return false;
    const d = res.details.get(id);
    const warned = d && [...truthRow].some(([k, v]) => d.conditions.some((c) => c.toLowerCase().includes(k.replace(/^(Has|Note|Part note): /, "").toLowerCase())));
    if (warned) { (globalThis as any).warnedClaims = ((globalThis as any).warnedClaims ?? 0) + 1; return false; }
    return true;
  });
  return { status: res.status, questions: answers.length, pEliminated: PROFILE === "mutant" ? false : !ids.includes(pid), falseClaim, repeated, badOption, trace };
}

// ---------------- OLD engine (lib/axel-narrow.ts as it is today)
function oldNoteFeatures(note: string): Record<string, string> {
  const f: Record<string, string> = {};
  const n = note.replace(/\s+/g, " ");
  if (/(without|w\/o|non)[ -]*heavy duty/i.test(n)) f["Heavy Duty Brakes"] = "No"; else if (/heavy duty/i.test(n)) f["Heavy Duty Brakes"] = "Yes";
  if (/\b(1|one|single)[ -]*piston/i.test(n)) f["Caliper Pistons"] = "1 piston"; else if (/\b(2|two|dual|twin)[ -]*piston/i.test(n)) f["Caliper Pistons"] = "2 piston (dual)";
  const code = n.match(/brake code[: ]*([A-Za-z0-9]{2,4})\b/i); if (code) f["Brake Code"] = code[1].toUpperCase();
  const disc = n.match(/(\d{3})\s*mm\s*front disc/i); if (disc) f["Front Disc Size"] = `${disc[1]} mm`;
  return f;
}
const oldClauses = (note: string) => note.split(/[;|\n]/).map((c) => c.replace(/=/g, "-").replace(/\s+/g, " ").trim().replace(/\.$/, "").toLowerCase());

function runOld(g: Group, prods: FinderProduct[], pid: number, r: Row): Outcome {
  const sp = new Map<number, Map<string, string>>();
  for (const p of prods) sp.set(p.id, new Map(specs.get(p.id) ?? []));
  // old code reads fits without comments
  const oldProds = prods.map((p) => ({ ...p, fits: p.fits!.map(({ comment, ...f }) => f) })) as any;
  addNoteSpecs(sp, oldProds);
  const P = prods.find((p) => p.id === pid)!;
  const filters: SpecFilter[] = [];
  const trace: string[] = [];
  let repeated = false;
  let res = narrow(oldProds, sp, filters);
  for (let i = 0; i < 20 && res.question; i++) {
    const q = res.question;
    if (filters.some((f) => f.name === q.name)) repeated = true;
    let truth: string | undefined;
    if (q.name === "Position") truth = P.position ?? undefined;
    else if (q.name === "Trim") truth = r.trim;
    else if (q.name === "Body Type") truth = r.body;
    else if (q.name === "Fuel Type") truth = r.fuel;
    else if (q.name === "Engine") truth = r.engine;
    else if (["Heavy Duty Brakes", "Caliper Pistons", "Brake Code", "Front Disc Size"].includes(q.name)) truth = oldNoteFeatures(r.comment)[q.name];
    else if (q.name.startsWith("Note: ")) truth = oldClauses(r.comment).includes(q.name.slice(6).toLowerCase()) ? "Yes" : "No";
    else truth = sp.get(pid)?.get(q.name);
    if (!knows(q.name.startsWith("Note: ") ? "x" : q.name)) truth = undefined;
    const opt = truth === undefined ? undefined : q.options.find((o) => low(o) === low(truth!));
    const a = opt ?? null;
    filters.push({ name: q.name, value: a });
    trace.push(`${q.name}? [${q.options.join(" / ")}] -> ${a ?? "Not sure"}`);
    res = narrow(oldProds, sp, filters);
  }
  const ids = res.candidates.map((c: any) => c.id);
  const eliminated = !ids.includes(pid);
  let status: string;
  let claims: number[] = [];
  if (res.candidates.length === 0) { status = "fallback-all (answer matched nothing)"; }
  else if (res.candidates.length === 1) { status = "single ('This is the part that fits')"; claims = ids; }
  else if (filters.length > 0 && !filters.every((f) => f.value === null) && !filters.some((f) => f.value === null)) { status = "several ('All N of these fit your vehicle')"; claims = ids; }
  else status = "several (can't confirm)";
  const falseClaim = claims.some((id) => !reallyFits(g, id, r, prods));
  return { status, questions: filters.length, pEliminated: eliminated, falseClaim, repeated, badOption: false, trace };
}

// ---------------- run
const stats: Record<string, any> = { new: {}, old: {} };
const examples: Record<string, any[]> = {};
let cases = 0;
const bump = (o: any, k: string) => (o[k] = (o[k] ?? 0) + 1);
for (const g of groups.values()) {
  if (g.productIds.length < 2) continue;
  const prods = toFinderProducts(g);
  for (const pid of g.productIds) {
    const seen = new Set<string>();
    for (const r of g.rows.get(pid)!) {
      const sig = `${r.trim}|${r.body}|${r.comment}|${r.fuel}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      cases++;
      for (const [name, fn] of (PROFILE === "mutant" ? [["new", runNew]] : [["new", runNew], ["old", runOld]]) as [string, typeof runNew][]) {
        const o = fn(g, prods, pid, r);
        const s = stats[name];
        bump(s, `status: ${o.status}`);
        if (o.pEliminated && !o.status.startsWith("fallback")) bump(s, "!! correct part wrongly eliminated");
        if (o.pEliminated && o.status.startsWith("fallback")) bump(s, "!! correct part eliminated (fell back to full list)");
        if (o.falseClaim) bump(s, "!! claimed a part fits that does not fit this exact vehicle");
        if (o.repeated) bump(s, "!! repeated a question");
        if (o.badOption) bump(s, "!! offered an option not in the data");
        s.questions = (s.questions ?? 0) + o.questions;
        const ek = `${name}:${o.status}${o.falseClaim ? ":FALSE" : ""}${o.pEliminated ? ":ELIM" : ""}`;
        (examples[ek] ??= []).length < 4 && examples[ek].push({ vehicle: g.vehicle, cat: g.category, sku: prods.find((p) => p.id === pid)!.sku, trim: r.trim, body: r.body, comment: r.comment, trace: o.trace, left: undefined });
      }
    }
  }
}
for (const k of ["new", "old"]) if (stats[k].questions) stats[k].avgQuestions = +(stats[k].questions / cases).toFixed(2);
let multi = 0; for (const g of groups.values()) if (g.productIds.length >= 2) multi++;
console.log(JSON.stringify({ source: SOURCE, groupsWithSeveralParts: multi, profile: PROFILE, cases, stats, warnedConditionalClaims: (globalThis as any).warnedClaims ?? 0 }, null, 1));
import("node:fs").then((fs) => fs.writeFileSync(new URL(`./data/sim-examples-${SOURCE}-${PROFILE}.json`, import.meta.url), JSON.stringify(examples, null, 1)));
