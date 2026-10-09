import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { ProductCard } from "@/components/ProductCard";
import { createPublicClient } from "@/lib/supabase/public";

type PageProps = { params: Promise<{ slug: string }> };

async function getCategory(slug: string) {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 1800, expire: 86400 });
  cacheTag(`category-${slug}`);

  const supabase = createPublicClient();
  const { data: category } = await supabase
    .from("product_categories")
    .select("id, category_name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("is_delete", false)
    .maybeSingle();

  if (!category) return null;

  const { data: products } = await supabase
    .from("products")
    .select("id, product_name, price, slug, sku, title_tag, product_images ( path, sort_order )")
    .eq("product_category_id", category.id)
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("product_name")
    .limit(48);

  return { category, products: products ?? [] };
}

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("product_categories")
    .select("slug")
    .eq("is_active", true)
    .eq("is_delete", false)
    .not("slug", "is", null);

  return (data ?? []).map((row) => ({ slug: row.slug! }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategory(slug);
  if (!result) return { title: "Category Not Found" };

  return {
    title: `${result.category.category_name} Auto Parts`,
    description: `Browse ${result.category.category_name} automotive parts from Canuck Motors.`,
    alternates: { canonical: `/categories/${result.category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getCategory(slug);
  if (!result) notFound();

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
        <section className="bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <Link href="/categories" className="text-sm font-bold text-brand hover:underline">
              All categories
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-6xl">
              {result.category.category_name}
            </h1>
            <p className="mt-5 max-w-2xl text-white/65">
              Browse available parts, then confirm compatibility with your vehicle before ordering.
            </p>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          {result.products.length === 0 ? (
            <div className="cm-card p-10 text-center">
              <p className="text-muted-foreground">
                No active products are currently listed in this category.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {result.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
