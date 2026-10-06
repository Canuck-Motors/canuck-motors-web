import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { addToCart } from "@/app/cart/actions";

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
    title: product.title_tag?.trim() || product.product_name,
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

  const [categoryName, compatibilityCount] = await Promise.all([
    getCategoryName(product.product_category_id),
    getCompatibilityCount(product.id),
  ]);

  const canonicalSlug = product.slug ?? String(product.id);
  const productUrl = `/product/${canonicalSlug}`;
  const description =
    product.description?.trim() ||
    product.meta_description?.trim() ||
    "Product details from Canuck Motors.";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.product_name,
    description,
    sku: product.sku || undefined,
    brand: {
      "@type": "Brand",
      name: "Canuck Motors",
    },
    category: categoryName || undefined,
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
        name: product.product_name,
        item: productUrl,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <div className="cm-container py-10 md:py-14">
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
              {product.product_name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section
            aria-label={`${product.product_name} image`}
            className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[30px] border border-black/5 bg-white p-8 shadow-[0_18px_55px_rgba(0,0,0,0.07)] before:absolute before:-right-24 before:-top-24 before:h-72 before:w-72 before:rounded-full before:bg-brand/10 before:blur-3xl"
          >
            <div className="text-center">
              <p className="text-base font-semibold text-ink">Product Image</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Images will be connected from the Tooling assets later.
              </p>
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              {categoryName || "Automotive Part"}
            </p>

            <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-0.04em] text-ink md:text-6xl">
              {product.product_name}
            </h1>

            {product.sku && (
              <p className="mt-4 text-sm text-muted-foreground">
                Part number: <span className="font-medium text-ink">{product.sku}</span>
              </p>
            )}

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

            <div className="mt-8 rounded-[24px] border border-brand/15 bg-brand-tint/55 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">
                Vehicle compatibility
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {compatibilityCount === null
                  ? "Use the vehicle finder to confirm compatibility for your vehicle."
                  : compatibilityCount > 0
                    ? `Mapped to ${compatibilityCount.toLocaleString()} vehicle configuration${compatibilityCount === 1 ? "" : "s"} in our catalog. Use the vehicle finder to confirm your exact year, make, model, engine, and trim.`
                    : "Compatibility mappings are not currently available for this product."}
              </p>
              <Link
                href="/#vehicle-finder"
                className="mt-4 inline-flex text-sm font-semibold text-brand hover:underline"
              >
                Check vehicle fitment
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <form action={addToCart.bind(null, product.id)}>
                <button
                  type="submit"
                  className="cm-button-primary"
                >
                  Add to Cart
                </button>
              </form>

              {product.amazon_url && (
                <a
                  href={product.amazon_url}
                  rel="nofollow sponsored noopener noreferrer"
                  target="_blank"
                  className="rounded-full border border-input bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                >
                  View purchase option
                </a>
              )}
            </div>
          </section>
        </div>

        <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_320px]">
          <article className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-9">
            <h2 className="text-2xl font-bold text-ink">Product details</h2>
            <div className="mt-5 whitespace-pre-line leading-7 text-muted-foreground">
              {description}
            </div>
          </article>

          <aside className="rounded-[28px] border border-black/5 bg-ink p-7 text-white shadow-[0_16px_46px_rgba(0,0,0,0.10)]">
            <h2 className="text-lg font-bold text-white">Product information</h2>
            <dl className="mt-5 space-y-4 text-sm">
              {product.sku && (
                <div>
                  <dt className="text-white/45">Part number</dt>
                  <dd className="mt-1 font-semibold text-white">{product.sku}</dd>
                </div>
              )}
              {categoryName && (
                <div>
                  <dt className="text-white/45">Category</dt>
                  <dd className="mt-1 font-semibold text-white">{categoryName}</dd>
                </div>
              )}
              {product.position && (
                <div>
                  <dt className="text-white/45">Position</dt>
                  <dd className="mt-1 font-semibold text-white">{product.position}</dd>
                </div>
              )}
              {product.product_super_type && (
                <div>
                  <dt className="text-white/45">Product type</dt>
                  <dd className="mt-1 font-semibold capitalize text-white">
                    {product.product_super_type}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
