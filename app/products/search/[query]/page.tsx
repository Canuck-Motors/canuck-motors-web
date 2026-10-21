import { findProductIds } from "@/lib/part-search";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { createPublicClient } from "@/lib/supabase/public";

type PageProps = {
  params: Promise<{
    query: string;
  }>;
};

type SearchProduct = {
  id: number;
  product_name: string;
  price: number | null;
  sku: string | null;
  slug: string | null;
  title_tag: string | null;
};

function cleanSearchTerm(value: string) {
  return decodeURIComponent(value)
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function searchProducts(searchTerm: string): Promise<SearchProduct[]> {
  "use cache";

  cacheLife({
    stale: 1800,
    revalidate: 900,
    expire: 43200,
  });

  cacheTag(`product-search:${searchTerm.toLowerCase()}`);

  const supabase = createPublicClient();

  const matchedProductIds = await findProductIds(supabase, searchTerm);

  if (matchedProductIds.size === 0) {
    return [];
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, product_name, price, sku, slug, title_tag, product_images ( path, sort_order )")
    .in("id", Array.from(matchedProductIds))
    .eq("is_active", true)
    .eq("is_delete", false)
    .limit(1000); // all matches (was 50: "water pump" alone matches about 200)

  if (error) {
    console.error("Product search result lookup failed:", error.message);
    return [];
  }

  return products ?? [];
}

const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

// "2012 Dodge Grand Caravan", "ford f150", "mustang": the search box is for parts, so
// when the text names a vehicle, point the customer to that vehicle's parts.
type Make = { id: number; manufacturer_name: string; slug: string };
type ModelChoice = { id: number; model_name: string; slug: string; brand: Make };

async function allMakesAndModels() {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 3600, expire: 86400 });
  cacheTag("vehicle-names");
  const supabase = createPublicClient();
  const { data: makes } = await supabase.from("manufacturer").select("id, manufacturer_name, slug");
  const models: { id: number; model_name: string; slug: string; manufacturer_id: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("models")
      .select("id, model_name, slug, manufacturer_id")
      .order("id")
      .range(from, from + 999);
    models.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { makes: (makes ?? []) as Make[], models };
}

async function findVehicle(term: string) {
  const supabase = createPublicClient();
  const year = term.match(/\b(19[5-9]\d|20[0-4]\d)\b/)?.[1] ?? null;
  // Nicknames people type for a make
  const named = term
    .replace(/\b(19[5-9]\d|20[0-4]\d)\b/, "")
    .trim()
    .replace(/^(chevy)\b/i, "Chevrolet")
    .replace(/^(vw)\b/i, "Volkswagen")
    .replace(/^(mercedes|benz|merc)\b(?!-)/i, "Mercedes-Benz")
    .replace(/^(caddy)\b/i, "Cadillac");
  const text = squash(named);
  if (!text) return null;

  const { makes, models } = await allMakesAndModels();
  const byId = new Map(makes.map((m) => [m.id, m]));
  const brand = makes
    .filter((m) => text.startsWith(squash(m.manufacturer_name)))
    .sort((a, b) => b.manufacturer_name.length - a.manufacturer_name.length)[0];

  const toChoice = (m: (typeof models)[number]): ModelChoice => ({
    id: m.id,
    model_name: m.model_name,
    slug: m.slug,
    brand: byId.get(m.manufacturer_id)!,
  });
  const valid = models.filter((m) => byId.get(m.manufacturer_id) && m.slug);

  // A model typed on its own ("mustang", "accord"): exact model name, any make.
  // Checked as well as the make reading, because some model names start with a
  // make name: "Accord" starts with "AC", "Ramcharger" with "Ram", "Genesis" is both.
  const exactAny = valid.filter((m) => squash(m.model_name) === text).map(toChoice);

  const rest = brand ? text.slice(squash(brand.manufacturer_name).length) : text;
  if (brand && !rest) {
    if (exactAny.length) return { brand, model: null as ModelChoice | null, year, choices: exactAny, brandLink: brand };
    return { brand, model: null as ModelChoice | null, year, choices: [] as ModelChoice[] };
  }

  // Models of that make: exact name first ("Ram 1500"), then names starting with it.
  // "Ram" alone matches several models, so never pick one for the customer: let them choose.
  let candidates: ModelChoice[] = [];
  if (brand) {
    const pool = valid.filter((m) => m.manufacturer_id === brand.id).map(toChoice);
    const exact = pool.filter((m) => squash(m.model_name) === rest);
    candidates = exact.length ? exact : pool.filter((m) => squash(m.model_name).startsWith(rest));
  }
  for (const m of exactAny) if (!candidates.some((c) => c.id === m.id)) candidates.push(m);
  if (candidates.length === 0) return brand ? { brand, model: null as ModelChoice | null, year, choices: [] as ModelChoice[] } : null;
  if (candidates.length === 1) return { brand: candidates[0].brand, model: candidates[0], year, choices: [] as ModelChoice[] };

  // With a year, keep only the models that have parts that year
  if (year && candidates.length > 1) {
    const { data: yr } = await supabase.from("year").select("id").eq("year", Number(year)).maybeSingle();
    if (yr) {
      const { data: fits } = await supabase
        .from("vehicle_fitments")
        .select("model_id")
        .eq("year_id", yr.id)
        .in("model_id", candidates.map((m) => m.id))
        .limit(1000);
      const have = new Set((fits ?? []).map((f: any) => f.model_id));
      const filtered = candidates.filter((m) => have.has(m.id));
      if (filtered.length > 0) candidates = filtered;
    }
  }

  candidates.sort(
    (a, b) =>
      a.brand.manufacturer_name.localeCompare(b.brand.manufacturer_name) ||
      a.model_name.localeCompare(b.model_name, undefined, { numeric: true }),
  );
  if (candidates.length === 1) return { brand: candidates[0].brand, model: candidates[0], year, choices: [] as ModelChoice[] };
  return { brand: brand ?? null, model: null as ModelChoice | null, year, choices: candidates.slice(0, 40) };
}

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { query } = await params;
  const searchTerm = cleanSearchTerm(query);

  return {
    title: searchTerm
      ? `Search Results for ${searchTerm}`
      : "Product Search",
    description: searchTerm
      ? `Search Canuck Motors products matching ${searchTerm}.`
      : "Search Canuck Motors automotive parts.",
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ProductSearchPage({
  params,
}: PageProps) {
  const { query } = await params;
  const searchTerm = cleanSearchTerm(query);
  // A vehicle typed in the search box ("ford f150", "2014 ford f-150") goes straight to
  // that vehicle's parts. It is checked first: "f150" also appears inside some unrelated
  // OE numbers, which used to show 1 random part instead of the 23 that fit an F-150.
  const vehicle = searchTerm ? await findVehicle(searchTerm) : null;
  if (vehicle?.model) {
    const b = vehicle.model.brand.slug;
    redirect(vehicle.year ? `/products/${vehicle.year}/${b}/${vehicle.model.slug}` : `/brands/${b}/${vehicle.model.slug}`);
  }
  const pickModel = Boolean(vehicle && (vehicle.choices.length > 1 || ("brandLink" in vehicle && vehicle.brandLink)));
  const products = searchTerm && !pickModel ? await searchProducts(searchTerm) : [];
  if (vehicle?.brand && !pickModel && products.length === 0) redirect(`/brands/${vehicle.brand.slug}`);

  return (
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Product Search
          </p>
          <h1 className="mt-3 text-3xl font-bold text-ink md:text-5xl">
            {searchTerm
              ? <>Search results for “{searchTerm}”</>
              : "Search Canuck Motors products"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            Search by Canuck Motors part number, product name, interchange number,
            or OE number.
          </p>
        </header>

        {pickModel && vehicle && (
          <section className="mt-10 rounded-2xl border border-brand/20 bg-white p-6 md:p-8">
            <h2 className="text-xl font-bold text-ink">
              Which {vehicle.brand ? `${vehicle.brand.manufacturer_name} ` : ""}model do you mean?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick your model to see the parts that fit{vehicle.year ? ` a ${vehicle.year}` : ""}.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {"brandLink" in vehicle && vehicle.brandLink && (
                <Link
                  href={`/brands/${vehicle.brandLink.slug}`}
                  className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-ink transition hover:border-brand hover:bg-brand hover:text-white"
                >
                  All {vehicle.brandLink.manufacturer_name} models
                </Link>
              )}
              {vehicle.choices.map((m) => (
                <Link
                  key={m.id}
                  href={
                    vehicle.year
                      ? `/products/${vehicle.year}/${m.brand.slug}/${m.slug}`
                      : `/brands/${m.brand.slug}/${m.slug}`
                  }
                  className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-ink transition hover:border-brand hover:bg-brand hover:text-white"
                >
                  {m.brand.manufacturer_name} {m.model_name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {products.length === 0 && !pickModel ? (
          <section className="mt-10 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-ink">No products found</h2>
            <p className="mt-2 text-muted-foreground">
              Try another part number, OE number, interchange number, or product name.
            </p>
          </section>
        ) : products.length === 0 ? null : (
          <section aria-labelledby="search-results-heading" className="mt-10">
            <div className="mb-6">
              <h2 id="search-results-heading" className="text-2xl font-bold text-ink">
                Matching products
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {products.length} {products.length === 1 ? "product" : "products"} found
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
