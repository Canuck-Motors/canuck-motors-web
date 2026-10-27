import ProductGridView from "@/components/ProductGridView";
import BrandNeon from "@/components/BrandNeon";
import VehicleParts from "@/components/VehicleParts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { groupProducts } from "@/lib/product-order";
import { safeJsonLd } from "@/lib/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Route: app/products/[year]/[[...rest]]/page.tsx
// rest = [make, model, engine, trim], every part optional
type PageProps = {
  params: Promise<{
    year: string;
    rest?: string[];
  }>;
};

function titleCaseSlug(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function splitRest(rest?: string[]) {
  const [make, model, engine, trim, ...extra] = rest ?? [];
  return { make, model, engine, trim, extra };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { year, rest } = await params;
  const { make, model, engine, trim } = splitRest(rest);

  const vehicleName = [
    year,
    make ? titleCaseSlug(make) : null,
    model ? titleCaseSlug(model) : null,
    trim ? titleCaseSlug(trim) : null,
  ]
    .filter(Boolean)
    .join(" ");

  const canonicalPath = ["/products", year, ...(rest ?? [])].join("/");

  return {
    title: `${vehicleName} Parts & Accessories | Canuck Motors`,
    description: `Shop compatible automotive parts and accessories for the ${vehicleName}. Find reliable replacement parts matched to your vehicle at Canuck Motors.`,
    alternates: {
      canonical: canonicalPath,
    },
    // Only full vehicle pages (with engine) are indexed.
    // Partial pages (year / make / model only) stay out of search results.
    robots: engine
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: `${vehicleName} Parts | Canuck Motors`,
      description: `Browse compatible parts for the ${vehicleName}.`,
      type: "website",
      url: canonicalPath,
    },
  };
}

