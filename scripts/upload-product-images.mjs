// One-time transfer of the old site's images.
// Usage (from the project root):
//   node --env-file=.env.local scripts/upload-product-images.mjs ~/CanuckMotors/public/assets/images
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (used only by this script).
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const BUCKET = "product-images";
const dirArg = (process.argv[2] ?? "").replace(/^~/, os.homedir());
if (!dirArg) throw new Error("Pass the old images folder as the first argument.");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const norm = (s) => String(s ?? "").toUpperCase().replace(/^CM-?/, "").trim();
const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

// All products, keyed by normalized SKU
const bySku = new Map();
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("products").select("id, sku").range(from, from + 999);
  if (error) throw error;
  for (const p of data) if (p.sku) bySku.set(norm(p.sku), p);
  if (data.length < 1000) break;
}

const folders = (await readdir(dirArg, { withFileTypes: true })).filter(
  (d) => d.isDirectory() && /^CM/i.test(d.name),
);

let uploaded = 0, linked = 0;
const unmatched = [];

for (const folder of folders) {
  const product = bySku.get(norm(folder.name));
  if (!product) { unmatched.push(folder.name); continue; }

  const files = (await readdir(path.join(dirArg, folder.name)))
    .filter((f) => types[path.extname(f).toLowerCase()])
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const [i, file] of files.entries()) {
    const storagePath = `${folder.name}/${file}`;
    const body = await readFile(path.join(dirArg, folder.name, file));
    const up = await supabase.storage.from(BUCKET).upload(storagePath, body, {
      upsert: true,
      contentType: types[path.extname(file).toLowerCase()],
      cacheControl: "31536000",
    });
    if (up.error) { console.error("Upload failed:", storagePath, up.error.message); continue; }
    uploaded++;

    const row = await supabase.from("product_images").upsert(
      { product_id: product.id, path: storagePath, sort_order: i },
      { onConflict: "product_id,path" },
    );
    if (row.error) console.error("Link failed:", storagePath, row.error.message);
    else linked++;
  }
}

console.log(`Folders: ${folders.length}, uploaded: ${uploaded}, linked to products: ${linked}`);
console.log(unmatched.length ? `No matching product SKU for: ${unmatched.join(", ")}` : "Every folder matched a product.");
