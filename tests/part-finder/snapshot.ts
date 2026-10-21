// Loads the read-only snapshot of the live catalog and rebuilds exactly what
// findPartsForVehicle returns for a vehicle (same grouping and fields).
import { readFileSync } from "node:fs";
import type { FinderProduct, SpecMap, RefMap } from "../../lib/part-finder";
import { normNumber } from "../../lib/part-finder";

const raw = JSON.parse(readFileSync(new URL("./data/snapshot.json", import.meta.url), "utf8"));
const T: Record<string, any[]> = {};
for (const [k, v] of Object.entries<any>(raw)) T[k] = v.rows.map((r: any[]) => Object.fromEntries(v.cols.map((c: string, i: number) => [c, r[i]])));

const FUELS = new Set(["all","gas","electric","diesel","hybrid","flex","flexfuel","e85","ffv","cng","lpg","propane","phev","bev"]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const parts = (n: string) => n.split("|").map((x) => x.trim()).filter(Boolean);
export const engineFuel = (n: string) => { const p = parts(n); const l = norm(p[p.length - 1] ?? ""); return p.length > 1 && FUELS.has(l) ? l : ""; };
export const engineBase = (n: string) => { const p = parts(n); if (p.length > 1 && FUELS.has(norm(p[p.length - 1]))) p.pop(); return p.join(" "); };

export const products = new Map<number, any>(T.products.filter((p) => p.is_active && !p.is_delete).map((p) => [p.id, p]));
const vf = new Map<number, any>(T.vehicle_fitments.map((v) => [v.id, v]));
const year = new Map<number, number>(T.year.map((y) => [y.id, y.year]));
const make = new Map<number, string>(T.manufacturer.map((m) => [m.id, m.manufacturer_name]));
const model = new Map<number, string>(T.models.map((m) => [m.id, m.model_name]));
const engine = new Map<number, string>(T.engine_sizes.map((e) => [e.id, e.engine_name]));
const trim = new Map<number, string>(T.trim.map((t) => [t.id, t.trim_name]));
export const categoryOf = (p: any) => ({ 1: "timing belt kit", 2: "water pump", 4: "brake pad" } as any)[p.product_category_id] ?? "other";

// FIXED=1: use the tables as they will be after database/product_data_fixes.sql
// (tests/part-finder/data/fixed.json, made by running that SQL on a copy of the live data)
if (process.env.FIXED) {
  const F = JSON.parse(readFileSync(new URL("./data/fixed.json", import.meta.url), "utf8"));
  T.product_specifications = F.product_specifications;
  T.product_oe_numbers = F.product_oe_numbers;
  T.product_interchanges = F.product_interchanges;
}
export const specs: SpecMap = new Map();
for (const s of T.product_specifications) {
  if (!specs.has(s.product_id)) specs.set(s.product_id, new Map());
  specs.get(s.product_id)!.set(s.spec_name, s.spec_value);
}
export const refs: RefMap = new Map();
for (const r of T.product_oe_numbers) (refs.get(r.product_id) ?? refs.set(r.product_id, []).get(r.product_id)!).push({ label: `OE number ${r.oe_brand ?? ""} ${r.oe_number}`.replace(/\s+/g, " "), norm: normNumber(String(r.oe_number_norm ?? r.oe_number)) });
for (const r of T.product_interchanges) (refs.get(r.product_id) ?? refs.set(r.product_id, []).get(r.product_id)!).push({ label: `interchange ${r.interchange_brand ?? ""} ${r.interchange_number}`.replace(/\s+/g, " "), norm: normNumber(String(r.interchange_number_norm ?? r.interchange_number)) });

export type Row = { pf: any; vf: any; trim: string; engine: string; fuel: string; body: string; comment: string };
export type Group = { key: string; vehicle: string; category: string; productIds: number[]; rows: Map<number, Row[]> };

// One group = one year/make/model/engine (fuel variants merged, like the website) + category
export const groups = new Map<string, Group>();
for (const pf of T.product_fitments) {
  const p = products.get(pf.product_id);
  if (!p) continue;
  const v = vf.get(pf.vehicle_fitment_id);
  const en = engine.get(v.engine_size_id) ?? "";
  const eb = engineBase(en);
  const cat = categoryOf(p);
  const key = `${v.year_id}|${v.manufacturer_id}|${v.model_id}|${norm(eb)}|${cat}`;
  let g = groups.get(key);
  if (!g) {
    g = { key, vehicle: `${year.get(v.year_id)} ${make.get(v.manufacturer_id)} ${model.get(v.model_id)} ${eb}`, category: cat, productIds: [], rows: new Map() };
    groups.set(key, g);
  }
  if (!g.rows.has(p.id)) { g.rows.set(p.id, []); g.productIds.push(p.id); }
  g.rows.get(p.id)!.push({ pf, vf: v, trim: String(trim.get(v.trim_id) ?? "").trim(), engine: eb, fuel: engineFuel(en), body: String(pf.body_type ?? "").trim(), comment: String(pf.comment ?? "").trim() });
}

// Same shape as findPartsForVehicle(...).products
export function toFinderProducts(g: Group): FinderProduct[] {
  return g.productIds.map((id) => {
    const p = products.get(id);
    const rows = g.rows.get(id)!;
    return {
      id, product_name: p.product_name, sku: p.sku, price: p.price, position: p.position, url: `/product/${p.slug || id}`,
      notes: [...new Set(rows.map((r) => r.comment).filter((c) => c && c.toLowerCase() !== "none"))],
      fits: rows.map((r) => ({ trim: r.trim, engine: r.engine, fuel: r.fuel, body: r.body, comment: r.comment })),
    };
  });
}
export { T };

// ---------------------------------------------------------------------------
// Groups built from the ACES workbook (Downloads/ACES_Validxml_Canuck_01_29_2025_Excel.xlsx,
// exported to data/aces.json). One group = BaseVehicleID + EngineBaseID (+ position).
// Parts that are not active on the website get their own ids; specs are attached by SKU
// when the website has the part.
// ---------------------------------------------------------------------------
export function acesGroups(sheet: string): { groups: Map<string, Group>; products: (g: Group) => FinderProduct[]; inactive: Set<string> } {
  const A = JSON.parse(readFileSync(new URL("./data/aces.json", import.meta.url), "utf8"));
  const bySku = new Map<string, any>([...products.values()].map((p) => [String(p.sku).toUpperCase(), p]));
  const ids = new Map<string, number>();
  const idOf = (sku: string) => bySku.get(sku)?.id ?? (ids.get(sku) ?? (ids.set(sku, 100000 + ids.size), ids.get(sku)!));
  const inactive = new Set<string>();
  const out = new Map<string, Group>();
  let rowId = 0;
  for (const a of A[sheet]) {
    const sku = String(a.Partno).toUpperCase();
    if (!bySku.has(sku)) inactive.add(sku);
    const engine = `${Number(a.Liter)}L ${a.Engtype}`;
    const key = `${a.BaseVehicleID}|${a.EngineBaseID}|${a.PositionName ?? ""}`;
    let g = out.get(key);
    if (!g) {
      g = { key, vehicle: `${a.Year} ${a.MakeName} ${a.ModelName} ${engine}${a.PositionName ? ` (${a.PositionName})` : ""}`, category: "water pump", productIds: [], rows: new Map() };
      out.set(key, g);
    }
    const id = idOf(sku);
    if (!g.rows.has(id)) { g.rows.set(id, []); g.productIds.push(id); }
    const note = String(a["Note with Submodel and Attributes"] ?? "");
    const [subs = "", fuels = "", ...attrs] = note.split(";");
    for (const trim of subs.split(",").map((s: string) => s.trim()).filter(Boolean).concat(subs.trim() ? [] : [""])) {
      for (const fuel of fuels.split(",").map((s: string) => s.trim()).filter(Boolean).concat(fuels.trim() ? [] : [""])) {
        rowId++;
        g.rows.get(id)!.push({ pf: { id: rowId }, vf: { engine_size_id: a.EngineBaseID }, trim, engine, fuel: fuel.toLowerCase(), body: "AllTypes", comment: [trim, fuel, ...attrs].filter(Boolean).join("; ") });
      }
    }
  }
  const skuOf = new Map<number, string>();
  for (const [s, p] of bySku) skuOf.set(p.id, s);
  for (const [s, i] of ids) skuOf.set(i, s);
  const toProducts = (g: Group): FinderProduct[] =>
    g.productIds.map((id) => {
      const sku = skuOf.get(id)!;
      const p = bySku.get(sku);
      const rows = g.rows.get(id)!;
      return {
        id, sku, product_name: p?.product_name ?? `Engine Water Pump - ${sku}`, price: p?.price ?? null, position: null, url: `/product/${sku}`,
        notes: [...new Set(rows.map((r) => r.comment))],
        fits: rows.map((r) => ({ trim: r.trim, engine: r.engine, fuel: r.fuel, body: r.body, comment: r.comment })),
      };
    });
  return { groups: out, products: toProducts, inactive };
}
