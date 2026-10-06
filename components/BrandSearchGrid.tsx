"use client";

import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type Brand = {
  id: number;
  manufacturer_name: string;
  slug: string | null;
};

const simpleIconSlugs: Record<string, string> = {
  Acura: "acura",
  Audi: "audi",
  BMW: "bmw",
  Buick: "buick",
  Cadillac: "cadillac",
  Chevrolet: "chevrolet",
  Chrysler: "chrysler",
  Dodge: "dodge",
  Fiat: "fiat",
  Ford: "ford",
  Genesis: "genesis",
  GMC: "gmc",
  Honda: "honda",
  Hyundai: "hyundai",
  INFINITI: "infiniti",
  Isuzu: "isuzu",
  Jaguar: "jaguar",
  Jeep: "jeep",
  Kia: "kia",
  "Land Rover": "landrover",
  Lexus: "lexus",
  Mazda: "mazda",
  "Mercedes-Benz": "mercedes",
  Mini: "mini",
  Mitsubishi: "mitsubishi",
  Nissan: "nissan",
  Porsche: "porsche",
  Ram: "ram",
  Saab: "saab",
  Smart: "smart",
  Subaru: "subaru",
  Suzuki: "suzuki",
  Toyota: "toyota",
  Volkswagen: "volkswagen",
  Volvo: "volvo",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function BrandMark({ name }: { name: string }) {
  const iconSlug = simpleIconSlugs[name];

  if (!iconSlug) {
    return (
      <div className="flex h-14 w-20 items-center justify-center rounded-2xl border border-black/5 bg-secondary/70 text-base font-black tracking-[0.08em] text-ink/45">
        {initials(name)}
      </div>
    );
  }

  return (
    <div className="flex h-14 w-24 items-center justify-center rounded-2xl border border-black/5 bg-secondary/60 p-3 transition duration-300 group-hover:bg-brand-tint">
      <img
        src={`https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/${iconSlug}.svg`}
        alt={`${name} logo`}
        loading="lazy"
        className="max-h-8 max-w-[68px] object-contain opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
        onError={(event) => {
          const image = event.currentTarget;
          image.style.display = "none";
          const fallback = image.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      <div
        className="hidden h-10 w-16 items-center justify-center text-sm font-black tracking-[0.08em] text-ink/45"
        aria-hidden="true"
      >
        {initials(name)}
      </div>
    </div>
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
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group flex min-h-[150px] flex-col justify-between rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_20px_46px_rgba(0,0,0,0.09)]"
            >
              <div className="flex items-start justify-between gap-4">
                <BrandMark name={brand.manufacturer_name} />

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition duration-300 group-hover:bg-brand">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-black tracking-[-0.025em] text-ink">
                  {brand.manufacturer_name}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
