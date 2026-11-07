// Axel may only name parts the catalog really returned. This finds every part number or
// product link in a reply that is NOT in the allowed set (e.g. a made-up "CM1253256").
const PART_NUMBER = /\b(?:CMK?\d{3,}[A-Z0-9-]*|\d{3,}CM[A-Z0-9-]*)\b/gi;
const PRODUCT_LINK = /\/product\/([a-z0-9-]+)/gi;

export function partNumbersIn(text: string): string[] {
  return [
    ...Array.from(text.matchAll(PRODUCT_LINK), (m) => m[1]),
    ...Array.from(text.matchAll(PART_NUMBER), (m) => m[0]),
  ].map((x) => x.toUpperCase());
}

export function unknownPartNumbers(text: string, allowed: Set<string>): string[] {
  return Array.from(new Set(partNumbersIn(text).filter((x) => !allowed.has(x))));
}
