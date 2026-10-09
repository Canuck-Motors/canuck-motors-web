import { sortByTypeOrder } from "@/lib/product-order";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { ProductCard } from "@/components/ProductCard";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Auto Parts",
  description:
    "Browse automotive parts from Canuck Motors. Search by part number or use vehicle fitment to find compatible parts.",
  alternates: { canonical: "/products" },
};

async function getProducts() {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 1800, expire: 86400 });
  cacheTag("products-page");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, product_name, price, slug, sku, title_tag, product_images ( path, sort_order )")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("product_name")
    .limit(300);

  if (error) throw new Error("Unable to load products.");
  // Water pumps first, then brake pads, timing belt kits, brake shoes
  return sortByTypeOrder(data ?? []).slice(0, 48);
}

export default async function ProductsPage() {
  const products = await getProducts();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/product/${product.slug || product.id}`,
      name: product.product_name,
    })),
  };

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_20%,#fafafa_100%)]">
        <section className="border-b border-black/5 bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <p className="cm-eyebrow">Canuck Motors Catalog</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.045em] md:text-6xl">
              Automotive parts built around fitment.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
              Browse the catalog, search by part number, or return to the vehicle finder
              to narrow results by year, make, model, engine, and trim.
            </p>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="cm-eyebrow">Catalog</p>
              <h2 className="cm-section-title mt-3">Auto Parts</h2>
            </div>
            <Link href="/#vehicle-finder" className="cm-button-dark">
              Find by vehicle
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="cm-card mt-8 p-10 text-center text-muted-foreground">
              No products are currently available.
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      </main>
    </>
  );
}
