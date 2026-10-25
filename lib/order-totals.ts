type Totals = { total_amount?: unknown; delivery_fee?: unknown; sales_tax?: unknown };

// What the customer really paid: items (+ old tax_amount rules) + shipping + sales tax.
export function grandTotal(o: Totals) {
  return Number(o.total_amount ?? 0) + Number(o.delivery_fee ?? 0) + Number(o.sales_tax ?? 0);
}

export type StoredTaxLine = { name: string; rate?: number; cents: number };

export function storedTaxLines(raw: unknown): StoredTaxLine[] {
  return Array.isArray(raw)
    ? raw.filter((l): l is StoredTaxLine => !!l && typeof (l as StoredTaxLine).name === "string" && Number.isFinite(Number((l as StoredTaxLine).cents)))
    : [];
}
