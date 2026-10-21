// Gives hidden variants the photos of their twin part number. The old team stored these
// pairs in one shared photo folder (e.g. "1152090-1152090IM" in Tooling/images-backup.7z).
// Only variants with NO photos are changed. Photos are copied from the twin's photos on
// the site; if the twin has none there, from the old project's photo folder.
//
// Usage, from the project root:
//   node --env-file=.env.local scripts/import-variant-photos.mjs --dry
//   node --env-file=.env.local scripts/import-variant-photos.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PAIRS = {
  CM1152090IM: ["CM1152090", "1152090"],
  CM1204410IM: ["CM1204410", "1204410"],
  CM1701840: ["CM1701840M", "1701840M"],
  CM1701920M: ["CM1701920", "1701920"],
  CM1802220IM: ["CM1802220", "1802220"],
  CM1802310IM: ["CM1802310", "1802310"],
  CM1802470AH: ["CM1802470", "1802470"],
};

const DRY = process.argv.includes("--dry");
const BUCKET = "product-images";
const DIR = path.join(os.homedir(), "CanuckMotors", "Tooling", "image-preparation", "photos", "images");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });
const isVideo = (p) => /\.(mp4|webm|mov|m4v)$/i.test(p);
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

const { data: products, error } = await db.from("products").select("id, sku").in("sku", [...Object.keys(PAIRS), ...Object.values(PAIRS).map((v) => v[0])]);
if (error) throw error;
const bySku = new Map(products.map((p) => [p.sku.toUpperCase(), p]));
const photosOf = async (id) => {
  const { data, error } = await db.from("product_images").select("path, sort_order").eq("product_id", id).order("sort_order");
  if (error) throw error;
  return data.filter((r) => !isVideo(r.path));
};

let added = 0;
const notes = [];
for (const [variant, [twin, folder]] of Object.entries(PAIRS)) {
  const v = bySku.get(variant);
  if (!v) { notes.push(`${variant}: product not found`); continue; }
  if ((await photosOf(v.id)).length) { notes.push(`${variant}: already has photos, left alone`); continue; }

  // Source photos: twin's site photos, else the old project folder
  const t = bySku.get(twin);
  let sources = [];
  if (t) for (const r of await photosOf(t.id)) {
    sources.push({ label: r.path, ext: path.extname(r.path).slice(1).toLowerCase(), get: async () => {
      const { data, error } = await db.storage.from(BUCKET).download(r.path);
      if (error) throw new Error(error.message);
      return Buffer.from(await data.arrayBuffer());
    } });
  }
  const from = sources.length ? `${twin} on the site` : `old folder ${folder}`;
  if (!sources.length && existsSync(path.join(DIR, folder))) {
    sources = readdirSync(path.join(DIR, folder)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
      .map((f) => ({ label: f, ext: path.extname(f).slice(1).toLowerCase(), get: async () => readFileSync(path.join(DIR, folder, f)) }));
  }
  if (!sources.length) { notes.push(`${variant}: no photos found for ${twin}`); continue; }
  console.log(`${variant}: ${sources.length} photo(s) from ${from}`);
  if (DRY) { added += sources.length; continue; }

  for (const [i, s] of sources.entries()) {
    const ext = s.ext === "jpeg" ? "jpg" : s.ext;
    const file = `${variant}/${variant}-${i + 1}.${ext}`;
    let body;
    try { body = await s.get(); } catch (e) { notes.push(`${file}: ${e.message}`); continue; }
    const up = await db.storage.from(BUCKET).upload(file, body, { upsert: true, contentType: TYPES[ext] ?? "image/jpeg", cacheControl: "31536000" });
    if (up.error) { notes.push(`${file}: ${up.error.message}`); continue; }
    const row = await db.from("product_images").upsert({ product_id: v.id, path: file, sort_order: i }, { onConflict: "product_id,path" });
    if (row.error) { notes.push(`link ${file}: ${row.error.message}`); continue; }
    added++;
    console.log(`  + ${file}`);
  }
}
console.log(`\n${DRY ? "Would add" : "Added"} ${added} photos.`);
if (notes.length) console.log(`\nNotes:\n  ${notes.join("\n  ")}`);
