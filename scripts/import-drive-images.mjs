// Adds product photos to products that have NO images yet (hidden products included).
// 1st source: the shared Google Drive folder "CMimagesandbarcode/online photos"
//             (SKU -> Drive file list in scripts/drive-images-map.json, built from that folder)
// 2nd source: the old project's GMB photos on this Mac:
//             ~/CanuckMotors/Tooling/image-preparation/photos/images/<number>/img.*
//             ~/CanuckMotors/Tooling/adjusted_photos/<number>_square.png
//
// Usage, from the project root on your Mac:
//   node --env-file=.env.local scripts/import-drive-images.mjs --dry   (only shows what it would do)
//   node --env-file=.env.local scripts/import-drive-images.mjs         (uploads and links the images)
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const OLD = path.join(os.homedir(), "CanuckMotors", "Tooling");
// Old-project photos for a SKU (CM1204340 -> folder 1204340)
function oldPhotos(sku) {
  const code = sku.replace(/^CM/i, "");
  const dir = path.join(OLD, "image-preparation", "photos", "images", code);
  if (existsSync(dir)) {
    const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
    if (files.length) return files.map((f) => path.join(dir, f));
  }
  const sq = path.join(OLD, "adjusted_photos", `${code}_square.png`);
  return existsSync(sq) ? [sq] : [];
}

const DRY = process.argv.includes("--dry");
const BUCKET = "product-images";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const MAP = JSON.parse(readFileSync(new URL("./drive-images-map.json", import.meta.url), "utf8"));
const norm = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const driveBySku = new Map(Object.entries(MAP).map(([sku, files]) => [norm(sku), { sku, files }]));
const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Every product (active and hidden) and how many images each has
const products = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("products").select("id, sku, is_active, is_delete").order("id").range(from, from + 999);
  if (error) throw error;
  products.push(...data);
  if (data.length < 1000) break;
}
const { data: imgs, error: imgErr } = await db.from("product_images").select("product_id").limit(10000);
if (imgErr) throw imgErr;
const count = new Map();
for (const r of imgs) count.set(r.product_id, (count.get(r.product_id) ?? 0) + 1);

const missing = products.filter((p) => !count.get(p.id));
console.log(`${products.length} products, ${missing.length} without images${DRY ? " (dry run)" : ""}\n`);

const notOnDrive = [];
let uploaded = 0;
for (const p of missing) {
  const status = p.is_delete ? "deleted" : p.is_active ? "active" : "hidden";
  const drive = driveBySku.get(norm(p.sku));
  const local = drive ? [] : oldPhotos(p.sku);
  if (!drive && !local.length) { notOnDrive.push(`${p.sku} (${status})`); continue; }
  const sources = drive
    ? drive.files.map((f) => ({ label: f.name, ext: (f.name.split(".").pop() || "jpg").toLowerCase(), get: async () => {
        const res = await fetch(`https://drive.google.com/uc?export=download&id=${f.id}`, { redirect: "follow" });
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || !type.startsWith("image/")) throw new Error(`download failed (${res.status} ${type})`);
        return Buffer.from(await res.arrayBuffer());
      } }))
    : local.map((f) => ({ label: f, ext: path.extname(f).slice(1).toLowerCase(), get: async () => readFileSync(f) }));
  console.log(`${p.sku} (${status}): ${sources.length} image(s) from ${drive ? `Drive folder ${drive.sku}` : "the old project"}`);
  if (DRY) continue;
  for (const [i, src] of sources.entries()) {
    let body;
    try { body = await src.get(); } catch (e) { console.error(`  ! ${src.label}: ${e.message}`); continue; }
    const ext = src.ext === "jpeg" ? "jpg" : src.ext;
    const file = `${p.sku}/${p.sku}-${i + 1}.${ext}`; // plain names: some Drive file names are not ASCII
    const up = await db.storage.from(BUCKET).upload(file, body, { upsert: true, contentType: TYPES[ext] ?? "image/jpeg", cacheControl: "31536000" });
    if (up.error) { console.error(`  ! ${file}: ${up.error.message}`); continue; }
    const row = await db.from("product_images").upsert({ product_id: p.id, path: file, sort_order: i }, { onConflict: "product_id,path" });
    if (row.error) { console.error(`  ! link ${file}: ${row.error.message}`); continue; }
    uploaded++;
    console.log(`  + ${file} (${Math.round(body.length / 1024)} KB)`);
  }
}
console.log(`\n${DRY ? "Would upload images for" : `Uploaded ${uploaded} images for`} ${missing.length - notOnDrive.length} products.`);
if (notOnDrive.length) console.log(`No photos found (Drive or old project) for: ${notOnDrive.join(", ")}`);
