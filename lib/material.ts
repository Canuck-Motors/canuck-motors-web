// Brake pad SKUs: digits + "HSM" = semi-metallic, digits + "H" = ceramic (CM1012H, CM967HSM).
// Water pumps ending in "AH" (CM1467340AH = "with housing") are NOT brake pads.
export function materialOf(sku?: string | null): string | null {
  const s = (sku ?? "").trim().toUpperCase();
  if (/^CM\d+HSM$/.test(s)) return "Semi-Metallic";
  if (/^CM\d+H$/.test(s)) return "Ceramic";
  return null;
}

// "Disc Brake Pad Set" + sku CM1012H -> "Disc Brake Pad Set (Ceramic)"
export function withMaterial(name: string, sku?: string | null): string {
  const m = materialOf(sku);
  if (!m || /\((ceramic|semi[- ]?metallic)\)/i.test(name)) return name;
  return `${name} (${m})`;
}
