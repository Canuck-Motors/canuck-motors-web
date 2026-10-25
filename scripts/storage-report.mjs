// Read-only: shows what takes the space in the "product-images" bucket (no changes, no downloads).
// Usage, from the project root:  node --env-file=.env.local scripts/storage-report.mjs
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

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
const files = await walk();
const kind = (p) => (/\.(mp4|webm|mov|m4v)$/i.test(p) ? "video" : (p.split(".").pop() || "?").toLowerCase());
const by = {};
for (const f of files) {
  const k = kind(f.path);
  by[k] ??= { n: 0, size: 0 };
  by[k].n++;
  by[k].size += f.size;
}
console.log("\nBy type:");
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].size - a[1].size)) {
  console.log(`  ${k.padEnd(6)} ${String(v.n).padStart(4)} files  ${mb(v.size).padStart(8)} MB`);
}
console.log("\n15 biggest files:");
for (const f of files.sort((a, b) => b.size - a.size).slice(0, 15)) console.log(`  ${mb(f.size).padStart(7)} MB  ${f.path}`);
const over = files.filter((f) => kind(f.path) !== "video" && f.size > 500 * 1024);
console.log(`\nImages over 500 KB: ${over.length} files, ${mb(over.reduce((s, f) => s + f.size, 0))} MB`);
