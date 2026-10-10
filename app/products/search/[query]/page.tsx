import { findProductIds } from "@/lib/part-search";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
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
    .limit(50);

  if (error) {
    console.error("Product search result lookup failed:", error.message);
    return [];
  }

  return products ?? [];
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
  const products = searchTerm ? await searchProducts(searchTerm) : [];

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

        {products.length === 0 ? (
          <section className="mt-10 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-ink">No products found</h2>
            <p className="mt-2 text-muted-foreground">
              Try another part number, OE number, interchange number, or product name.
            </p>
          </section>
        ) : (
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
