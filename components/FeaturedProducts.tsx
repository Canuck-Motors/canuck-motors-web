import Link from "next/link";
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

  const supabase = await createPublicClient();

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
      className="bg-secondary py-16 md:py-20"
      aria-labelledby="featured-products-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              Popular
            </p>

            <h2
              id="featured-products-heading"
              className="mt-2 text-3xl font-bold text-ink md:text-4xl"
            >
              Featured Products
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Explore popular replacement parts and automotive components from
              Canuck Motors.
            </p>
          </div>

          <Link
            href="/products"
            className="hidden text-sm font-medium text-ink/70 transition hover:text-brand sm:block"
          >
            View all →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 rounded-2xl border bg-white p-8 text-center">
            <p className="text-muted-foreground">
              Featured products are currently unavailable.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}

        <div className="mt-8 sm:hidden">
          <Link
            href="/products"
            className="text-sm font-medium text-brand"
          >
            View all products →
          </Link>
        </div>
      </div>
    </section>
  );
}