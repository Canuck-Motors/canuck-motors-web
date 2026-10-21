// Adds the brake pad unboxing videos from the shared Google Drive folder
// "Brakepads/unboxing vidoe brakepads/brakepadsunboxing28design" to their product pages.
// SKU -> Drive file list is in scripts/drive-videos-map.json (built from that folder).
// The video is stored next to the photos and shown last in the product gallery.
//
// Usage, from the project root:
//   node --env-file=.env.local scripts/import-drive-videos.mjs --dry   (only shows what it would do)
//   node --env-file=.env.local scripts/import-drive-videos.mjs         (uploads and links the videos)
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

// Supabase caps uploads at 50 MB: bigger videos are shrunk with ffmpeg first
const LIMIT = 48 * 1048576;
async function ffmpegBin() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return "ffmpeg"; } catch {}
  try { return (await import("ffmpeg-static")).default; } catch {}
  return null;
}
async function shrink(body) {
  const bin = await ffmpegBin();
  if (!bin) throw new Error("video is over 50 MB and ffmpeg is missing (run: npm i -D ffmpeg-static)");
  const dir = mkdtempSync(path.join(os.tmpdir(), "cm-video-"));
  try {
    writeFileSync(path.join(dir, "in.mp4"), body);
    for (const [crf, height] of [[26, 1080], [30, 720], [34, 540]]) {
      execFileSync(bin, ["-y", "-loglevel", "error", "-i", path.join(dir, "in.mp4"),
        "-vf", `scale=-2:'min(${height},ih)'`, "-c:v", "libx264", "-preset", "medium", "-crf", String(crf),
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path.join(dir, "out.mp4")]);
      const out = readFileSync(path.join(dir, "out.mp4"));
      if (out.length <= LIMIT) return out;
    }
    throw new Error("still over 50 MB after compressing");
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const DRY = process.argv.includes("--dry");
const BUCKET = "product-images";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const MAP = JSON.parse(readFileSync(new URL("./drive-videos-map.json", import.meta.url), "utf8"));
const norm = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
// "945CM" style SKUs: compare digits+suffix both ways
const alt = (s) => norm(s).replace(/^CM/, "").replace(/CM$/, "");

const products = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("products").select("id, sku, is_active").order("id").range(from, from + 999);
  if (error) throw error;
  products.push(...data);
  if (data.length < 1000) break;
}
const bySku = new Map(products.map((p) => [norm(p.sku), p]));
// Videos already linked are skipped, so a re-run only retries the ones that failed
const { data: have, error: haveErr } = await db.from("product_images").select("path").like("path", "%-unboxing.mp4");
if (haveErr) throw haveErr;
const linked = new Set(have.map((r) => r.path));
const byAlt = new Map(products.map((p) => [alt(p.sku), p]));

const notFound = [];
const failed = [];
let done = 0;
for (const [sku, files] of Object.entries(MAP)) {
  const p = bySku.get(norm(sku)) ?? byAlt.get(alt(sku));
  if (!p) { notFound.push(sku); continue; }
  const f = files[0];
  const file = `${p.sku}/${p.sku}-unboxing.mp4`;
  if (linked.has(file)) { console.log(`${sku} -> ${p.sku}: already added`); continue; }
  console.log(`${sku} -> ${p.sku}${p.is_active ? "" : " (hidden)"}: ${f.name}`);
  if (DRY) continue;
  const res = await fetch(`https://drive.google.com/uc?export=download&confirm=t&id=${f.id}`, { redirect: "follow" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("video/")) { failed.push(`${p.sku}: download failed (${res.status} ${type})`); continue; }
  let body = Buffer.from(await res.arrayBuffer());
  if (body.length > LIMIT) {
    const before = Math.round(body.length / 1048576);
    try { body = await shrink(body); } catch (e) { failed.push(`${p.sku} (${before} MB): ${e.message}`); continue; }
    console.log(`  compressed ${before} MB -> ${Math.round(body.length / 1048576)} MB`);
  }
  const up = await db.storage.from(BUCKET).upload(file, body, { upsert: true, contentType: "video/mp4", cacheControl: "31536000" });
  if (up.error) {
    failed.push(`${p.sku} (${Math.round(body.length / 1048576)} MB): ${up.error.message}`);
    if (/size|large/i.test(up.error.message)) console.error("    Raise the file size limit: Supabase > Storage > Settings (and the product-images bucket limit / allowed types).");
    continue;
  }
  const row = await db.from("product_images").upsert({ product_id: p.id, path: file, sort_order: 99 }, { onConflict: "product_id,path" });
  if (row.error) { failed.push(`${p.sku} link: ${row.error.message}`); continue; }
  done++;
  console.log(`  + ${file} (${Math.round(body.length / 1048576)} MB)`);
}
console.log(`\n${DRY ? "Would add" : `Added`} ${DRY ? Object.keys(MAP).length - notFound.length : done} videos.`);
if (notFound.length) console.log(`No product found for: ${notFound.join(", ")}`);
if (failed.length) console.log(`\nFailed (${failed.length}):\n  ${failed.join("\n  ")}`);
