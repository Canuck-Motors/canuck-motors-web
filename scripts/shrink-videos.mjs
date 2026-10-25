// Shrinks the big unboxing videos in the "product-images" bucket so the project stays under
// the Supabase free storage limit (1 GB). Each video keeps its SAME path, so product pages
// do not change. Videos already under the target size are skipped.
//
// Usage, from the project root:
//   node --env-file=.env.local scripts/shrink-videos.mjs --dry     (test: shrinks 2 videos on this computer only, uploads nothing)
//   node --env-file=.env.local scripts/shrink-videos.mjs --apply   (shrinks all and replaces them in Supabase)
//
// Tip: the originals also exist in the Google Drive folder they were imported from.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;
const BUCKET = "product-images";
const TARGET = 15 * 1048576; // aim for about 15 MB per video
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function ffmpegBin() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return "ffmpeg"; } catch {}
  try { return (await import("ffmpeg-static")).default; } catch {}
  throw new Error("ffmpeg is missing (run: npm i -D ffmpeg-static)");
}

function compress(bin, input) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cm-shrink-"));
  try {
    writeFileSync(path.join(dir, "in.mp4"), input);
    let best = null;
    for (const [crf, height] of [[28, 720], [31, 720], [34, 540]]) {
      execFileSync(bin, ["-y", "-loglevel", "error", "-i", path.join(dir, "in.mp4"),
        "-vf", `scale=-2:'min(${height},ih)'`, "-c:v", "libx264", "-preset", "medium", "-crf", String(crf),
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path.join(dir, "out.mp4")]);
      best = readFileSync(path.join(dir, "out.mp4"));
      if (best.length <= TARGET) break;
    }
    return best;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function walk(prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const e of data) {
      const p = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) out.push(...(await walk(p)));
      else out.push({ path: p, size: Number(e.metadata?.size ?? 0) });
    }
    if (data.length < 1000) break;
  }
  return out;
}

const mb = (n) => (n / 1048576).toFixed(1);
const bin = await ffmpegBin();
const videos = (await walk()).filter((f) => /\.(mp4|m4v)$/i.test(f.path) && f.size > TARGET).sort((a, b) => b.size - a.size);
const todo = DRY ? videos.slice(0, 2) : videos;
console.log(`${videos.length} videos over ${mb(TARGET)} MB. ${DRY ? "DRY RUN: testing 2, nothing is uploaded." : "APPLYING to all."}\n`);

let saved = 0;
for (const v of todo) {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(v.path);
    if (error) throw error;
    const input = Buffer.from(await data.arrayBuffer());
    const output = compress(bin, input);
    if (output.length > input.length * 0.85) {
      console.log(`SKIP  ${v.path}: only ${mb(input.length)} -> ${mb(output.length)} MB, keeping the original`);
      continue;
    }
    if (APPLY) {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(v.path, output, { contentType: "video/mp4", cacheControl: "31536000", upsert: true });
      if (upErr) throw upErr;
    }
    saved += input.length - output.length;
    console.log(`${APPLY ? "DONE " : "TEST "} ${v.path}: ${mb(input.length)} -> ${mb(output.length)} MB`);
  } catch (e) {
    console.log(`FAIL  ${v.path}: ${e.message}`);
  }
}
console.log(`\n${APPLY ? "Saved" : "Would save (for these)"}: ${mb(saved)} MB`);
