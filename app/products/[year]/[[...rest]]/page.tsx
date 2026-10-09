import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { ProductCard } from "@/components/ProductCard";

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

  return (
    <main className="min-h-screen bg-secondary">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-sm text-muted-foreground"
        >
          <ol className="flex flex-wrap gap-2">
            <li>Home</li>
            <li>/</li>
            <li>Products</li>
            <li>/</li>
            <li>{yearRow.year}</li>
            {manufacturer && (
              <>
                <li>/</li>
                <li>{manufacturer.manufacturer_name}</li>
              </>
            )}
            {selectedModel && (
              <>
                <li>/</li>
                <li>{selectedModel.model_name}</li>
              </>
            )}
          </ol>
        </nav>

        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Compatible Automotive Parts
          </p>

          <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">
            Parts for {vehicleName}
          </h1>

          <p className="mt-4 leading-7 text-muted-foreground">
            Browse replacement parts and automotive components matched to your{" "}
            {vehicleName}. Compatibility is based on your selected vehicle
            configuration.
          </p>
        </header>

        <section aria-labelledby="products-heading" className="mt-10">
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}