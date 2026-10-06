"use client";

import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type Brand = {
  id: number;
  manufacturer_name: string;
  slug: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CarSilhouette() {
  return (
    <svg
      viewBox="0 0 320 120"
      className="h-full w-full"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M38 77c6-16 13-28 25-34 15-8 41-10 64-10h48c19 0 34 4 49 12l27 14c8 4 16 8 23 16l8 10H38Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M102 34c10 0 21 1 30 4 10 3 19 9 26 18H76c6-9 14-15 26-22Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M165 34c18 0 33 4 46 11l19 11h-67c-3-10-2-16 2-22Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="94" cy="84" r="18" stroke="currentColor" strokeWidth="6" />
      <circle cx="232" cy="84" r="18" stroke="currentColor" strokeWidth="6" />
      <path
        d="M112 84h102M48 84h28M250 84h28"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/25 hover:shadow-[0_24px_54px_rgba(0,0,0,0.11)]"
            >
              <div className="relative h-[150px] overflow-hidden bg-[linear-gradient(145deg,#111111_0%,#1d1d1d_72%,#2a160b_100%)]">
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand/20 blur-3xl transition duration-500 group-hover:bg-brand/30" />

                <div className="absolute left-5 top-5 flex h-12 min-w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-3 text-sm font-black tracking-[0.08em] text-white backdrop-blur-sm">
                  {initials(brand.manufacturer_name)}
                </div>

                <div className="absolute inset-x-5 bottom-2 top-7 text-white/22 transition duration-500 group-hover:translate-x-1 group-hover:text-brand/45">
                  <CarSilhouette />
                </div>

                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
              </div>

              <div className="flex min-h-[94px] items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
                    Vehicle brand
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-ink">
                    {brand.manufacturer_name}
                  </h2>
                </div>

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition duration-300 group-hover:bg-brand group-hover:shadow-[0_8px_24px_rgba(249,115,22,0.3)]">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