export default async function VehicleProductsPage({ params }: PageProps) {
  const { year, rest } = await params;
  const { make, model, engine, trim, extra } = splitRest(rest);

  if (extra.length > 0) {
    notFound();
  }

  const supabase = await createPublicClient();

  const yearNumber = Number(year);

  if (!yearNumber) {
    notFound();
  }

  // -----------------------------------------
  // FIND YEAR
  // -----------------------------------------

  const { data: yearRow } = await supabase
    .from("year")
    .select("id, year")
    .eq("year", yearNumber)
    .maybeSingle();

  if (!yearRow) {
    notFound();
  }

  // -----------------------------------------
  // FIND MANUFACTURER (if in URL)
  // -----------------------------------------

  let manufacturer: {
    id: number;
    manufacturer_name: string;
    slug: string;
  } | null = null;

  if (make) {
    const { data } = await supabase
      .from("manufacturer")
      .select("id, manufacturer_name, slug")
      .eq("slug", make)
      .maybeSingle();

    if (!data) {
      notFound();
    }
    manufacturer = data;
  }

  // -----------------------------------------
  // FIND MODEL (if in URL)
  // -----------------------------------------

  let selectedModel: {
    id: number;
    model_name: string;
    slug: string;
  } | null = null;

  if (model && manufacturer) {
    const { data } = await supabase
      .from("models")
      .select("id, model_name, slug")
      .eq("manufacturer_id", manufacturer.id)
      .eq("slug", model)
      .maybeSingle();

    if (!data) {
      notFound();
    }
    selectedModel = data;
  }

  // -----------------------------------------
  // FIND ENGINE (if in URL)
  // -----------------------------------------

  let selectedEngine: {
    id: number;
    engine_name: string;
    slug: string;
  } | null = null;

  if (engine && selectedModel) {
    const { data } = await supabase
      .from("engine_sizes")
      .select("id, engine_name, slug")
      .eq("model_id", selectedModel.id)
      .eq("slug", engine)
      .maybeSingle();

    if (!data) {
      notFound();
    }
    selectedEngine = data;
  }

  // -----------------------------------------
  // FIND TRIM (if in URL)
  // -----------------------------------------

  let selectedTrim: {
    id: number;
    trim_name: string;
    slug: string;
  } | null = null;

  if (trim && selectedEngine) {
    const { data } = await supabase
      .from("trim")
      .select("id, trim_name, slug")
      .eq("engine_size_id", selectedEngine.id)
      .eq("slug", trim)
      .maybeSingle();

    if (!data) {
      notFound();
    }
    selectedTrim = data;
  }

  // -----------------------------------------
  // PRODUCTS: one query, filtered by whatever was selected.
  // Joins products -> product_fitments -> vehicle_fitments, so broad
  // searches (year only) do not need huge ID lists.
  // -----------------------------------------

  let productQuery = supabase
    .from("products")
    .select(
      `
      id,
      product_name,
      price,
      sku,
      position,
      slug,
      meta_description,
      title_tag,
      product_images ( path, sort_order ),
      product_fitments!inner (
        vehicle_fitments!inner ( id )
      )
    `,
    )
    .eq("is_active", true)
    .eq("product_fitments.vehicle_fitments.year_id", yearRow.id);

  if (manufacturer) {
    productQuery = productQuery.eq(
      "product_fitments.vehicle_fitments.manufacturer_id",
      manufacturer.id,
    );
  }
  if (selectedModel) {
    productQuery = productQuery.eq(
      "product_fitments.vehicle_fitments.model_id",
      selectedModel.id,
    );
  }
  if (selectedEngine) {
    productQuery = productQuery.eq(
      "product_fitments.vehicle_fitments.engine_size_id",
      selectedEngine.id,
    );
  }
  if (selectedTrim) {
    productQuery = productQuery.eq(
      "product_fitments.vehicle_fitments.trim_id",
      selectedTrim.id,
    );
  }

  const { data: productRows, error: productError } = await productQuery;

  if (productError) {
    console.error("Vehicle products lookup failed:", productError.message);
  }

  const products: any[] = productRows ?? [];

  const vehicleName = [
    yearRow.year,
    manufacturer?.manufacturer_name,
    selectedModel?.model_name,
    selectedEngine?.engine_name,
    selectedTrim?.trim_name,
  ]
    .filter(Boolean)
    .join(" ");

  // Group the parts by type (water pumps, brake pads, ...) so the page is easy to scan.
  const groups = groupProducts(products);

  const canonicalPath = ["/products", yearRow.year, ...(rest ?? [])].join("/");
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Parts for ${vehicleName}`,
    url: `${SITE_URL}${canonicalPath}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 50).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}/product/${product.slug || product.id}`,
        name: product.product_name,
      })),
    },
  };

  const chip =
    "rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white/85";

  return (
    <main className="min-h-screen bg-secondary">
      {/* Vehicle header */}
      <section className="relative overflow-hidden bg-ink text-white">
        {manufacturer && <BrandNeon name={manufacturer.manufacturer_name} />}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
        <div className="cm-container relative z-10 py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-5 text-sm text-white/60">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href="/" className="hover:text-white">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/products" className="hover:text-white">Products</Link>
              </li>
              <li>/</li>
              <li>{yearRow.year}</li>
              {manufacturer && (
                <>
                  <li>/</li>
                  <li>
                    <Link href={`/brands/${manufacturer.slug}`} className="hover:text-white">
                      {manufacturer.manufacturer_name}
                    </Link>
                  </li>
                </>
              )}
              {selectedModel && (
                <>
                  <li>/</li>
                  <li className="text-white">{selectedModel.model_name}</li>
                </>
              )}
            </ol>
          </nav>

          <p className="cm-eyebrow">Compatible Automotive Parts</p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-6xl">
            Parts for {vehicleName}
          </h1>

          <p className="mt-5 max-w-2xl leading-7 text-white/70">
            Browse replacement parts and automotive components matched to your{" "}
            {vehicleName}. Compatibility is based on your selected vehicle
            configuration.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className={chip}>{yearRow.year}</span>
            {manufacturer && <span className={chip}>{manufacturer.manufacturer_name}</span>}
            {selectedModel && <span className={chip}>{selectedModel.model_name}</span>}
            {selectedEngine && <span className={chip}>{selectedEngine.engine_name}</span>}
            {selectedTrim && <span className={chip}>{selectedTrim.trim_name}</span>}
            <span className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-black text-white">
              {products.length} compatible {products.length === 1 ? "part" : "parts"}
            </span>
          </div>

        </div>
      </section>

      <div className="cm-container py-10 md:py-14">
        <section aria-labelledby="products-heading">
          <h2 id="products-heading" className="sr-only">
            Compatible products
          </h2>

          {products.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center">
              <h2 className="text-xl font-semibold text-ink">
                No compatible products found
              </h2>

              <p className="mt-2 text-muted-foreground">
                No compatible products have been mapped for this selection yet.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              <VehicleParts
                vehicleName={vehicleName}
                total={products.length}
                groups={groups.map((g) => ({
                  id: g.id,
                  label: g.label,
                  count: g.items.length,
                  content: (
                    <ProductGridView
                      toggle
                      className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                    >
                      {g.items.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </ProductGridView>
                  ),
                }))}
              />

              <aside className="rounded-[26px] border border-brand/15 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] md:flex md:items-center md:justify-between md:gap-6 md:p-8">
                <div>
                  <h3 className="text-xl font-black text-ink">Not sure which one fits?</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Several options can fit the same vehicle. Ask Axel, our parts assistant, a few
                    quick questions and we will help you choose the exact part before you buy.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }}
        />
      </div>
    </main>
  );
}
