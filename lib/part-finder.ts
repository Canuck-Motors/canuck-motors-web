/**
 * Axel's part finder: narrows the parts that fit a vehicle by asking questions that are
 * generated from the REAL data of the parts that are still possible.
 *
 * Pure module (no database access), so it can be tested offline:
 *   - every question and every answer option comes from the remaining parts' fitment rows,
 *     fitment comments and specifications; nothing is hard-coded per vehicle
 *   - an answer only removes a part when that part's data clearly says something else
 *     (missing data never removes a part, but it is reported as "not confirmed")
 *   - vehicle facts are checked per fitment row, so a part only survives when ONE of its
 *     fitment rows agrees with ALL the vehicle answers together
 *   - nothing is ever invented: when the data cannot separate the parts, the result says so
 */

export type FitRow = { trim: string; engine: string; fuel: string; body: string; comment?: string };

export type FinderProduct = {
  id: number;
  product_name: string;
  sku: string | null;
  price: number | null;
  position: string | null;
  url: string;
  notes?: string[];
  fits?: FitRow[];
};

export type SpecMap = Map<number, Map<string, string>>;
export type Answer = { name: string; value: string | null }; // null = "Not sure"
export type RefMap = Map<number, { label: string; norm: string }[]>;

export const NOT_SURE = "Not sure";
export const NONE_OF_THESE = "None of these";
// Questions asked before a result is shown. The customer can ask for more after that
// (the chat raises the limit by passing opts.maxQuestions).
export const DEFAULT_MAX_QUESTIONS = 6;
const MAX_OPTIONS = 12;

type Kind = "vehicle" | "part" | "measure" | "preference";
type DimInfo = { kind: Kind; rank: number };

// ---------------------------------------------------------------------------
// Dimensions: what can be asked, how easy it is for a customer to answer
// (lower rank = asked first), and whether it is about the vehicle or the old part.
// ---------------------------------------------------------------------------
const DIMS: Record<string, DimInfo> = {
  Position: { kind: "part", rank: 0 },
  "Brake Type": { kind: "part", rank: 1 },
  "Body Type": { kind: "vehicle", rank: 2 },
  Doors: { kind: "vehicle", rank: 3 },
  "Fuel Type": { kind: "vehicle", rank: 4 },
  Engine: { kind: "vehicle", rank: 5 },
  Trim: { kind: "vehicle", rank: 6 },
  Drive: { kind: "vehicle", rank: 7 },
  "Heavy Duty Brakes": { kind: "vehicle", rank: 8 },
  "Duty Rating": { kind: "vehicle", rank: 8 },
  "Wheel Lugs": { kind: "vehicle", rank: 9 },
  "Parking Brake": { kind: "vehicle", rank: 9 },
  "Wheel Size": { kind: "vehicle", rank: 10 },
  "Caliper Pistons": { kind: "vehicle", rank: 11 },
  "Front Rotor Size": { kind: "vehicle", rank: 12 },
  "Rear Rotor Size": { kind: "vehicle", rank: 12 },
  "Rotor Size": { kind: "vehicle", rank: 12 },
  "Valve Train": { kind: "vehicle", rank: 13 },
  Aspiration: { kind: "vehicle", rank: 13 },
  "Engine Code": { kind: "vehicle", rank: 14 },
  "Build Date": { kind: "vehicle", rank: 15 },
  "Brake Code": { kind: "vehicle", rank: 16 },
  Application: { kind: "part", rank: 20 },
  "Water Pump Drive Type": { kind: "part", rank: 21 },
  "Pulley Included": { kind: "part", rank: 22 },
  "Includes Back Housing": { kind: "part", rank: 23 },
  "Housing Included": { kind: "part", rank: 23 },
  "Thermostat And Housing Included": { kind: "part", rank: 24 },
  "Thermostat Included": { kind: "part", rank: 24 },
  "Outlet Quantity": { kind: "part", rank: 25 },
  "Flange Bolts": { kind: "part", rank: 26 },
  "Pulley Flange Bolts": { kind: "part", rank: 26 },
  "Pulley Grooves": { kind: "part", rank: 26 },
  "Timing Belt Driven": { kind: "part", rank: 27 },
  "Fan Clutch Included": { kind: "part", rank: 28 },
  "Impeller Material": { kind: "part", rank: 30 }, // "Plastic Impeller" / "Metal Impeller" in the notes
  "Housing Material": { kind: "part", rank: 31 },
  "Impeller Rotation": { kind: "part", rank: 32 },
  "Hub Diameter (in)": { kind: "measure", rank: 40 },
  "Hub Height": { kind: "measure", rank: 41 },
  "Hub Height (in)": { kind: "measure", rank: 41 },
  "Hub Pilot Diameter": { kind: "measure", rank: 42 },
  "Thermostat Opening (in)": { kind: "measure", rank: 43 },
  "Pad Material": { kind: "preference", rank: 60 },
  "Seal In Box": { kind: "preference", rank: 61 },
  Contents: { kind: "preference", rank: 62 },
  "Mounting Hardware Included": { kind: "preference", rank: 63 },
};
// Never asked: customers found the fuel question (Gas / Flex / LPG / CNG ...) confusing.
// Fuel still counts when the data lists it; parts that differ only by fuel are shown side by side.
// "Fan Clutch Included" is "No" on every pump; "Timing Belt Driven" repeats the drive type question.
// "Impeller Rotation" can't be judged by looking at a pump.
const NEVER_ASK = new Set(["Fuel Type", "Fan Clutch Included", "Timing Belt Driven", "Impeller Rotation"]);
const VEHICLE_NOTE_RANK = 18;
const PART_NOTE_RANK = 33;
const UNKNOWN_SPEC_RANK = 35;
const PAD_MEASURE_RANK = 45;

// Spec names in product_specifications -> the dimension they describe
const SPEC_ALIAS: Record<string, string> = {
  "Brake Pad Material": "Pad Material",
  "Application Description": "Application",
  Type: "Application",
};
// Specs that never decide fitment and are never asked
const SPEC_IGNORE = /^(installation warnings|position)$/i;

