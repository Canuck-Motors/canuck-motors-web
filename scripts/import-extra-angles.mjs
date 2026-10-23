// Adds the extra photo angles from the old project to products that already have photos.
// Source: ~/CanuckMotors/Tooling/image-preparation/photos/images/<number>/*
// Photos that look the same as one the product already has are skipped (picture compare, not file name).
//
// Usage, from the project root:
//   node --env-file=.env.local scripts/import-extra-angles.mjs --dry   (only shows what it would do)
//   node --env-file=.env.local scripts/import-extra-angles.mjs         (uploads and links the photos)
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const DRY = process.argv.includes("--dry");
const BUCKET = "product-images";
const DIR = path.join(os.homedir(), "CanuckMotors", "Tooling", "image-preparation", "photos", "images");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const norm = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const isVideo = (p) => /\.(mp4|webm|mov|m4v)$/i.test(p);
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Old photo folders by number ("125-9060" -> "1259060")
const folders = new Map();
for (const d of readdirSync(DIR)) {
  const full = path.join(DIR, d);
  if (!statSync(full).isDirectory()) continue;
  const files = readdirSync(full).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => path.join(full, f));
  if (files.length) folders.set(norm(d), [...(folders.get(norm(d)) ?? []), ...files]);
}

// Picture fingerprint (difference hash): near-identical photos give near-identical bits
async function fingerprint(buf) {
  const px = await sharp(buf).flatten({ background: "#ffffff" }).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  return bits;
}
const distance = (a, b) => [...a].reduce((n, c, i) => n + (c !== b[i] ? 1 : 0), 0);
const SAME = 8; // out of 64 bits

const products = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("products").select("id, sku, is_active").order("id").range(from, from + 999);
  if (error) throw error;
  products.push(...data);
  if (data.length < 1000) break;
}
const { data: imgs, error: imgErr } = await db.from("product_images").select("product_id, path, sort_order").limit(20000);
if (imgErr) throw imgErr;
const byProduct = new Map();
for (const r of imgs) if (!isVideo(r.path)) byProduct.set(r.product_id, [...(byProduct.get(r.product_id) ?? []), r]);

let added = 0, productsChanged = 0;
const failed = [];
for (const p of products) {
  const have = byProduct.get(p.id);
  const old = folders.get(norm(p.sku).replace(/^CM/, ""));
  if (!have?.length || !old?.length) continue;

  // Fingerprints of the photos the product already has
  const prints = [];
  for (const r of have) {
    const { data, error } = await db.storage.from(BUCKET).download(r.path);
    if (error) { failed.push(`${p.sku}: could not read ${r.path}`); continue; }
    try { prints.push(await fingerprint(Buffer.from(await data.arrayBuffer()))); } catch {}
  }
  const fresh = [];
  for (const f of old) {
    let print;
    try { print = await fingerprint(readFileSync(f)); } catch { continue; }
    if (prints.some((q) => distance(q, print) <= SAME)) continue;
    prints.push(print);
    fresh.push(f);
  }
  if (!fresh.length) continue;
  productsChanged++;
  console.log(`${p.sku}${p.is_active ? "" : " (hidden)"}: has ${have.length}, adding ${fresh.length}`);
  if (DRY) { added += fresh.length; continue; }

  let order = Math.max(...have.map((r) => r.sort_order ?? 0)) + 1;
  const taken = new Set(have.map((r) => r.path));
  let n = 1;
  for (const f of fresh) {
    let ext = path.extname(f).slice(1).toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    let file;
    do file = `${p.sku}/${p.sku}-angle-${n++}.${ext}`; while (taken.has(file));
    const up = await db.storage.from(BUCKET).upload(file, readFileSync(f), { upsert: true, contentType: TYPES[ext] ?? "image/jpeg", cacheControl: "31536000" });
    if (up.error) { failed.push(`${file}: ${up.error.message}`); continue; }
    const row = await db.from("product_images").upsert({ product_id: p.id, path: file, sort_order: Math.min(order++, 98) }, { onConflict: "product_id,path" });
    if (row.error) { failed.push(`link ${file}: ${row.error.message}`); continue; }
    added++;
    console.log(`  + ${file}`);
  }
}
console.log(`\n${DRY ? "Would add" : "Added"} ${added} photos to ${productsChanged} products.`);
if (failed.length) console.log(`\nFailed (${failed.length}):\n  ${failed.join("\n  ")}`);
