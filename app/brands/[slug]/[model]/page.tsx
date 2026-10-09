import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { ProductCard } from "@/components/ProductCard";
import { sortByTypeOrder } from "@/lib/product-order";

export const instant = false;

type PageProps = { params: Promise<{ slug: string; model: string }> };

async function getModelPage(brandSlug: string, modelSlug: string) {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 900, expire: 86400 });
  cacheTag(`brand-model-${brandSlug}-${modelSlug}`);

  const supabase = createPublicClient();

  const { data: brand } = await supabase
    .from("manufacturer")
    .select("id, manufacturer_name, slug")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return null;

  const { data: model } = await supabase
    .from("models")
    .select("id, model_name, slug")
    .eq("manufacturer_id", brand.id)
    .eq("slug", modelSlug)
    .maybeSingle();
  if (!model) return null;

  // Years this model has fitment for (links go to the exact-vehicle page)
  const { data: fitYears } = await supabase
    .from("vehicle_fitments")
    .select("year ( year )")
    .eq("manufacturer_id", brand.id)
    .eq("model_id", model.id)
    .limit(2000);

  const years = Array.from(
    new Set(
      (fitYears ?? [])
        .map((r: any) => Number(r.year?.year))
        .filter((y) => Number.isFinite(y) && y > 0),
    ),
  ).sort((a, b) => b - a);

  // Every product that fits any year/engine of this model
  const { data: products } = await supabase
    .from("products")
    .select(
      `id, product_name, price, slug, sku, title_tag,
       product_images ( path, sort_order ),
       product_fitments!inner ( vehicle_fitments!inner ( id ) )`,
    )
    .eq("is_active", true)
    .eq("is_delete", false)
    .eq("product_fitments.vehicle_fitments.manufacturer_id", brand.id)
    .eq("product_fitments.vehicle_fitments.model_id", model.id)
    .order("product_name")
    .limit(200);

  return {
    brand,
    model,
    years,
    products: sortByTypeOrder(products ?? []),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, model } = await params;
  const result = await getModelPage(slug, model);
  if (!result) return { title: "Vehicle Not Found" };

  const name = `${result.brand.manufacturer_name} ${result.model.model_name}`;
  return {
    title: `${name} Auto Parts`,
    description: `Water pumps, brake pads, timing belt kits and more for the ${name}. Confirm fitment by year and engine before ordering.`,
    alternates: { canonical: `/brands/${slug}/${model}` },
  };
}

export default async function BrandModelPage({ params }: PageProps) {
  const { slug, model } = await params;
  const result = await getModelPage(slug, model);
  if (!result) notFound();

  const name = `${result.brand.manufacturer_name} ${result.model.model_name}`;

  return (
    <main className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="cm-neon" aria-hidden="true" data-brand={result.brand.manufacturer_name} />
        <div className="cm-container relative z-10 py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="text-sm font-bold text-brand">
            <Link href="/brands" className="hover:underline">All brands</Link>
            <span className="mx-2 text-white/40">/</span>
            <Link href={`/brands/${slug}`} className="hover:underline">
              {result.brand.manufacturer_name}
            </Link>
          </nav>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-6xl">{name}</h1>
          <p className="mt-4 max-w-2xl text-white/65">
            Parts that fit the {name}. Pick your year to confirm the exact part for your
            engine.
          </p>

          {result.years.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                Choose your year
              </p>
              <div className="flex flex-wrap gap-2">
                {result.years.map((y) => (
                  <Link
                    key={y}
                    href={`/products/${y}/${slug}/${model}`}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-bold text-white transition hover:border-brand hover:bg-brand"
                  >
                    {y}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="cm-container py-12 md:py-16">
        <p className="cm-eyebrow">Compatible parts</p>
        <h2 className="cm-section-title mt-3">Parts for the {name}</h2>

        {result.products.length === 0 ? (
          <div className="cm-card mt-8 p-10 text-muted-foreground">
            No parts are mapped to this model yet.{" "}
            <Link href="/#vehicle-finder" className="font-bold text-brand hover:underline">
              Try the vehicle finder
            </Link>
            .
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Some parts differ by year and engine. Choose your year above, or check the
          Vehicle Compatibility tab on each part, before ordering.
        </p>
      </section>
    </main>
  );
}
