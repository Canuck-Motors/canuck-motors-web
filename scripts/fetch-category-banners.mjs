// Downloads the professional black-background brake pad photos (Google Drive:
// online photos/Brakepads/Sameer-blackbg-brakeprofessionalshoot) for the category banner,
// resizes them and saves them in public/categories/brake-pads/.
//
// Usage, from the project root:  node scripts/fetch-category-banners.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const FILES = {
  "brake-pads/hero-1.webp": "1pu_YwakW8YXVc7vRzxoFVAkL5WVSwuO1", // 026A3686: single pad, low angle
  "brake-pads/hero-2.webp": "1vZbfiEwScvtQi8RHsBgiR6LxuIJUfpBO", // 026A3704: group of pads
  "brake-pads/hero-3.webp": "1xQztMCIWfTw1W9TMQWtc4YmD-eMfX1iV", // 026A3659: single pad, logo front
};

for (const [out, id] of Object.entries(FILES)) {
  const res = await fetch(`https://drive.google.com/uc?export=download&confirm=t&id=${id}`, { redirect: "follow" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) {
    console.error(`! ${out}: download failed (${res.status} ${type})`);
    continue;
  }
  const file = path.join("public", "categories", out);
  mkdirSync(path.dirname(file), { recursive: true });
  const info = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(file);
  console.log(`+ ${file} (${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB)`);
}
