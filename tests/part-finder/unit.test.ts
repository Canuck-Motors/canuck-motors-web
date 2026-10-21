// Small, hand-made cases for the rules in the brief. Run: npx tsx tests/part-finder/unit.test.ts
import assert from "node:assert/strict";
import { findPart, matchPartNumber, readAnswers, type FinderProduct, type Answer } from "../../lib/part-finder";

const P = (id: number, sku: string, fits: any[], position: string | null = null): FinderProduct =>
  ({ id, sku, product_name: `Part ${sku}`, price: 10 + id, position, url: `/product/${sku}`, fits });
const row = (trim: string, body: string, comment = "", fuel = "gas", engine = "3.5L V6") => ({ trim, body, comment, fuel, engine });
const specs = (o: Record<number, Record<string, string>>) => new Map(Object.entries(o).map(([k, v]) => [Number(k), new Map(Object.entries(v))]));
const run = (name: string, fn: () => void) => { try { fn(); console.log("PASS", name); } catch (e) { console.log("FAIL", name); throw e; } };

run("asks about the real spec that separates the parts, with real options", () => {
  const ps = [P(1, "A", [row("XL", "AllTypes")]), P(2, "B", [row("XL", "AllTypes")])];
  const r = findPart(ps, specs({ 1: { "Water Pump Drive Type": "Chain" }, 2: { "Water Pump Drive Type": "Serpentine Belt" } }), []);
  assert.equal(r.status, "question");
  assert.equal(r.question!.name, "Water Pump Drive Type");
  assert.deepEqual(r.question!.options, ["Chain", "Serpentine Belt", "None of these", "Not sure"]);
});

run("an answer removes only the parts whose data says otherwise", () => {
  const ps = [P(1, "A", [row("XL", "AllTypes")]), P(2, "B", [row("XL", "AllTypes")]), P(3, "C", [row("XL", "AllTypes")])];
  const sp = specs({ 1: { "Pulley Included": "Yes" }, 2: { "Pulley Included": "No" } }); // C: not stated
  const r = findPart(ps, sp, [{ name: "Pulley Included", value: "Yes" }]);
  assert.deepEqual(r.candidates.map((c) => c.sku), ["A", "C"]);
});

run("vehicle facts are checked together on one fitment row (ST + Extended Cab)", () => {
  const ps = [
    P(1, "A", [row("ST", "Standard Cab Pickup"), row("SLT", "Extended Cab Pickup")]),
    P(2, "B", [row("ST", "Extended Cab Pickup"), row("SLT", "Standard Cab Pickup")]),
  ];
  const r = findPart(ps, new Map(), [{ name: "Trim", value: "ST" }, { name: "Body Type", value: "Extended Cab Pickup" }]);
  assert.deepEqual(r.candidates.map((c) => c.sku), ["B"]);
  // and the finder asks for the combination even though neither fact alone separates them
  const q = findPart(ps, new Map(), []);
  assert.equal(q.status, "question");
});

run("fitment comments become questions (heavy-duty brakes)", () => {
  const ps = [P(1, "HD", [row("SXT", "Sport Utility", "Heavy Duty Brakes; OE Ceramic")], "Front"), P(2, "STD", [row("SXT", "Sport Utility", "without Heavy Duty Brakes; OE Ceramic")], "Front")];
  const r = findPart(ps, new Map(), []);
  assert.equal(r.question!.name, "Heavy Duty Brakes");
  const r2 = findPart(ps, new Map(), [{ name: "Heavy Duty Brakes", value: "No" }]);
  assert.equal(r2.status, "match");
  assert.equal(r2.candidates[0].sku, "STD");
});

run("a listed condition is checked before recommending the last part", () => {
  const ps = [P(1, "HD", [row("SXT", "Sport Utility", "Heavy Duty Brakes")], "Front"), P(2, "R", [row("SXT", "Sport Utility", "without Heavy Duty Brakes")], "Rear")];
  const r = findPart(ps, new Map(), [{ name: "Position", value: "Front" }]);
  assert.equal(r.status, "question");
  assert.equal(r.question!.name, "Heavy Duty Brakes");
  const none = findPart(ps, new Map(), [{ name: "Position", value: "Front" }, { name: "Heavy Duty Brakes", value: "No" }]);
  assert.equal(none.status, "none"); // never falls back to an incompatible part
  assert.equal(none.candidates.length, 0);
});

run("no match never shows parts", () => {
  const ps = [P(1, "A", [row("XL", "AllTypes")]), P(2, "B", [row("XLT", "AllTypes")])];
  const r = findPart(ps, new Map(), [{ name: "Trim", value: "None of these" }]);
  assert.equal(r.status, "none");
});

run("indistinguishable parts are not guessed", () => {
  const ps = [P(1, "A", [row("XL", "AllTypes")]), P(2, "B", [row("XL", "AllTypes")])];
  const sp = specs({ 1: { "Hub Pilot Diameter": "2.16 IN" }, 2: { "Hub Pilot Diameter": "2.91 IN" } });
  const r = findPart(ps, sp, [{ name: "Hub Pilot Diameter", value: null }]);
  assert.equal(r.status, "ambiguous");
  assert.equal(r.candidates.length, 2);
});

run("parts that differ only in a preference are presented as alternatives", () => {
  const ps = [P(1, "A", [row("XL", "AllTypes", "OE Ceramic")], "Rear"), P(2, "B", [row("XL", "AllTypes", "This is semi metallic")], "Rear")];
  const q = findPart(ps, new Map(), []);
  assert.equal(q.question!.name, "Pad Material");
  const r = findPart(ps, new Map(), [{ name: "Pad Material", value: null }]);
  assert.equal(r.status, "equivalent");
});

run("never repeats a question, also after Not sure", () => {
  const ps = [P(1, "A", [row("XL", "AllTypes")]), P(2, "B", [row("XLT", "AllTypes")])];
  const r = findPart(ps, new Map(), [{ name: "Trim", value: null }]);
  assert.notEqual(r.question?.name, "Trim");
});

run("a number from the old part settles it (OE number imported split)", () => {
  const ps = [P(1, "A", [row("XL", "AllTypes")]), P(2, "B", [row("XL", "AllTypes")])];
  const refs = new Map([[2, [{ label: "OE number Ford 7T4Z 8501 D", norm: "7T4Z8501D" }]]]);
  const hits = matchPartNumber(ps, new Map(), refs, "my old pump says 7T4Z-8501-D");
  assert.deepEqual(hits.map((h) => h.product.sku), ["B"]);
});

run("answers are read from the chat history and reset on a new vehicle", () => {
  const a: Answer[] = readAnswers([
    { role: "user", content: "Spec: Trim = XL" },
    { role: "user", content: "Spec: Trim = Not sure" },
    { role: "user", content: "Spec: Pulley Included = Yes" },
  ]);
  assert.deepEqual(a, [{ name: "Trim", value: null }, { name: "Pulley Included", value: "Yes" }]);
  assert.deepEqual(readAnswers([{ role: "user", content: "Spec: Trim = XL" }, { role: "user", content: "2015 ford f150" }]), []);
});
console.log("all unit tests passed");