function dimInfo(name: string): DimInfo {
  if (DIMS[name]) return DIMS[name];
  if (name.startsWith("Has: ")) return { kind: "vehicle", rank: 9 };
  if (name.startsWith("Note: ")) return { kind: "vehicle", rank: VEHICLE_NOTE_RANK };
  if (name.startsWith("Part note: ")) return { kind: "part", rank: PART_NOTE_RANK };
  if (/thickness|width|height|length|diameter|depth/i.test(name)) return { kind: "measure", rank: PAD_MEASURE_RANK };
  return { kind: "part", rank: UNKNOWN_SPEC_RANK };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const low = (s: string) => s.trim().toLowerCase();
export const normNumber = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const FUEL_WORDS = new Set(["gas", "flex", "flexfuel", "ffv", "e85", "cng", "lpg", "propane", "diesel", "electric", "hybrid", "all", "bi-fuel", "bifuel", "alltypes", "none"]);
const FUEL_NAMES: Record<string, string> = { gas: "Gas", flex: "Flex Fuel", flexfuel: "Flex Fuel", ffv: "Flex Fuel", e85: "Flex Fuel", diesel: "Diesel", cng: "CNG", lpg: "LPG", propane: "Propane", electric: "Electric", hybrid: "Hybrid", phev: "Plug-in Hybrid", bev: "Electric" };
const fuelName = (f: string) => FUEL_NAMES[low(f).replace(/[^a-z0-9]/g, "")] ?? f.trim();
const WILDCARD = new Set(["", "all", "alltypes", "unknown", "none", "n/a"]);

function title(s: string) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

// Values that mean the same thing ("Yes"/"yes", "2.9 IN"/"2.9") compare equal;
// numbers compare by value. Different numbers are NEVER merged (2.9 != 2.91).
function canon(v: string) {
  const x = low(v).replace(/\s*(in|inch|inches|mm)\.?$/, "").replace(/\s+/g, " ");
  const n = Number(x);
  return Number.isFinite(n) && x !== "" ? String(n) : x;
}
const eq = (a: string, b: string) => canon(a) === canon(b);

// ---------------------------------------------------------------------------
// Reading fitment comments ("Base; GAS; OE Replacement; Hub Diameter(in):2.66;
// Includes Water Pump Gasket", "Front: 1 Piston Caliper;OE Ceramic, Rear: OE Ceramic")
// ---------------------------------------------------------------------------
type Parsed = { vehicle: Map<string, string>; part: Map<string, string>; seal: Set<string>; info: string[]; refs: string[] };

const BODY_WORDS: Record<string, string> = {
  sedan: "Sedan",
  coupe: "Coupe",
  hatchback: "Hatchback",
  wagon: "Wagon",
  convertible: "Convertible",
  "sport utility": "Sport Utility",
  "mini passenger van": "Mini Passenger Van",
  "crew cab pickup": "Crew Cab Pickup",
  "extended cab pickup": "Extended Cab Pickup",
  "standard cab pickup": "Standard Cab Pickup",
};

// Features written as "with X" / "without X" / "X" / "Exc. X"
const FEATURE_ALIAS: [RegExp, string][] = [
  [/heavy duty brake|^heavy duty$/i, "Heavy Duty Brakes"],
  [/heavy duty cooling/i, "Has: Heavy Duty Cooling"],
  [/police|pursuit/i, "Has: Police Package"],
  [/6 piston big brake kit|big brake kit/i, "Has: 6 Piston Big Brake Kit"],
  [/(third|3rd|3) row/i, "Has: Third Row Seating"],
  [/control active brake|active brake control/i, "Has: Active Brake Control"],
  [/brembo/i, "Has: Brembo Brakes"],
  [/alcon/i, "Has: Alcon Brake Package"],
  [/eco package/i, "Has: Eco Package"],
  [/sport package/i, "Has: Sport Package"],
  [/oil cooler/i, "Has: Oil Cooler"],
  [/vehicle dynamics control|\bvdc\b/i, "Has: Vehicle Dynamics Control"],
  [/wear indicator/i, "Has: Brake Wear Indicator"],
  [/spreading fingers/i, "Has: Spreading-Finger Pad Clips"],
  [/power adjusting pedals/i, "Has: Power Adjustable Pedals"],
  [/brake vacuum power/i, "Has: Vacuum Brake Booster"],
  [/japan production|made in mexico/i, ""], // handled as plain notes
  [/\bac\b|a\/c|air condition/i, "Has: Air Conditioning"],
];
const INFO_ONLY =
  /torque-to-yield|cannot be reused|reinstalled|^recommend|^grade|^oe replacement$|^for engine cooling$|^upgraded steel piston|serviced with front cover|^includes:/i;
const PART_WORDS =
  /includ|pump|housing|pulley|impeller|gasket|o-?ring|seal|cover|inlet|hose|thermostat|flange|groove|body$|primary/i;

function featureLabel(rest: string): string | null {
  for (const [re, label] of FEATURE_ALIAS) if (re.test(rest)) return label || null;
  return null;
}

function splitClauses(comment: string): string[] {
  return comment
    .replace(/=/g, "-") // "=" separates question and answer in "Spec: X = Y"
    .replace(/Police,\s*Pursuit/gi, "Police Pursuit")
    .replace(/\b(Front|Rear)\s*:/g, ";")
    .split(/[;,\n|]/)
    .map((c) => c.replace(/\s+/g, " ").trim().replace(/\.$/, ""))
    .filter(Boolean);
}

export function parseComment(comment: string, row?: { trim?: string }, isBrake = true): Parsed {
  const out: Parsed = { vehicle: new Map(), part: new Map(), seal: new Set(), info: [], refs: [] };
  const trim = low(row?.trim ?? "");
  const setV = (k: string, v: string) => out.vehicle.set(k, v);
  const setP = (k: string, v: string) => out.part.set(k, v);

  // Production date ranges ("From 04/01/2003", "To 01/30/2006") form ONE fact
  let builtFrom: string | null = null;
  let builtTo: string | null = null;

  for (const c of splitClauses(comment)) {
    const l = low(c);
    if (!/#|vin|chassis/i.test(c)) {
      const fr = c.match(/^from\s+(\S+)(?:\s+to\s+(\S+))?$/i);
      if (fr) { builtFrom = fr[1]; if (fr[2]) builtTo = fr[2]; continue; }
      const to = c.match(/^to\s+(\S+)$/i);
      if (to) { builtTo = to[1]; continue; }
    }
    if (!l || l === trim || FUEL_WORDS.has(l.replace(/\s/g, ""))) continue;
    if (/^[\d!]+$/.test(l) || l.length <= 2 || /^(exc|manual|lx|v|h)$/i.test(l)) continue; // stray tokens

    // ---- reference numbers
    const fmsi = c.match(/FMSI Number:?\s*([A-Z0-9-]+)/i);
    if (fmsi) {
      out.refs.push(fmsi[1]);
      continue;
    }

    // ---- product facts
    let m: RegExpMatchArray | null;
    if ((m = c.match(/hub diameter\s*\(in\)\s*:?\s*([\d.]+)/i))) { setP("Hub Diameter (in)", m[1]); continue; }
    if ((m = c.match(/^([\d.]+)"\s*hub height/i))) { setP("Hub Height (in)", m[1]); continue; }
    if ((m = c.match(/^([\d.]+)"\s*diameter thermostat opening/i))) { setP("Thermostat Opening (in)", m[1]); continue; }
    if (/^(metal|plastic|stamped steel|cast iron) impeller$/i.test(c)) { setP("Impeller Material", title(c.replace(/\s*impeller$/i, ""))); continue; }
    if (/^(aluminum|cast iron|plastic) body$/i.test(c)) { setP("Housing Material", title(c.replace(/\s*body$/i, ""))); continue; }
    if (/(supplied|included) with pulley|^with pulley$/i.test(c)) { setP("Pulley Included", "Yes"); continue; }
    if (/(without|w\/o|no) pulley/i.test(c)) { setP("Pulley Included", "No"); continue; }
    // "With Water Pump Housing" in the notes is the same thing as the spec "Includes Back Housing"
    if (/^(with water pump housing|pump with housing|with housing)$/i.test(c)) { setP("Includes Back Housing", "Yes"); continue; }
    if (/^(without water pump housing|pump without housing)$/i.test(c)) { setP("Includes Back Housing", "No"); continue; }
    if (/^includes thermostat$/i.test(c)) { setP("Thermostat Included", "Yes"); continue; }
    if (/^primary pump$/i.test(c)) { setP("Application", "Main Engine"); continue; }
    if ((m = c.match(/^(\d)[ -]bolt pulley flange$/i))) { setP("Pulley Flange Bolts", m[1]); continue; }
    if ((m = c.match(/^(\d)[ -]bolt flange$/i))) { setP("Pulley Flange Bolts", m[1]); continue; }
    if ((m = c.match(/^(\d+) groove pulley$/i))) { setP("Pulley Grooves", m[1]); continue; }
    if (/^oe ceramic$|ceramic$/i.test(c)) { setP("Pad Material", "Ceramic"); continue; }
    if (/semi[ -]?metallic/i.test(c)) { setP("Pad Material", "Semi-Metallic"); continue; }
    if (/includes?.*(gasket|o-?ring|seal)/i.test(c)) {
      if (/o-?ring/i.test(c)) out.seal.add("O-Ring");
      if (/gasket/i.test(c)) out.seal.add("Gasket");
      if (/seal/i.test(c) && !/gasket|o-?ring/i.test(c)) out.seal.add("Seal");
      continue;
    }
    if (INFO_ONLY.test(c)) { out.info.push(c); continue; }

    // ---- vehicle facts
    const body = BODY_WORDS[l];
    if (body) { setV("Body Type", body); continue; }
    if ((m = c.match(/^(\d) door$/i))) { setV("Doors", m[1]); continue; }
    if (/^(rwd|fwd|awd|4wd)$/i.test(c)) { setV("Drive", c.toUpperCase()); continue; }
    if (/^(sohc|dohc)$/i.test(c)) { setV("Valve Train", c.toUpperCase()); continue; }
    if (/^naturally aspirated$/i.test(c)) { setV("Aspiration", "Naturally Aspirated"); continue; }
    if ((m = c.match(/(\d)\s*lug/i))) { setV("Wheel Lugs", m[1]); continue; }
    if ((m = c.match(/^(\d{2}) inch$/i))) { setV("Wheel Size", `${m[1]} inches`); continue; }
    if (/(manual|mechanical) (operated )?parking brake/i.test(c)) { setV("Parking Brake", "Manual"); continue; }
    if (/(electric|power) (operated )?parking brake/i.test(c)) { setV("Parking Brake", "Electric"); continue; }
    if (/standard (duty|brakes)/i.test(c)) { setV(isBrake ? "Heavy Duty Brakes" : "Duty Rating", isBrake ? "No" : "Standard Duty"); continue; }
    if (!isBrake && /^heavy duty$/i.test(c)) { setV("Duty Rating", "Heavy Duty"); continue; }
    if ((m = c.match(/brake code:?\s*([A-Z0-9]{2,4})\b/i))) {
      setV("Brake Code", m[1].toUpperCase());
      if (/piston/i.test(c)) setV("Caliper Pistons", /(dual|2|two)/i.test(c) ? "2" : "1");
      continue;
    }
    if (!/big brake/i.test(c) && (m = c.match(/\b(1|single|one|2|dual|two|twin)[ -]*piston/i))) {
      setV("Caliper Pistons", /^(1|single|one)$/i.test(m[1]) ? "1" : "2");
      continue;
    }
    const discs = [...c.matchAll(/(\d{3})\s*mm\s*(front|rear)?\s*disc/gi)];
    if (discs.length) {
      for (const d of discs) {
        const pos = d[2] ? title(d[2]) : null;
        setV(pos ? `${pos} Rotor Size` : "Rotor Size", `${d[1]} mm`);
      }
      continue;
    }
    if ((m = c.match(/rotor diameter\s*(\d{3})\s*mm/i))) { setV("Rotor Size", `${m[1]} mm`); continue; }
    if ((m = c.match(/^([A-Z]{1,2}\d{2}[A-Z]\d{1,2}|[A-Z]\d{2}[A-Z]\d{2}[A-Z]|EJ\d{3})$/))) { setV("Engine Code", m[1]); continue; }

    // with / without features
    const neg = c.match(/^(?:w\/o|without|exc\.?|excluding|non)\s+(.+)$/i);
    const pos = c.match(/^(?:w\/|with)\s+(.+)$/i);
    const rest = neg?.[1] ?? pos?.[1] ?? c;
    const label = featureLabel(rest);
    if (label) {
      setV(label, neg ? "No" : "Yes");
      continue;
    }

    // anything else: a plain note, kept word for word
    if (PART_WORDS.test(c)) setP(`Part note: ${c}`, "Yes");
    else setV(`Note: ${c}`, "Yes");
  }
  if (builtFrom || builtTo) {
    setV("Build Date", builtFrom && builtTo ? `${builtFrom} to ${builtTo}` : builtFrom ? `${builtFrom} or later` : `Up to ${builtTo}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Building the facts of every candidate part
// ---------------------------------------------------------------------------
type Row = Map<string, string>; // vehicle dimension -> value (missing = not stated)
export type Facts = {
  product: FinderProduct;
  rows: Row[];
  part: Map<string, string>; // part / measure / preference dimension -> value
  info: string[];
  refs: { label: string; norm: string }[];
};

export type DataIssue = { sku: string | null; issue: string };

export function buildFacts(products: FinderProduct[], specs: SpecMap, refs: RefMap | undefined, issues: DataIssue[]): Facts[] {
  return products.map((p) => {
    const rows: Row[] = [];
    const notePart = new Map<string, Set<string>>();
    const seal = new Set<string>();
    let rowsWithSealInfo = 0;
    const info = new Set<string>();
    const refList: { label: string; norm: string }[] = [];

    const isBrake = /brake|pad|rotor|caliper|shoe/i.test(p.product_name);
    const fits = p.fits?.length ? p.fits : [{ trim: "", engine: "", fuel: "", body: "", comment: (p.notes ?? []).join("; ") }];
    for (const f of fits) {
      const row: Row = new Map();
      if (!WILDCARD.has(low(f.trim))) row.set("Trim", f.trim.trim());
      if (!WILDCARD.has(low(f.engine))) row.set("Engine", f.engine.trim());
      if (!WILDCARD.has(low(f.fuel))) row.set("Fuel Type", fuelName(f.fuel));
      if (!WILDCARD.has(low(f.body))) row.set("Body Type", f.body.trim());
      const parsed = parseComment(f.comment ?? "", f, isBrake);
      for (const [k, v] of parsed.vehicle) {
        // A comment never overrides a structured column, but fills it in when it is empty
        if (!row.has(k)) row.set(k, v);
      }
      for (const [k, v] of parsed.part) (notePart.get(k) ?? notePart.set(k, new Set()).get(k)!).add(v);
      if (parsed.seal.size) rowsWithSealInfo++;
      for (const s of parsed.seal) seal.add(s);
      parsed.info.forEach((i) => info.add(i));
      for (const r of parsed.refs) refList.push({ label: `FMSI ${r}`, norm: normNumber(r) });
      rows.push(row);
    }

    // Part facts: the specification table wins; fitment-comment facts fill the gaps.
    const part = new Map<string, string>();
    const own = specs.get(p.id) ?? new Map<string, string>();
    for (const [rawName, rawValue] of own) {
      if (SPEC_IGNORE.test(rawName) || !String(rawValue ?? "").trim()) continue;
      const name = SPEC_ALIAS[rawName] ?? rawName;
      const value = String(rawValue).trim();
      if (part.has(name) && !eq(part.get(name)!, value)) {
        issues.push({ sku: p.sku, issue: `specs "${rawName}" and "${name}" disagree (${value} vs ${part.get(name)})` });
        part.delete(name);
        continue;
      }
      part.set(name, value);
    }
    for (const [name, vals] of notePart) {
      if (vals.size > 1) {
        // The same part is described differently on different fitment rows: do not trust either value
        if (!name.startsWith("Part note: ")) {
          issues.push({ sku: p.sku, issue: `fitment comments disagree on ${name}: ${[...vals].join(" / ")}` });
        }
        continue;
      }
      const v = [...vals][0];
      if (name.startsWith("Part note: ")) {
        // Only a fact when EVERY fitment row of the part says it
        const everyRow = fits.every((f) => parseComment(f.comment ?? "", f, isBrake).part.has(name));
        if (everyRow) part.set(name, v);
        continue;
      }
      if (part.has(name)) {
        if (!eq(part.get(name)!, v)) {
          issues.push({ sku: p.sku, issue: `spec ${name} = ${part.get(name)} but fitment comment says ${v}` });
        }
        continue; // the spec table wins
      }
      part.set(name, v);
    }
    // A chain-driven pump has no pulley flange: nothing for pulley bolts to hold.
    // So a customer who counts pulley bolts on their old pump does not have this one.
    if (!part.has("Pulley Flange Bolts") && /\bchain\b/i.test(part.get("Water Pump Drive Type") ?? "")) {
      part.set("Pulley Flange Bolts", "None (chain driven)");
    }
    if (seal.size && rowsWithSealInfo === fits.length && !part.has("Contents")) part.set("Seal In Box", [...seal].sort().join(" + "));
    if (p.position) part.set("Position", p.position);
    for (const r of refs?.get(p.id) ?? []) refList.push(r);
    if (p.sku) refList.push({ label: `Canuck Motors ${p.sku}`, norm: normNumber(p.sku) });

    return { product: p, rows, part, info: [...info], refs: refList };
  });
}

// ---------------------------------------------------------------------------
// Applying the customer's answers
// ---------------------------------------------------------------------------
function rowAgrees(row: Row, answers: Answer[]) {
  return answers.every((a) => a.value === null || !isVehicleDim(a.name) || !row.has(a.name) || eq(row.get(a.name)!, a.value));
}
function isVehicleDim(name: string) {
  return dimInfo(name).kind === "vehicle";
}
function consistentRows(f: Facts, answers: Answer[]) {
  return f.rows.filter((r) => rowAgrees(r, answers));
}
function partAgrees(f: Facts, answers: Answer[]) {
  return answers.every((a) => {
    if (a.value === null || isVehicleDim(a.name)) return true;
    const v = f.part.get(a.name);
    return v === undefined || eq(v, a.value);
  });
}
function survives(f: Facts, answers: Answer[]) {
  return consistentRows(f, answers).length > 0 && partAgrees(f, answers);
}

// Answers the part's data does not state (so they are not confirmed for this part)
function unconfirmed(f: Facts, answers: Answer[]): Answer[] {
  const rows = consistentRows(f, answers);
  return answers.filter((a) => {
    if (a.value === null || eq(a.value, NONE_OF_THESE)) return false;
    if (isVehicleDim(a.name)) return !rows.some((r) => r.has(a.name) && eq(r.get(a.name)!, a.value!));
    return !f.part.has(a.name);
  });
}

// ---------------------------------------------------------------------------
// Choosing the next question
// ---------------------------------------------------------------------------
export type Question = {
  name: string; // dimension, sent back as "Spec: <name> = <option>"
  options: string[]; // real values from the remaining parts (+ None of these / Not sure)
  text: string;
  kind: Kind;
};

type Candidate = { name: string; options: string[]; kind: Kind; rank: number; expected: number };

function valuesFor(f: Facts, name: string, answers: Answer[]): { values: string[]; open: boolean } {
  if (isVehicleDim(name)) {
    const rows = consistentRows(f, answers);
    const values = rows.filter((r) => r.has(name)).map((r) => r.get(name)!);
    return { values, open: rows.some((r) => !r.has(name)) };
  }
  const v = f.part.get(name);
  return v === undefined ? { values: [], open: true } : { values: [v], open: false };
}

function orderOptions(name: string, options: string[]) {
  const rank = (o: string) => {
    const x = low(o);
    if (name === "Position") return x === "front" ? 0 : x === "rear" ? 1 : 2;
    if (x === "yes") return 0;
    if (x === "no") return 1;
    return 2;
  };
  const num = (o: string) => parseFloat(o.replace(/[^0-9.]/g, ""));
  return [...options].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    const na = num(a);
    const nb = num(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

// Measurements that differ by under 3% (2.85 in vs 2.86 in) cannot be told apart with a ruler
function tooClose(name: string, options: string[]) {
  if (dimInfo(name).kind !== "measure" || options.length < 2) return false;
  const nums = options.map((o) => parseFloat(o.replace(/[^0-9.]/g, "")));
  if (nums.some((n) => !Number.isFinite(n))) return false;
  return nums.every((a) => nums.every((b) => Math.abs(a - b) / Math.max(a, b) < 0.03));
}

// Could some answer to this dimension keep one of the parts but drop another?
function separation(facts: Facts[], name: string, answers: Answer[]) {
  const per = facts.map((f) => valuesFor(f, name, answers));
  const options: string[] = [];
  for (const p of per) for (const v of p.values) if (!options.some((o) => eq(o, v))) options.push(v);
  const yesNo = options.length > 0 && options.every((o) => ["yes", "no"].includes(low(o)));
  const real = yesNo ? ["Yes", "No"] : options;
  const keeps = (c: string) => per.filter((p) => p.open || p.values.some((v) => eq(v, c))).length;
  const realLeft = real.map(keeps);
  const noneLeft = per.filter((p) => p.open).length; // answer "None of these"
  const splits = (n: number) => n > 0 && n < facts.length;
  const close = tooClose(name, options);
  return { per, options, yesNo, realLeft, noneLeft, separates: !close && (realLeft.some(splits) || (!yesNo && options.length > 0 && splits(noneLeft))), realSeparates: !close && realLeft.some(splits) };
}

// Vehicle facts can separate parts only in combination: part A fits the ST trim and the
// Extended Cab, but not the ST Extended Cab. Returns the unanswered vehicle dimensions of a
// real vehicle configuration that some remaining part does NOT fit (empty = none).
function comboSplit(facts: Facts[], answers: Answer[]): string[] {
  const asked = new Set(answers.map((a) => a.name));
  const compatible = (a: Row, b: Row) => [...a].every(([k, v]) => !b.has(k) || eq(b.get(k)!, v));
  for (const f of facts) {
    for (const row of consistentRows(f, answers)) {
      const free = [...row.keys()].filter((k) => !asked.has(k) && !NEVER_ASK.has(k));
      if (free.length < 2) continue;
      const fitsAll = facts.every((g) => consistentRows(g, answers).some((r) => compatible(row, r)));
      if (!fitsAll) return free.sort((a, b) => dimInfo(a).rank - dimInfo(b).rank);
    }
  }
  return [];
}

// Does anything that decides fitment (not a preference) still separate the parts,
// including questions the customer answered "Not sure"?
function fitmentOpen(facts: Facts[], answers: Answer[], names: Set<string>) {
  for (const n of names) {
    if (dimInfo(n).kind === "preference") continue;
    const notSure = answers.some((a) => a.name === n && a.value === null);
    if (answers.some((a) => a.name === n) && !notSure) continue;
    if (separation(facts, n, notSure ? answers.filter((a) => a.name !== n) : answers).separates) return true;
  }
  return comboSplit(facts, answers.filter((a) => a.value !== null)).length > 0;
}

function pickQuestion(facts: Facts[], answers: Answer[]): Candidate | null {
  const asked = new Set(answers.map((a) => a.name));
  const names = new Set<string>();
  for (const f of facts) {
    for (const r of consistentRows(f, answers)) for (const k of r.keys()) names.add(k);
    for (const k of f.part.keys()) names.add(k);
  }

  let best: Candidate | null = null;
  for (const name of names) {
    if (asked.has(name) || NEVER_ASK.has(name)) continue;
    const info = dimInfo(name);
    // Customers can't measure hub diameters or pad sizes: never asked (shown in the result)
    if (info.kind === "measure" || /diameter|height|width|thickness|length/i.test(name)) continue;
    const sep = separation(facts, name, answers);
    const options = sep.options;
    if (!options.length || options.length > MAX_OPTIONS) continue;
    if (options.some((o) => o.length > 40)) continue;
    const yesNo = sep.yesNo;
    // Useful only when a real answer (not just "None of these") keeps some parts but not
    // all of them. A condition every part shares is shown with the result instead.
    if (!sep.realSeparates) continue;
    const realLeft = sep.realLeft;
    // Preferences are only asked when every remaining part is otherwise confirmed and
    // nothing that decides fitment still separates them
    if (info.kind === "preference" && (facts.some((f) => unconfirmed(f, answers).length) || fitmentOpen(facts, answers, names))) continue;

    const expected = realLeft.reduce((s, n) => s + n, 0) / realLeft.length;
    const cand: Candidate = { name, options: yesNo ? ["Yes", "No"] : orderOptions(name, options), kind: info.kind, rank: info.rank, expected };
    if (!best || cand.rank < best.rank || (cand.rank === best.rank && cand.expected < best.expected)) best = cand;
  }
  if (best) return best;

  // Second pass, when the customer was not sure about the rest: things they can SEE on
  // the old part that only some parts' notes mention ("Aluminum Body", "Plastic Impeller",
  // "Water Pump Mounting Cover"). Answering the stated value favours those parts;
  // "None of these" removes them.
  for (const name of names) {
    if (asked.has(name) || NEVER_ASK.has(name)) continue;
    const info = dimInfo(name);
    if (info.kind !== "part") continue;
    const sep = separation(facts, name, answers);
    if (!sep.separates || !sep.options.length || sep.options.length > MAX_OPTIONS || sep.options.some((o) => o.length > 40)) continue;
    // A Yes / No feature is only worth asking when some part actually HAS it
    if (sep.yesNo && !sep.options.some((o) => low(o) === "yes")) continue;
    const cand: Candidate = { name, options: sep.yesNo ? ["Yes", "No"] : orderOptions(name, sep.options), kind: info.kind, rank: info.rank, expected: facts.length };
    if (!best || cand.rank < best.rank) best = cand;
  }
  if (best) return best;

  // No single fact separates the parts, but a combination does: ask the easiest fact of
  // that combination first; the next question then separates them.
  for (const name of comboSplit(facts, answers)) {
    const sep = separation(facts, name, answers);
    if (sep.options.length < 2 || sep.options.length > MAX_OPTIONS || sep.options.some((o) => o.length > 40)) continue;
    const info = dimInfo(name);
    return { name, options: sep.yesNo ? ["Yes", "No"] : orderOptions(name, sep.options), kind: info.kind, rank: info.rank, expected: facts.length };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Wording (plain, short; options are the real values)
// ---------------------------------------------------------------------------
function noteQuestion(clause: string): string {
  const from = clause.match(/^from\s+(.+?)(?:\s+to\s+(.+))?$/i);
  if (from) return from[2] ? `Was your vehicle built between ${from[1]} and ${from[2]}?` : `Was your vehicle built on or after ${from[1]}?`;
  const to = clause.match(/^to\s+(.+)$/i);
  if (to) return `Was your vehicle built on or before ${to[1]}?`;
  return `Does this describe your vehicle: "${clause}"?`;
}

export function questionWording(name: string, count: number): string {
  const lead = `${count} parts still match.`;
  const q = ((): string => {
    if (name === "Position") return "Which brakes are you replacing?";
    if (name === "Brake Type") return "Does your vehicle have disc or drum brakes at that position?";
    if (name === "Body Type") return "What body style is your vehicle?";
    if (name === "Doors") return "How many doors does your vehicle have?";
    if (name === "Fuel Type") return "What fuel does your vehicle use?";
    if (name === "Engine") return "Which engine does your vehicle have?";
    if (name === "Trim") return "Which trim is your vehicle?";
    if (name === "Drive") return "Which drive type does your vehicle have?";
    if (name === "Heavy Duty Brakes") return "Does your vehicle have heavy-duty brakes?";
    if (name === "Duty Rating") return "Is your vehicle the standard-duty or heavy-duty version?";
    if (name === "Wheel Lugs") return "How many lug nuts are on each wheel?";
    if (name === "Parking Brake") return "What kind of parking brake does your vehicle have?";
    if (name === "Wheel Size") return "What size are your wheels?";
    if (name === "Caliper Pistons") return "How many pistons does your brake caliper have?";
    if (/Rotor Size$/.test(name)) return `What is the diameter of your ${name.startsWith("Rear") ? "rear" : name.startsWith("Front") ? "front" : ""} brake rotor?`.replace("  ", " ");
    if (name === "Valve Train") return "Is your engine SOHC or DOHC?";
    if (name === "Aspiration") return "Is your engine naturally aspirated (no turbo or supercharger)?";
    if (name === "Engine Code") return "What is your engine code? It is on the emissions sticker under the hood or stamped on the engine.";
    if (name === "Build Date") return "When was your vehicle built? The date is on the sticker in the driver's door jamb.";
    if (name === "Brake Code") return "What is your brake code? It is on the option sticker (glove box or trunk), or a dealer can read it from your VIN.";
    if (name.startsWith("Has: ")) return `Does your vehicle have ${name.slice(5).replace(/^(\w)/, (m) => m.toLowerCase())}?`;
    if (name.startsWith("Note: ")) return noteQuestion(name.slice(6));
    if (name === "Application") return "Is this the main engine water pump, or an auxiliary (extra) pump?";
    if (name === "Water Pump Drive Type") return "How is your old water pump driven?";
    if (name === "Pulley Included") return "Does your old water pump have the pulley attached?";
    if (name === "Includes Back Housing" || name === "Housing Included") return "Does your old pump come with its back housing attached?";
    if (name === "Thermostat And Housing Included" || name === "Thermostat Included") return "Does your old pump have the thermostat built in?";
    if (name === "Outlet Quantity") return "How many hose outlets does your old pump have?";
    if (name === "Flange Bolts") return "How many bolts hold your old pump's mounting flange?";
    if (name === "Pulley Flange Bolts") return "How many bolts hold the pulley on your old pump?";
    if (name === "Pulley Grooves") return "How many grooves does the pulley have?";
    if (name === "Timing Belt Driven") return "Is your old water pump driven by the timing belt?";
    if (name === "Impeller Material") return "What is the impeller (the fan blades inside) of your old pump made of?";
    if (name === "Housing Material") return "What is the body of your old pump made of?";
    if (name === "Impeller Rotation") return "Does your old pump turn in standard or reverse rotation?";
    if (name.startsWith("Part note: ")) return `Does this match your old part: "${name.slice(11)}"?`;
    const info = dimInfo(name);
    if (info.kind === "measure") return `What is the ${name.toLowerCase()} of your old part? Choose Not sure if you can't measure it.`;
    if (info.kind === "preference") return `They all fit based on your answers. Which ${name.toLowerCase()} do you prefer?`;
    return `What is the ${name.toLowerCase()} of your old part?`;
  })();
  return `${lead} ${q}`;
}

// ---------------------------------------------------------------------------
// The result
// ---------------------------------------------------------------------------
export type FinderStatus =
  | "question" // ask .question
  | "match" // one part, every answer confirmed by its data
  | "likely" // one part (or one best-supported part) but some answers are not stated in its data
  | "equivalent" // several parts, all fit; they differ only in preferences / nothing
  | "ambiguous" // several parts, real differences left that the customer could not answer
  | "none"; // nothing matches the answers

export type FinderResult = {
  status: FinderStatus;
  candidates: FinderProduct[];
  question: Question | null;
  answers: Answer[];
  // per candidate: why it matches / what is not confirmed / what sets it apart
  details: Map<number, { confirmed: string[]; unconfirmed: string[]; differences: string[]; conditions: string[]; info: string[]; refs: string[] }>;
  message: string;
  issues: DataIssue[];
  // true when the question limit stopped Axel and more useful questions remain
  moreQuestions: boolean;
};

function describe(name: string, value: string) {
  if (name.startsWith("Has: ")) return `${value === "Yes" ? "with" : "without"} ${name.slice(5).toLowerCase()}`;
  if (name.startsWith("Note: ") || name.startsWith("Part note: ")) return `"${name.replace(/^(Part )?[Nn]ote: /, "")}"${value === "No" ? " does not apply" : ""}`;
  return `${name}: ${value}`;
}

const KEY_SPECS = ["Position", "Water Pump Drive Type", "Pulley Included", "Includes Back Housing", "Housing Included", "Impeller Material", "Housing Material", "Pad Material", "Seal In Box", "Contents"];

/**
 * Narrows `products` (all parts that fit the vehicle) with the customer's answers.
 * `preset` holds answers that are already known (e.g. Engine = Not sure).
 */
export function findPart(
  products: FinderProduct[],
  specs: SpecMap,
  answers: Answer[],
  opts: { refs?: RefMap; vehicle?: string; maxQuestions?: number } = {},
): FinderResult {
  const issues: DataIssue[] = [];
  const all = buildFacts(products, specs, opts.refs, issues);
  const left = all.filter((f) => survives(f, answers));
  const details: FinderResult["details"] = new Map();
  const limit = opts.maxQuestions ?? DEFAULT_MAX_QUESTIONS;
  // The "Engine = Not sure" the chat adds itself is not a question Axel asked
  const askedCount = answers.filter((a) => !(a.name === "Engine" && a.value === null)).length;
  let moreQuestions = false;
  const veh = opts.vehicle ? ` for your ${opts.vehicle}` : "";

  const fill = (fs: Facts[], diffs: string[]) => {
    for (const f of fs) {
      const rows = consistentRows(f, answers);
      const confirmed = answers
        .filter((a) => a.value !== null && !eq(a.value, NONE_OF_THESE))
        .filter((a) =>
          isVehicleDim(a.name)
            ? rows.some((r) => r.has(a.name) && eq(r.get(a.name)!, a.value!))
            : f.part.has(a.name),
        )
        .map((a) => describe(a.name, a.value!));
      const differences = diffs
        .map((d) => {
          const v = valuesFor(f, d, answers);
          const vals = [...new Set(v.values)];
          return vals.length ? `${d}: ${vals.join(" / ")}` : `${d}: not stated`;
        });
      // Vehicle conditions every matching fitment row of this part carries and the customer
      // has not confirmed (never asked, or answered "Not sure")
      const asked = new Set(answers.filter((a) => a.value !== null).map((a) => a.name));
      const conditions = rows.length
        ? [...rows[0].keys()]
            .filter((k) => !asked.has(k) && !["Trim", "Engine", "Fuel Type", "Body Type"].includes(k))
            .filter((k) => rows.every((r) => r.has(k) && eq(r.get(k)!, rows[0].get(k)!)))
            .map((k) => describe(k, rows[0].get(k)!))
        : [];
      const keySpecs = KEY_SPECS.filter((k) => f.part.has(k) && !diffs.includes(k)).map((k) => `${k}: ${f.part.get(k)}`);
      details.set(f.product.id, {
        confirmed,
        unconfirmed: unconfirmed(f, answers).map((a) => describe(a.name, a.value!)),
        differences: [...differences, ...keySpecs],
        conditions,
        info: f.info,
        refs: f.refs.filter((r) => /^OE number/.test(r.label)).slice(0, 3).map((r) => r.label.replace(/^OE number /, "")),
      });
    }
  };

  const result = (status: FinderStatus, fs: Facts[], message: string, question: Question | null = null, diffs: string[] = []): FinderResult => {
    fill(fs, diffs);
    const more = moreQuestions && status !== "question" && status !== "none";
    const tail = more ? " I've asked quite a few questions, so here is where it stands. Want me to keep asking to find the exact part?" : "";
    return { status, candidates: fs.map((f) => f.product), question, answers, details, message: message + tail, issues, moreQuestions: more };
  };

  if (left.length === 0) {
    const said = answers.filter((a) => a.value !== null).map((a) => describe(a.name, a.value!));
    return result(
      "none",
      [],
      `None of our parts${veh} matches ${said.length ? `everything you told me (${said.join("; ")})` : "those details"}, so I can't recommend one. If one of your answers may be off, change it below, or send me the part number printed on your old part and I'll check it.`,
    );
  }

  // Before recommending: the remaining part(s) may be listed only for vehicles with a
  // condition the customer has not confirmed yet (heavy-duty brakes, a body style, ...).
  // Conditions a customer can check are asked; the others are shown with the result.
  const verify = (fs: Facts[]): FinderResult | null => {
    if (askedCount >= limit) {
      moreQuestions = true; // a check is still possible if the customer wants it
      return null;
    }
    const asked = new Set(answers.map((a) => a.name));
    const rowsOf = fs.map((f) => consistentRows(f, answers));
    if (rowsOf.some((r) => r.length === 0)) return null;
    const first = rowsOf[0][0];
    const shared = [...first.keys()]
      .filter((k) => !asked.has(k) && k !== "Engine" && !NEVER_ASK.has(k) && isVehicleDim(k) && dimInfo(k).rank <= 10)
      .filter((k) => rowsOf.every((rows) => rows.every((r) => r.has(k) && eq(r.get(k)!, first.get(k)!))))
      // Worth checking only when another part for this vehicle is listed with a different
      // value (e.g. the non-heavy-duty pads). Otherwise it is shown with the result.
      .filter((k) => all.some((g) => g.rows.some((r) => r.has(k) && !eq(r.get(k)!, first.get(k)!))))
      .sort((a, b) => dimInfo(a).rank - dimInfo(b).rank);
    if (!shared.length) return null;
    const name = shared[0];
    const value = first.get(name)!;
    const yesNo = ["yes", "no"].includes(low(value));
    const options = yesNo ? ["Yes", "No", NOT_SURE] : [value, NONE_OF_THESE, NOT_SURE];
    const text = `One more check before I recommend ${fs.length === 1 ? "it" : "them"}: ${questionWording(name, fs.length).replace(/^\d+ parts still match\. /, "")}`;
    return result("question", fs, text, { name, options, text, kind: dimInfo(name).kind });
  };

  if (left.length === 1) {
    const f = left[0];
    const missing = unconfirmed(f, answers);
    const check = verify([f]);
    if (check) return check;
    fill([f], []);
    const d = details.get(f.product.id)!;
    const listed = d.conditions.length ? ` Our data lists it for vehicles with ${d.conditions.join("; ")}: please make sure yours matches.` : "";
    // Answers that point to DIFFERENT parts: the last part survives only because its data
    // is silent on an answer another part states exactly. Don't present it as the likely one.
    if (missing.length) {
      const states = (g: Facts, a: Answer) =>
        isVehicleDim(a.name)
          ? g.rows.some((r) => r.has(a.name) && eq(r.get(a.name)!, a.value!))
          : g.part.has(a.name) && eq(g.part.get(a.name)!, a.value!);
      const rivals = all.filter((g) => g !== f && missing.some((a) => states(g, a)));
      if (rivals.length) {
        const why = missing
          .map((a) => {
            const r = rivals.filter((g) => states(g, a)).map((g) => g.product.sku);
            return r.length ? `${describe(a.name, a.value!)} matches ${r.join(", ")}` : null;
          })
          .filter(Boolean)
          .join("; ");
        const mine = answers
          .filter((a) => a.value !== null && !eq(a.value, NONE_OF_THESE) && states(f, a))
          .map((a) => describe(a.name, a.value!));
        return result(
          "ambiguous",
          [f, ...rivals],
          `Your answers point to different parts: ${why}, but ${mine.length ? `${mine.join("; ")} matches ${f.product.sku}` : `only ${f.product.sku} is left`}. Please double-check those details on your old pump, or send me the number printed on it.`,
        );
      }
    }
    // A listing condition (same value on every matching row, e.g. "Heavy Duty Brakes: Yes")
    // that the customer answered "Not sure" to. Trim / engine / fuel / body are not conditions.
    const rowsF = consistentRows(f, answers);
    const notSureCondition = answers.some(
      (a) =>
        a.value === null &&
        !["Trim", "Engine", "Fuel Type", "Body Type"].includes(a.name) &&
        rowsF.length > 0 &&
        rowsF.every((r) => r.has(a.name) && eq(r.get(a.name)!, rowsF[0].get(a.name)!)),
    );
    if (missing.length === 0 && !notSureCondition) {
      return {
        status: "match",
        candidates: [f.product],
        question: null,
        answers,
        details,
        issues,
        moreQuestions,
        message: (moreQuestions ? "I've asked quite a few questions, so here is where it stands. " : "") + `This is the part${veh}.${d.confirmed.length ? ` It matches what you told me: ${d.confirmed.join("; ")}.` : " It is the only part we list for it."}${listed}`,
      };
    }
    return {
      status: "likely",
      candidates: [f.product],
      question: null,
      answers,
      details,
      issues,
      moreQuestions,
      message: (moreQuestions ? "I've asked quite a few questions, so here is where it stands. " : "") + (missing.length
        ? `This is the only part left${veh}, but our data does not state ${missing.map((a) => describe(a.name, a.value!)).join("; ")} for it, so please compare it with your old part (or send me the number on your old part) before ordering.${listed}`
        : `This is the most likely part${veh}, but it is only listed for vehicles with ${d.conditions.join("; ") || "details you weren't sure about"}, which you weren't sure about. Please check that (or send me the number on your old part) before ordering.`),
    };
  }

  const q0 = pickQuestion(left, answers);
  const q = askedCount < limit ? q0 : null;
  if (q0 && !q) moreQuestions = true;
  if (q) {
    const options = [...q.options];
    // "None of these" lets the customer say their value is not listed (never for Yes/No)
    if (!options.includes("Yes") && !options.includes(NONE_OF_THESE)) options.push(NONE_OF_THESE);
    if (!options.includes(NOT_SURE)) options.push(NOT_SURE);
    return result("question", left, questionWording(q.name, left.length), { name: q.name, options, text: questionWording(q.name, left.length), kind: q.kind });
  }

  // No useful question left. Which real differences remain between the parts?
  const names = new Set<string>();
  for (const f of left) {
    for (const r of consistentRows(f, answers)) for (const k of r.keys()) names.add(k);
    for (const k of f.part.keys()) names.add(k);
  }
  // A real difference = some answer about it would keep one part but drop another.
  // Dimensions already answered "Not sure" still count: the customer could not settle them.
  const differing = [...names].filter((n) => {
    const notSure = answers.some((a) => a.name === n && a.value === null);
    const free = notSure ? answers.filter((a) => a.name !== n) : answers;
    return (notSure || !answers.some((a) => a.name === n)) && separation(left, n, free).separates;
  });
  const fitmentDiffs = differing.filter((n) => dimInfo(n).kind !== "preference");
  for (const n of comboSplit(left, answers.filter((a) => a.value !== null))) if (!fitmentDiffs.includes(n)) fitmentDiffs.push(n);

  // One part is fully confirmed by the data and the others are not: that one is best supported
  const fully = left.filter((f) => unconfirmed(f, answers).length === 0);
  if (fully.length === 1 && answers.some((a) => a.value !== null)) {
    const others = left.filter((f) => f !== fully[0]);
    return result(
      "likely",
      [fully[0], ...others],
      `The first part is the best match${veh}: its data confirms every answer you gave. The others are listed for your vehicle too, but their data does not confirm all of your answers.`,
      null,
      differing,
    );
  }

  if (fitmentDiffs.length === 0) {
    const check = verify(left);
    if (check) return check;
    return result(
      "equivalent",
      left,
      `These ${left.length} parts all fit${veh} based on what you told me. ${differing.length ? `They differ only in ${differing.map((d) => d.toLowerCase()).join(", ")}, so pick the one you prefer.` : "Our data shows no fitment difference between them."}`,
      null,
      differing,
    );
  }

  return result(
    "ambiguous",
    left,
    `I can't tell which of these ${left.length} parts is yours from the details we have, so I won't pick one. They differ in ${fitmentDiffs
      .slice(0, 4)
      .map((d) => d.replace(/^(Part )?[Nn]ote: /, "").toLowerCase())
      .join(", ")}. The part number printed on your old part (or its OE number) will settle it: send it here, or contact us with your VIN.`,
    null,
    fitmentDiffs,
  );
}

// ---------------------------------------------------------------------------
// Customer typed a number from the old part: which candidates carry it?
// ---------------------------------------------------------------------------
export function matchPartNumber(
  products: FinderProduct[],
  specs: SpecMap,
  refs: RefMap | undefined,
  text: string,
): { product: FinderProduct; via: string }[] {
  const tokens = new Set(
    text
      .split(/[\s,;/]+/)
      .map(normNumber)
      .filter((t) => t.length >= 4 && /\d/.test(t)),
  );
  const whole = normNumber(text);
  if (whole.length >= 4 && /\d/.test(whole)) tokens.add(whole);
  if (!tokens.size) return [];
  const facts = buildFacts(products, specs, refs, []);
  const hits: { product: FinderProduct; via: string }[] = [];
  for (const f of facts) {
    const r = f.refs.find((x) => x.norm.length >= 4 && tokens.has(x.norm));
    if (r) hits.push({ product: f.product, via: r.label });
  }
  return hits;
}

// Reads the customer's spec answers ("Spec: Name = Value") of the current search.
// A new vehicle, VIN or engine/trim button starts a new search. A later answer to
// the same question replaces the earlier one.
export function readAnswers(
  messages: { role: string; content: string }[],
  interpret?: (text: string) => Answer | null,
): Answer[] {
  let out: Answer[] = [];
  const put = (a: Answer) => {
    out = out.filter((x) => x.name !== a.name);
    out.push(a);
  };
  for (const m of messages) {
    if (m.role !== "user") continue;
    const t = m.content.trim();
    const hit = t.match(/^Spec:\s*(.+?)\s*=\s*(.+)$/i);
    if (hit) {
      put({ name: hit[1].trim(), value: low(hit[2]) === "not sure" ? null : hit[2].trim() });
      continue;
    }
    const compact = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^(Make|Model|Engine|Trim):\s*\S/i.test(t) || /\b(19[5-9]\d|20[0-4]\d)\b/.test(t) || /^[A-HJ-NPR-Z0-9]{17}$/.test(compact)) {
      out = [];
      continue;
    }
    // A typed answer ("no pulley", "it's chain driven") counts like a button
    const typed = interpret?.(t);
    if (typed) put(typed);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Typed answers: "if I said no pulley?", "mine is chain driven", "it's the XLT".
// Only values that exist in the parts' data are recognised; anything else -> null.
// ---------------------------------------------------------------------------
// Words that name the part itself ("I'm looking for an engine water pump"), never an answer
const GENERIC_VALUE = /^(engine )?(water )?pumps?$|^engine$|^brake( pad| shoe)?s?$|^(timing )?belt( kit)?s?$|^kits?$|^parts?$/;
const NO_WORDS = /\b(no|not|without|w\/o|don'?t|doesn'?t|isn'?t|hasn'?t|none|missing|bare)\b/i;
const YES_WORDS = /\b(yes|yeah|yep|with|has|have|got|comes|included|attached)\b/i;
const LABEL_STOP = new Set(["included", "includes", "type", "quantity", "material", "water", "pump", "your", "drive", "brakes"]);

export function interpretText(products: FinderProduct[], specs: SpecMap, text: string): Answer | null {
  if (/^spec:/i.test(text.trim()) || text.length > 160) return null;
  const facts = buildFacts(products, specs, undefined, []);
  const t = ` ${low(text).replace(/[^a-z0-9.\s/'-]/g, " ").replace(/\s+/g, " ")} `;
  const dims = new Map<string, string[]>();
  const add = (k: string, v: string) => {
    if (NEVER_ASK.has(k) || k.startsWith("Note: ") || k.startsWith("Part note: ")) return;
    const list = dims.get(k) ?? dims.set(k, []).get(k)!;
    if (!list.some((x) => eq(x, v))) list.push(v);
  };
  for (const f of facts) {
    for (const r of f.rows) for (const [k, v] of r) add(k, v);
    for (const [k, v] of f.part) add(k, v);
  }
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 1. a real value named in the text: "serpentine belt", "chain", "XLT"
  let best: { name: string; value: string; len: number } | null = null;
  for (const [name, vals] of dims) {
    if (vals.every((v) => ["yes", "no"].includes(low(v)))) continue;
    for (const v of vals) {
      const lv = low(v);
      if (lv.length < 3 || /^[\d.]+$/.test(lv) || GENERIC_VALUE.test(lv)) continue;
      if (new RegExp(`(^|[^a-z0-9])${esc(lv)}([^a-z0-9]|$)`).test(t) && (!best || lv.length > best.len)) {
        best = { name, value: v, len: lv.length };
      }
    }
  }
  if (best) return { name: best.name, value: best.value };

  // 1b. a count named with its own words: "it has 4 bolts", "four bolt flange", "no bolts"
  const NUM: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8" };
  for (const [name, vals] of dims) {
    if (!vals.some((v) => /^\d+$/.test(v.trim()))) continue;
    // The counted thing is the last word of the name ("Pulley Flange Bolts" -> bolts),
    // so "no pulley" stays a Pulley Included answer
    const noun = low(name).split(/[^a-z]+/).filter(Boolean).pop() ?? "";
    if (noun.length < 4) continue;
    const prefixes = [esc(noun.slice(0, 4))];
    const said = t.match(new RegExp(`\\b(\\d+|${Object.keys(NUM).join("|")})\\s*-?\\s*(?:[a-z]+\\s+)?(?:${prefixes.join("|")})`));
    if (said) {
      const n = NUM[said[1]] ?? said[1];
      const v = vals.find((x) => x.trim() === n);
      // A count no part has is still the customer's answer: it rules out the parts that differ
      return { name, value: v ?? n };
    }
    const none = vals.find((v) => /^none\b/i.test(v));
    if (none && new RegExp(`\\b(?:no|zero|none|0)\\s+(?:[a-z]+\\s+)?(?:${prefixes.join("|")})`).test(t)) {
      return { name, value: none };
    }
  }

  // 2. a Yes / No fact named by its own words: "no pulley", "with the back housing"
  const neg = NO_WORDS.test(t);
  const pos = YES_WORDS.test(t);
  if (!neg && !pos) return null;
  for (const [name, vals] of dims) {
    if (!vals.every((v) => ["yes", "no"].includes(low(v)))) continue;
    const words = low(name.replace(/^Has: /, ""))
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !LABEL_STOP.has(w));
    // first 4 letters, so typos like "pully" still count
    if (words.length && words.some((w) => new RegExp(`\\b${esc(w.slice(0, 4))}`).test(t))) {
      return { name, value: neg ? "No" : "Yes" };
    }
  }
  return null;
}
