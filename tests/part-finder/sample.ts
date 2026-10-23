// Prints sample conversations (realistic customer) for manual review.
import { groups, toFinderProducts, specs, refs } from "./snapshot";
import { findPart, buildFacts, NOT_SURE, NONE_OF_THESE, type Answer } from "../../lib/part-finder";
const KNOWS = /^(Trim|Body Type|Fuel Type|Engine|Doors|Drive|Position|Brake Type|Wheel Lugs|Parking Brake|Heavy Duty Brakes|Duty Rating|Has: .*|Water Pump Drive Type|Pulley Included|Includes Back Housing|Housing Included|Thermostat.*|Outlet Quantity|Application|Pulley Flange Bolts|Pulley Grooves|Build Date)$/;
const canon = (v: string) => { const x = v.trim().toLowerCase().replace(/\s*(in|mm)$/, ""); const n = Number(x); return Number.isFinite(n) && x !== "" ? String(n) : x; };
let seed = Number(process.env.SEED ?? 7);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const want = process.env.CAT;
const gs = [...groups.values()].filter((g) => g.productIds.length >= Number(process.env.MIN ?? 2) && (!want || g.category === want));
for (let n = 0; n < Number(process.env.N ?? 8); n++) {
  const g = gs[Math.floor(rnd() * gs.length)];
  const prods = toFinderProducts(g);
  const pid = g.productIds[Math.floor(rnd() * g.productIds.length)];
  const rows = g.rows.get(pid)!;
  const r = rows[Math.floor(rnd() * rows.length)];
  const P = prods.find((p) => p.id === pid)!;
  const truthRow = buildFacts([{ ...P, fits: [{ trim: r.trim, engine: r.engine, fuel: r.fuel, body: r.body, comment: r.comment }] }], specs, refs, [])[0].rows[0];
  const oldPart = buildFacts([P], specs, refs, [])[0].part;
  console.log(`\n### ${g.vehicle} — ${g.category} (${prods.length} parts: ${prods.map((p) => p.sku).join(", ")})`);
  console.log(`    customer: trim=${r.trim} body=${r.body} fuel=${r.fuel} note="${r.comment}" old part=${P.sku}`);
  const answers: Answer[] = [];
  for (let i = 0; i < 12; i++) {
    const res = findPart(prods, specs, answers, { refs, vehicle: g.vehicle });
    if (res.status !== "question") {
      console.log(`  Axel [${res.status}]: ${res.message}`);
      for (const c of res.candidates) { const d = res.details.get(c.id)!; console.log(`     • ${c.sku} ${c.position ?? ""} — ${[...d.differences, ...d.conditions.map((x) => "fits when " + x), ...d.unconfirmed.map((x) => "NOT CONFIRMED: " + x)].join("; ")}`); }
      break;
    }
    const q = res.question!;
    const truth = KNOWS.test(q.name) ? (q.kind === "vehicle" ? truthRow.get(q.name) : oldPart.get(q.name)) : undefined;
    const a = truth === undefined ? null : q.options.find((o) => o !== NOT_SURE && canon(o) === canon(truth)) ?? NONE_OF_THESE;
    console.log(`  Axel: ${q.text}  [${q.options.join(" | ")}]\n  Customer: ${a ?? NOT_SURE}`);
    answers.push({ name: q.name, value: a });
  }
}
