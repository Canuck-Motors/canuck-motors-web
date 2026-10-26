"use client";

import ProductGridView from "@/components/ProductGridView";
import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";

type Product = Parameters<typeof ProductCard>[0]["product"] & { position?: string | null };

const OPTIONS = [
  { key: "all", label: "All" },
  { key: "front", label: "Front" },
  { key: "rear", label: "Rear" },
  { key: "kit", label: "Front & Rear Kit" },
] as const;

function bucket(position?: string | null) {
  const p = (position ?? "").toLowerCase();
  if (p.includes("front") && p.includes("rear")) return "kit";
  if (p.includes("front")) return "front";
  if (p.includes("rear")) return "rear";
  return "";
}

export function CategoryProducts({ products, showPosition }: { products: Product[]; showPosition: boolean }) {
  const [sel, setSel] = useState<(typeof OPTIONS)[number]["key"]>("all");
  const shown = sel === "all" ? products : products.filter((p) => bucket(p.position) === sel);
  const count = (k: string) => (k === "all" ? products.length : products.filter((p) => bucket(p.position) === k).length);

  return (
    <>
      {showPosition && (
        <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Brake pad position">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={sel === o.key}
              onClick={() => setSel(o.key)}
              className={`rounded-full border px-5 py-2.5 text-sm font-bold transition ${
                sel === o.key
                  ? "border-brand bg-brand text-white shadow-[0_8px_22px_rgba(214,40,40,0.3)]"
                  : "border-black/10 bg-white text-ink hover:border-brand/40"
              }`}
            >
              {o.label} <span className="opacity-60">({count(o.key)})</span>
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <div className="cm-card p-10 text-center">
          <p className="text-muted-foreground">No parts in this option.</p>
        </div>
      ) : (
        <ProductGridView>
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ProductGridView>
      )}
    </>
  );
}
