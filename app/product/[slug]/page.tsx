import type { Metadata } from "next";
import { Suspense } from "react";
import { withMaterial } from "@/lib/material";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import ProductTabs from "@/components/ProductTabs";
import AddToCartSlot from "@/components/AddToCartSlot";
import FitCheck from "@/components/product/FitCheck";
import StickyBuyBar from "@/components/product/StickyBuyBar";
import ProductReviews from "@/components/ProductReviews";
import StarRating from "@/components/StarRating";
import { ratingForSku } from "@/lib/amazon-reviews";
import ProductGallery from "@/components/ProductGallery";
import { getProductImages } from "@/lib/product-images";
import { getFitments, getInterchanges, getOeNumbers, getSpecs } from "@/lib/product-details";
import { isPlainPhoto } from "@/lib/plain-photos";
import { safeJsonLd } from "@/lib/json-ld";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type Product = {
  id: number;
  product_name: string;
  product_category_id: number | null;
  sku: string | null;
  description: string | null;
  price: number | null;
  amazon_url: string | null;
  meta_description: string | null;
  title_tag: string | null;
  position: string | null;
  product_super_type: string | null;
  slug: string | null;
};

async function getProduct(slug: string): Promise<Product | null> {
  "use cache";

  cacheLife({
    stale: 3600,
    revalidate: 1800,
    expire: 86400,
  });

  cacheTag(`product:${slug.toLowerCase()}`);

  const supabase = createPublicClient();
  const numericId = Number(slug);

  let query = supabase
    .from("products")
    .select(
      "id, product_name, product_category_id, sku, description, price, amazon_url, meta_description, title_tag, position, product_super_type, slug"
    )
    .eq("is_active", true)
    .eq("is_delete", false);

  query = Number.isInteger(numericId) && numericId > 0
    ? query.eq("id", numericId)
    : query.eq("slug", slug);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Product detail lookup failed:", error.message);
    return null;
  }

  return data ?? null;
}

async function getCategoryName(categoryId: number | null) {
  "use cache";

  if (!categoryId) return null;

  cacheLife({
    stale: 86400,
    revalidate: 43200,
    expire: 604800,
  });

  cacheTag(`product-category:${categoryId}`);

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("product_categories")
    .select("category_name")
    .eq("id", categoryId)
    .eq("is_active", true)
    .eq("is_delete", false)
    .maybeSingle();

  if (error) {
    console.error("Product category lookup failed:", error.message);
    return null;
  }

  return data?.category_name ?? null;
}

