// Display order for the store: the company started with water pumps.
// Each entry: [label, text the product name must contain, text it must NOT contain]
export const PRODUCT_TYPE_ORDER: { key: string; match: string; exclude?: string }[] = [
  { key: "water-pump", match: "water pump", exclude: "timing" },
  { key: "brake-pad", match: "brake pad" },
  { key: "timing-belt-kit", match: "timing belt kit" },
  { key: "brake-shoe", match: "brake shoe" },
];

export function typeRank(name: string) {
  const n = name.toLowerCase();
  const i = PRODUCT_TYPE_ORDER.findIndex(
    (t) => n.includes(t.match) && !(t.exclude && n.includes(t.exclude)),
  );
  return i === -1 ? PRODUCT_TYPE_ORDER.length : i;
}

// Stable sort: water pumps, brake pads, timing belt kits, brake shoes, then the rest.
// Works for products (default) and categories (pass a name getter).
export function sortByTypeOrder<T>(
  items: T[],
  getName: (item: T) => string = (item: any) => item.product_name,
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        typeRank(getName(a.item)) - typeRank(getName(b.item)) || a.index - b.index,
    )
    .map((x) => x.item);
}

// "Engine Water Pump - CM1204350" -> "Engine Water Pump"
export const groupLabel = (name: string) =>
  String(name ?? "").split(" - ")[0].replace(/\s*\(.*?\)\s*$/, "").trim() || "Other parts";
export const groupId = (label: string) =>
  "g-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Part type shown in the filter. One SKU = brake pads; a two-SKU "CMK1084-967" kit = brake pad kit
// (front + rear). Anything else keeps its own name (timing belt kits, brake shoes, ...).
export function partTypeLabel(product: { product_name: string; sku?: string | null }) {
  const name = String(product.product_name ?? "").toLowerCase();
  const sku = String(product.sku ?? "").trim().toUpperCase();
  const isBrake = name.includes("brake pad") || name.includes("brake kit") || /^CMK/.test(sku);
  if (isBrake && (/^CMK/.test(sku) || /\bkit\b/.test(name))) return "Brake Pad Kits";
  if (name.includes("brake pad")) return "Brake Pads";
  if (name.includes("water pump") && !name.includes("timing")) return "Water Pumps";
  return groupLabel(product.product_name);
}

const TYPE_SORT = ["Water Pumps", "Brake Pads", "Brake Pad Kits"];

// Splits products into part-type groups (water pumps, brake pads, brake pad kits, ...) in store order.
export function groupProducts<T extends { product_name: string; sku?: string | null}>(products: T[]) {
  const map = new Map<string, T[]>();
  for (const p of products) {
    const label = partTypeLabel(p);
    map.set(label, [...(map.get(label) ?? []), p]);
  }
  const rank = (label: string) => {
    const i = TYPE_SORT.indexOf(label);
    return i === -1 ? TYPE_SORT.length + typeRank(label) : i;
  };
  return [...map.entries()]
    .map(([label, items]) => ({ label, id: groupId(label), items }))
    .sort((a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label));
}
