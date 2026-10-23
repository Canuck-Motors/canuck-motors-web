// Saves a read-only snapshot of the catalog tables the chatbot uses, for the offline tests.
// Run from the project root (needs .env.local):  node tests/part-finder/export-snapshot.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const TABLES = ["products", "product_fitments", "vehicle_fitments", "year", "manufacturer", "models", "engine_sizes", "trim", "product_specifications", "product_oe_numbers", "product_interchanges", "product_categories"];
const DROP = new Set(["created_on", "created_by", "updated_on", "updated_by", "description", "meta_description", "canonical_tag", "title_tag", "image_path"]);
const out = {};
for (const t of TABLES) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(t).select("*").order("id").range(from, from + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const cols = Object.keys(rows[0] ?? {}).filter((c) => !DROP.has(c));
  out[t] = { cols, rows: rows.map((r) => cols.map((c) => r[c])) };
  console.log(t, rows.length);
}
mkdirSync(new URL("./data/", import.meta.url), { recursive: true });
writeFileSync(new URL("./data/snapshot.json", import.meta.url), JSON.stringify(out));
console.log("saved tests/part-finder/data/snapshot.json");
