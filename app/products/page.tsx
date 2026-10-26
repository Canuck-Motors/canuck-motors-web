import ProductGridView from "@/components/ProductGridView";
import { sortByTypeOrder } from "@/lib/product-order";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { ProductCard } from "@/components/ProductCard";
import { createPublicClient } from "@/lib/supabase/public";
import { safeJsonLd } from "@/lib/json-ld";

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
    .limit(1000);

  if (error) throw new Error("Unable to load products.");
  // Water pumps first, then brake pads, timing belt kits, brake shoes
  // Every live part (it used to stop at 48, hiding most of the catalog)
  return sortByTypeOrder(data ?? []);
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
        <section className="relative isolate overflow-hidden border-b border-black/5 bg-ink text-white">
          {/* Animated background (decoration only) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="cm-grid-drift absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_75%_40%,#000_15%,transparent_70%)]" />
            <div className="cm-glow absolute -right-20 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
            <div className="cm-glow absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-brand/15 blur-3xl [animation-delay:-3s]" />
            <svg viewBox="0 0 400 400" className="absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-60 md:-right-10 lg:right-10">
              <g className="cm-spin" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2">
                <circle cx="200" cy="200" r="190" />
                <circle cx="200" cy="200" r="168" stroke="rgba(214,40,40,0.55)" strokeWidth="3" />
                <circle cx="200" cy="200" r="96" />
                <circle cx="200" cy="200" r="30" strokeWidth="3" />
                <g fill="rgba(255,255,255,0.10)" stroke="none"><circle cx="330.0" cy="200.0" r="5" /><circle cx="312.6" cy="265.0" r="5" /><circle cx="265.0" cy="312.6" r="5" /><circle cx="200.0" cy="330.0" r="5" /><circle cx="135.0" cy="312.6" r="5" /><circle cx="87.4" cy="265.0" r="5" /><circle cx="70.0" cy="200.0" r="5" /><circle cx="87.4" cy="135.0" r="5" /><circle cx="135.0" cy="87.4" r="5" /><circle cx="200.0" cy="70.0" r="5" /><circle cx="265.0" cy="87.4" r="5" /><circle cx="312.6" cy="135.0" r="5" /></g>
                <g fill="rgba(255,255,255,0.10)" stroke="none"><circle cx="200.0" cy="152.0" r="9" /><circle cx="245.7" cy="185.2" r="9" /><circle cx="228.2" cy="238.8" r="9" /><circle cx="171.8" cy="238.8" r="9" /><circle cx="154.3" cy="185.2" r="9" /></g>
                <path d="M200 10 L200 70 M200 330 L200 390 M10 200 L70 200 M330 200 L390 200" stroke="rgba(255,255,255,0.18)" />
              </g>
              <g className="cm-spin-rev" fill="none" stroke="rgba(214,40,40,0.35)" strokeWidth="2" strokeDasharray="4 12">
                <circle cx="200" cy="200" r="205" />
              </g>
            </svg>
            {[18, 46, 72].map((top, i) => (
              <span
                key={top}
                className="cm-spark absolute left-0 h-px w-40 bg-gradient-to-r from-transparent via-brand to-transparent"
                style={{ top: `${top}%`, animationDelay: `${i * 2.3}s` }}
              />
            ))}
          </div>
          <div className="cm-container relative py-14 md:py-20">
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
            <div className="mt-8">
              <ProductGridView>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </ProductGridView>
            </div>
          )}
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }}
        />
      </main>
    </>
  );
}
