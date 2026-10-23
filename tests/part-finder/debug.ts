import { groups, toFinderProducts, specs, refs } from "./snapshot";
import { findPart, buildFacts, type Answer } from "../../lib/part-finder";
const [needle, cat, ...ans] = process.argv.slice(2);
for (const g of groups.values()) {
  if (!g.vehicle.includes(needle) || g.category !== cat) continue;
  const prods = toFinderProducts(g);
  const answers: Answer[] = ans.map((a) => { const [n, v] = a.split("="); return { name: n, value: v === "?" ? null : v }; });
  const issues: any[] = [];
  for (const f of buildFacts(prods, specs, refs, issues)) {
    console.log(" ", f.product.sku, f.product.position, "rows:", f.rows.length, "| part:", JSON.stringify([...f.part]).slice(0, 400));
    console.log("    row0:", JSON.stringify([...f.rows[0]]), "| info:", f.info.join(" / "));
  }
  const r = findPart(prods, specs, answers, { refs, vehicle: g.vehicle });
  console.log(g.vehicle, "=>", r.status, "|", r.message);
  if (r.question) console.log("   Q:", r.question.text, r.question.options);
  for (const c of r.candidates) console.log("   ", c.sku, JSON.stringify(r.details.get(c.id)));
  if (issues.length) console.log("   data issues:", JSON.stringify(issues).slice(0, 500));
  break;
}
