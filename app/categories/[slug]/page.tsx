import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { CategoryProducts } from "@/components/CategoryProducts";
import { CategoryHero } from "@/components/CategoryHero";
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
    .limit(1000); // every part in the category (was 48, which hid most brake pad kits)

  const list = products ?? [];
  const { data: pos } = list.length
    ? await supabase
        .from("product_specifications")
        .select("product_id, spec_value")
        .eq("spec_name", "Position")
        .in("product_id", list.map((p) => p.id))
    : { data: [] as { product_id: number; spec_value: string | null }[] };
  const posById = new Map((pos ?? []).map((r) => [r.product_id, r.spec_value]));
  const withPos = list.map((p) => ({ ...p, position: posById.get(p.id) ?? null }));

  return { category, products: withPos };
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
        <CategoryHero
          slug={result.category.slug ?? slug}
          name={result.category.category_name}
          count={result.products.length}
        />

        <section className="cm-container py-12 md:py-16">
          {result.products.length === 0 ? (
            <div className="cm-card p-10 text-center">
              <p className="text-muted-foreground">
                No active products are currently listed in this category.
              </p>
            </div>
          ) : (
            <CategoryProducts
              products={result.products}
              showPosition={result.category.slug === "disc-brake-pad-set"}
            />
          )}
        </section>
      </main>
    </>
  );
}