async function getCompatibilityCount(productId: number) {
  "use cache";

  cacheLife({
    stale: 3600,
    revalidate: 1800,
    expire: 86400,
  });

  cacheTag(`product-fitments:${productId}`);

  const supabase = createPublicClient();

  const { count, error } = await supabase
    .from("product_fitments")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (error) {
    console.error("Compatibility count lookup failed:", error.message);
    return null;
  }

  return count ?? 0;
}

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalSlug = product.slug ?? String(product.id);
  const canonicalPath = `/product/${canonicalSlug}`;
  const description =
    product.meta_description?.trim() ||
    product.description?.trim().slice(0, 155) ||
    `View ${product.product_name} from Canuck Motors, including product details and vehicle compatibility information.`;

  return {
    // Title tags already end in "| Canuck Motors": don't let the layout add it twice
    title: /canuck motors/i.test(product.title_tag ?? "")
      ? { absolute: product.title_tag!.trim() }
      : product.title_tag?.trim() || product.product_name,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: product.title_tag?.trim() || product.product_name,
      description,
      type: "website",
      url: canonicalPath,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const [categoryName, compatibilityCount, specs, fitments, oe, interchanges, images] =
    await Promise.all([
      getCategoryName(product.product_category_id),
      getCompatibilityCount(product.id),
      getSpecs(product.id),
      getFitments(product.id),
      getOeNumbers(product.id),
      getInterchanges(product.id),
      getProductImages(product.id),
    ]);

  const canonicalSlug = product.slug ?? String(product.id);
  const productUrl = `/product/${canonicalSlug}`;
  const description =
    product.description?.trim() ||
    product.meta_description?.trim() ||
    "Product details from Canuck Motors.";

  const descriptionLines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const overviewText =
    descriptionLines.find(
      (line) =>
        !/^[A-Z][A-Z\s&/-]{2,}$/.test(line) &&
        !/^[•·*-]/.test(line)
    ) || descriptionLines[0] || description;

  const keyFeaturesIndex = descriptionLines.findIndex(
    (line) => line.toUpperCase() === "KEY FEATURES"
  );
  const descriptionHighlights =
    keyFeaturesIndex >= 0
      ? descriptionLines
          .slice(keyFeaturesIndex + 1)
          .filter((line) => !/^[A-Z][A-Z\s&/-]{2,}$/.test(line))
          .slice(0, 4)
          .map((line) => line.replace(/^[•·*\-]\s*/, ""))
      : specs.slice(0, 4).map((spec) => `${spec.name}: ${spec.value}`);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: withMaterial(product.product_name, product.sku),
    description,
    sku: product.sku || undefined,
    brand: {
      "@type": "Brand",
      name: "Canuck Motors",
    },
    category: categoryName || undefined,
    ...(images.some((i) => !i.video) ? { image: images.filter((i) => !i.video).map((i) => i.url) } : {}),
    ...(specs.length
      ? {
          additionalProperty: specs.map((x) => ({
            "@type": "PropertyValue",
            name: x.name,
            value: x.value,
          })),
        }
      : {}),
    url: productUrl,
    ...(product.price !== null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "CAD",
            price: Number(product.price).toFixed(2),
            url: productUrl,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: "/products",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: withMaterial(product.product_name, product.sku),
        item: productUrl,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(productJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbJsonLd),
        }}
      />

      <div className="mx-auto w-full max-w-[1640px] px-4 py-10 sm:px-6 md:py-14 lg:px-8 xl:px-10">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-brand">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="hover:text-brand">
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink" aria-current="page">
              {withMaterial(product.product_name, product.sku)}
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] xl:gap-12 2xl:grid-cols-[1.08fr_0.92fr]">
          <section
            aria-label={`${product.product_name} image`}
            className="relative flex min-h-[440px] items-center justify-center overflow-hidden rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.07)] sm:p-8 xl:min-h-[500px]" before:absolute before:-right-24 before:-top-24 before:h-72 before:w-72 before:rounded-full before:bg-brand/10 before:blur-3xl"
          >
            <ProductGallery images={images} name={withMaterial(product.product_name, product.sku)} plain={isPlainPhoto(product.sku)} />
          </section>

          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              {categoryName || "Automotive Part"}
            </p>

            <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-0.04em] text-ink md:text-6xl">
              {withMaterial(product.product_name, product.sku)}
            </h1>

            {product.sku && (
              <p className="mt-4 text-sm text-muted-foreground">
                Part number: <span className="font-medium text-ink">{product.sku}</span>
              </p>
            )}

            {(() => {
              const rating = ratingForSku(product.sku);
              return rating ? (
                <a href="#product-reviews-heading" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink/80 hover:text-brand">
                  <StarRating rating={rating.average} />
                  <span>
                    {rating.average.toFixed(1)} ({rating.count} {rating.count === 1 ? "review" : "reviews"})
                  </span>
                </a>
              ) : null;
            })()}

            {product.position && (
              <p className="mt-2 text-sm text-muted-foreground">
                Position: <span className="font-medium text-ink">{product.position}</span>
              </p>
            )}

            <div className="mt-8">
              {product.price !== null ? (
                <p className="text-4xl font-black tracking-[-0.03em] text-ink">
                  ${Number(product.price).toFixed(2)}
                </p>
              ) : (
                <p className="text-lg font-semibold text-ink">
                  Contact us for pricing
                </p>
              )}
            </div>

            <section className="mt-6 rounded-2xl border border-black/5 bg-secondary/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">
                  Product overview
                </p>
                <a
                  href="#description"
                  data-open-tab="description"
                  className="text-xs font-bold text-brand hover:underline"
                >
                  Full details
                </a>
              </div>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {overviewText}
              </p>

              {descriptionHighlights.length > 0 && (
                <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {descriptionHighlights.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ink">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <FitCheck
              count={compatibilityCount}
              rows={[...new Map(fitments.map((f) => [`${f.year}|${f.make}|${f.model}`, { year: f.year, make: f.make, model: f.model }])).values()]}
            />

            <div data-main-buy className="mt-6 flex flex-wrap gap-3">
              <Suspense
                fallback={
                  <span className="inline-flex rounded-full bg-secondary px-6 py-3 text-sm font-bold text-muted-foreground">
                    Checking stock...
                  </span>
                }
              >
                <AddToCartSlot productId={product.id} amazonUrl={product.amazon_url} />
              </Suspense>

            </div>
          </section>
        </div>

        <ProductTabs
          fancy={product.sku?.toLowerCase() === "cm1012h"}
          description={description}
          specs={specs}
          fitments={fitments}
          oe={oe}
          interchanges={interchanges}
        />

        <ProductReviews sku={product.sku} />

        <StickyBuyBar name={withMaterial(product.product_name, product.sku)} price={product.price} />
        <div className="h-20 md:hidden" aria-hidden="true" />
      </div>
    </main>
  );
}
