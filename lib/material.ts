// SKU ending in "HSM" = semi-metallic, ending in "H" = ceramic.
export function materialOf(sku?: string | null): string | null {
  const s = (sku ?? "").trim().toUpperCase();
  if (s.endsWith("HSM")) return "Semi-Metallic";
  if (s.endsWith("H")) return "Ceramic";
  return null;
}

// "Front Brake Pad Set" + sku CM1302030AH -> "Front Brake Pad Set (Ceramic)"
export function withMaterial(name: string, sku?: string | null): string {
  const m = materialOf(sku);
  if (!m || /\((ceramic|semi[- ]?metallic)\)/i.test(name)) return name;
  return `${name} (${m})`;
}
