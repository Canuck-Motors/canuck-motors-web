// One-time import of the old site's exact "Comment" (fits.note) and "Body Type"
// for every vehicle fitment, read from the old project's supabase/seed.sql.
// Usage (from the project root):
//   node --env-file=.env.local scripts/import-fitment-comments.mjs ~/CanuckMotors/supabase/seed.sql [--dry]
// Run database/product_fitments_comment.sql first. Uses SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import os from "node:os";

const file = (process.argv[2] ?? "").replace(/^~/, os.homedir());
const dry = process.argv.includes("--dry");
if (!file) throw new Error("Pass the old project's supabase/seed.sql as the first argument.");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const alnum = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const sku = (s) => String(s ?? "").toUpperCase().replace(/^CM-?/, "").replace(/[^A-Z0-9]/g, "");
const liters = (s) => {
  const m = String(s ?? "").match(/(\d+(?:\.\d+)?)\s*L/i);
  return m ? Number(m[1]).toFixed(1) : "";
};

// Parses one SQL tuple line like: ('CM1', 12, 'it''s', NULL, 1.7),
function parseTuple(line) {
  const out = [];
  let i = line.indexOf("(") + 1;
  while (i < line.length) {
    while (line[i] === " ") i++;
    if (line[i] === "'") {
      let j = i + 1, s = "";
      while (j < line.length) {
        if (line[j] === "'" && line[j + 1] === "'") { s += "'"; j += 2; }
        else if (line[j] === "'") break;
        else s += line[j++];
      }
      out.push(s);
      i = j + 1;
    } else {
      let j = i;
      while (j < line.length && line[j] !== "," && line[j] !== ")") j++;
      const raw = line.slice(i, j).trim();
      out.push(raw === "NULL" ? null : raw);
      i = j;
    }
    while (line[i] === " ") i++;
    if (line[i] === ",") i++;
    else break;
  }
  return out;
}

// ---- read the old seed.sql: api.car and api.fits
const cars = new Map(); // car_id -> {brand, model, year, trim, liter, body}
const fits = []; // [cm_number, car_id, note]
let mode = "";
for (const line of (await readFile(file, "utf8")).split("\n")) {
  if (line.startsWith("INSERT INTO ")) {
    mode = line.startsWith('INSERT INTO "api"."car" ') ? "car" : line.startsWith('INSERT INTO "api"."fits" ') ? "fits" : "";
    continue;
  }
  if (!mode || !line.startsWith("\t(")) { if (!line.startsWith("\t(")) mode = mode && line.trim() === "" ? mode : ""; continue; }
  const v = parseTuple(line);
  if (mode === "car") {
    // car_id, brand, model, year, trim, cc, liter, type, body_type, fuel
    cars.set(String(v[0]), { brand: v[1], model: v[2], year: Number(v[3]), trim: v[4] ?? "", liter: v[6], body: v[8] ?? "" });
  } else if (mode === "fits") {
    fits.push([v[0], String(v[1]), v[2] ?? ""]);
  }
}
console.log(`Old data: ${cars.size} vehicles, ${fits.length} fits`);

// key -> Map(value -> count); value = "note\u0001body"
const withTrim = new Map();
const noTrim = new Map();
const add = (map, k, v) => {
  const m = map.get(k) ?? map.set(k, new Map()).get(k);
  m.set(v, (m.get(v) ?? 0) + 1);
};
for (const [cm, carId, note] of fits) {
  const c = cars.get(carId);
  if (!c) continue;
  const base = [sku(cm), c.year, alnum(c.brand), alnum(c.model), liters(`${c.liter}L`)].join("|");
  const value = `${note}\u0001${c.body}`;
  add(withTrim, `${base}|${alnum(c.trim)}`, value);
  add(noTrim, base, value);
}
const best = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];

// ---- products
const skuById = new Map();
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("products").select("id, sku").range(from, from + 999);
  if (error) throw error;
  for (const p of data) skuById.set(p.id, sku(p.sku));
  if (data.length < 1000) break;
}

// ---- new fitments -> (comment, body type)
const groups = new Map(); // value -> [product_fitments.id]
let total = 0, matched = 0;
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("product_fitments")
    .select(
      `id, product_id, vehicle_fitments ( year ( year ), manufacturer ( manufacturer_name ), models ( model_name ), engine_sizes ( engine_name ), trim ( trim_name ) )`,
    )
    .order("id")
    .range(from, from + 999);
  if (error) throw error;

  for (const r of data) {
    total++;
    const v = r.vehicle_fitments;
    if (!v) continue;
    const base = [
      skuById.get(r.product_id) ?? "",
      v.year?.year,
      alnum(v.manufacturer?.manufacturer_name),
      alnum(v.models?.model_name),
      liters(v.engine_sizes?.engine_name),
    ].join("|");

    let m = withTrim.get(`${base}|${alnum(v.trim?.trim_name)}`);
    if (!m) {
      const loose = noTrim.get(base);
      if (loose && loose.size === 1) m = loose; // same answer for every trim
    }
    if (!m) continue;

    const value = best(m);
    (groups.get(value) ?? groups.set(value, []).get(value)).push(r.id);
    matched++;
  }
  if (data.length < 1000) break;
}

console.log(`New fitment rows: ${total}, matched to an old row: ${matched}, distinct (comment, body type): ${groups.size}`);
if (dry) {
  console.log(
    "Dry run, nothing written. Sample:",
    [...groups.entries()].slice(0, 6).map(([k, ids]) => `${k.replace("\u0001", " | ")} (${ids.length})`),
  );
  process.exit(0);
}

// Clear the earlier partial import, then write the exact old values
const clear = await supabase.from("product_fitments").update({ comment: null, body_type: null }).not("id", "is", null);
if (clear.error) throw clear.error;

let written = 0;
for (const [value, ids] of groups) {
  const [comment, body] = value.split("\u0001");
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await supabase
      .from("product_fitments")
      .update({ comment: comment || null, body_type: body || null })
      .in("id", chunk);
    if (error) throw error;
    written += chunk.length;
  }
}
console.log("Rows written:", written);
