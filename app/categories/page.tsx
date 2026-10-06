import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Auto Part Categories",
  description:
    "Browse Canuck Motors automotive parts by category and find the right replacement part for your vehicle.",
  alternates: { canonical: "/categories" },
};

async function getCategories() {
  "use cache";
  cacheLife({ stale: 7200, revalidate: 3600, expire: 86400 });
  cacheTag("product-categories");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, category_name, slug")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("category_name");

  if (error) throw new Error("Unable to load categories.");
  return data ?? [];
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <Header />
      <Navbar />
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
        <section className="bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <p className="cm-eyebrow">Browse smarter</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">
              Shop by category.
            </h1>
            <p className="mt-5 max-w-2xl text-white/65">
              Start with the system or component you need, then use vehicle fitment to
              confirm compatibility.
            </p>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative min-h-[210px] overflow-hidden rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_14px_38px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_22px_52px_rgba(0,0,0,0.10)]"
              >
                <span className="text-sm font-black tracking-[0.16em] text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/10 blur-3xl transition group-hover:bg-brand/20" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-[-0.03em] text-ink">
                      {category.category_name}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Browse parts in this category
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition group-hover:bg-brand">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
