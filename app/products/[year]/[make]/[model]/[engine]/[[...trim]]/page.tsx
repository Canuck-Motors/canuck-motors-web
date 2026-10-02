import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";

type PageProps = {
  params: Promise<{
    year: string;
    make: string;
    model: string;
    engine: string;
    trim?: string[];
  }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseSlug(value: string) {
  return value
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { year, make, model, engine, trim } =
    await params;

  const makeName = titleCaseSlug(make);
  const modelName = titleCaseSlug(model);
  const trimName = trim?.[0]
    ? titleCaseSlug(trim[0])
    : null;

  const vehicleName = [
    year,
    makeName,
    modelName,
    trimName,
  ]
    .filter(Boolean)
    .join(" ");

  const canonicalPath = [
    "/products",
    year,
    make,
    model,
    engine,
    ...(trim ?? []),
  ].join("/");

  return {
    title: `${vehicleName} Parts & Accessories | Canuck Motors`,

    description: `Shop compatible automotive parts and accessories for the ${vehicleName}. Find reliable replacement parts matched to your vehicle at Canuck Motors.`,

    alternates: {
      canonical: canonicalPath,
    },

    openGraph: {
      title: `${vehicleName} Parts | Canuck Motors`,
      description: `Browse compatible parts for the ${vehicleName}.`,
      type: "website",
      url: canonicalPath,
    },
  };
}

export default async function VehicleProductsPage({
  params,
}: PageProps) {
  const { year, make, model, engine, trim } =
    await params;

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
  // FIND MANUFACTURER
  // -----------------------------------------

  const { data: manufacturer } = await supabase
    .from("manufacturer")
    .select("id, manufacturer_name, slug")
    .eq("slug", make)
    .maybeSingle();

    if (!manufacturer) {
    notFound();
    }

  // -----------------------------------------
  // FIND MODEL
  // -----------------------------------------

  const { data: selectedModel } = await supabase
    .from("models")
    .select("id, model_name, slug")
    .eq("manufacturer_id", manufacturer.id)
    .eq("slug", model)
    .maybeSingle();

    if (!selectedModel) {
    notFound();
    }


  // -----------------------------------------
  // FIND ENGINE
  // -----------------------------------------

  const { data: selectedEngine } = await supabase
    .from("engine_sizes")
    .select("id, engine_name, slug")
    .eq("model_id", selectedModel.id)
    .eq("slug", engine)
    .maybeSingle();

    if (!selectedEngine) {
    notFound();
    }

  // -----------------------------------------
  // FIND TRIM IF PROVIDED
  // -----------------------------------------

  let selectedTrim:
  | {
      id: number;
      trim_name: string;
      slug: string;
    }
  | null = null;

    if (trim?.[0]) {
    const { data } = await supabase
        .from("trim")
        .select("id, trim_name, slug")
        .eq("engine_size_id", selectedEngine.id)
        .eq("slug", trim[0])
        .maybeSingle();

          selectedTrim = data;

        if (!selectedTrim) {
            notFound();
        }
  }

  // -----------------------------------------
  // FIND FITMENTS
  // -----------------------------------------

  let fitmentQuery = supabase
    .from("vehicle_fitments")
    .select("id")
    .eq("year_id", yearRow.id)
    .eq(
      "manufacturer_id",
      manufacturer.id
    )
    .eq("model_id", selectedModel.id)
    .eq(
      "engine_size_id",
      selectedEngine.id
    );

  if (selectedTrim) {
    fitmentQuery = fitmentQuery.eq(
      "trim_id",
      selectedTrim.id
    );
  }

  const { data: fitments } =
    await fitmentQuery;

  const fitmentIds =
    fitments?.map((item) => item.id) ?? [];

  // -----------------------------------------
  // PRODUCT MAPPINGS
  // -----------------------------------------

  let products: any[] = [];

  if (fitmentIds.length > 0) {
    const { data: mappings } =
      await supabase
        .from("product_fitments")
        .select("product_id")
        .in(
          "vehicle_fitment_id",
          fitmentIds
        );

    const productIds = [
      ...new Set(
        mappings?.map(
          (item) => item.product_id
        ) ?? []
      ),
    ];

    if (productIds.length > 0) {
      const { data } = await supabase
        .from("products")
        .select(`
          id,
          product_name,
          price,
          default_image,
          meta_description,
          title_tag
        `)
        .in("id", productIds)
        .eq("is_active", true);

      products = data ?? [];
    }
  }

  const vehicleName = [
    yearRow.year,
    manufacturer.manufacturer_name,
    selectedModel.model_name,
    selectedEngine.engine_name,
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
            <li>/</li>
            <li>
              {
                manufacturer.manufacturer_name
              }
            </li>
            <li>/</li>
            <li>{selectedModel.model_name}</li>
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
            Browse replacement parts and
            automotive components matched to your{" "}
            {vehicleName}. Compatibility is
            based on your selected vehicle
            configuration.
          </p>
        </header>

        <section
          aria-labelledby="products-heading"
          className="mt-10"
        >
          <h2
            id="products-heading"
            className="sr-only"
          >
            Compatible products
          </h2>

          {products.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center">
              <h2 className="text-xl font-semibold text-ink">
                No compatible products found
              </h2>

              <p className="mt-2 text-muted-foreground">
                This vehicle is in our
                database, but compatible
                products have not been mapped
                yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-square bg-secondary">
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="text-sm font-medium text-muted-foreground">
                            Product Image
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground/60">
                            Coming soon
                            </div>
                        </div>
                        </div>
                  </div>

                  <div className="p-5">
                    <h2 className="font-semibold text-ink">
                      {product.product_name}
                    </h2>

                    {product.price != null && (
                      <p className="mt-2 text-lg font-bold text-brand">
                        $
                        {Number(
                          product.price
                        ).toFixed(2)}
                      </p>
                    )}

                    <button className="mt-5 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark">
                      View Product
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}