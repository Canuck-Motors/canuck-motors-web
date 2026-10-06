"use client";

import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type Brand = {
  id: number;
  manufacturer_name: string;
  slug: string | null;
};

export function BrandSearchGrid({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState("");

  const filteredBrands = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return brands;

    return brands.filter((brand) =>
      brand.manufacturer_name.toLowerCase().includes(term)
    );
  }, [brands, query]);

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <label htmlFor="brand-search" className="sr-only">
          Search vehicle brands
        </label>

        <div className="flex items-center overflow-hidden rounded-full border border-black/10 bg-white shadow-[0_12px_34px_rgba(0,0,0,0.06)] transition focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10">
          <div className="pl-5 text-muted-foreground">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>

          <input
            id="brand-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Acura, BMW, Ford, Honda..."
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-4 py-4 text-sm font-medium text-ink outline-none placeholder:text-muted-foreground/70 md:text-base"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear brand search"
              className="mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          {query.trim()
            ? `${filteredBrands.length} brand${filteredBrands.length === 1 ? "" : "s"} found`
            : `${brands.length} vehicle brands available`}
        </p>
      </div>

      {filteredBrands.length === 0 ? (
        <div className="cm-card mt-10 p-10 text-center">
          <h2 className="text-xl font-black text-ink">No matching brands</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different manufacturer name or clear the search.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="cm-button-dark mt-5"
          >
            Show all brands
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group flex min-h-[140px] items-end justify-between rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]"
            >
              <h2 className="text-xl font-black tracking-[-0.025em] text-ink">
                {brand.manufacturer_name}
              </h2>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white transition group-hover:bg-brand">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
