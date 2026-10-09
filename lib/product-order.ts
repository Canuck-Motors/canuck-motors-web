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
