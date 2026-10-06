import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import { ProductCard } from "@/components/ProductCard";

type FeaturedProduct = {
  id: number;
  product_name: string;
  price: number | null;
  sku: string | null;
  default_image: boolean | null;
  slug?: string | null;
  title_tag?: string | null;
};

async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  "use cache";

  cacheLife({
    stale: 3600,
    revalidate: 1800,
    expire: 86400,
  });

  cacheTag("featured-products");

  const supabase = createPublicClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      product_name,
      price,
      sku,
      default_image,
      slug,
      title_tag
    `)
    .eq("is_active", true)
    .eq("is_delete", false)
    .limit(8);

  if (error) {
    console.error("Error loading products:", error.message);
    return [];
  }

  return products ?? [];
}

export async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  return (
    <section
      className="relative overflow-hidden bg-secondary py-20 md:py-24"
      aria-labelledby="featured-products-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(249,115,22,0.035),transparent)]" />

      <div className="cm-container relative">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">Popular right now</p>

            <h2 id="featured-products-heading" className="cm-section-title mt-3">
              Featured Products
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Explore trusted replacement parts and components from the Canuck Motors catalog.
            </p>
          </div>

          <Link
            href="/products"
            className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:border-brand/30 hover:text-brand sm:inline-flex"
          >
            View all
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="cm-card mt-10 p-10 text-center">
            <p className="text-muted-foreground">
              Featured products are currently unavailable.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
