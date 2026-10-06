import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function CategorySection() {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("product_categories")
    .select("id, category_name, slug")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("category_name");

  if (error) {
    console.error("Error loading categories:", error.message);
  }

  return (
    <section className="relative overflow-hidden bg-white py-20 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(249,115,22,0.07),transparent_22rem)]" />

      <div className="cm-container relative">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">Browse the catalog</p>
            <h2 className="cm-section-title mt-3">Shop by Category</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Explore our core automotive product categories and get to the right parts faster.
            </p>
          </div>

          <Link
            href="/categories"
            className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:border-brand/30 hover:text-brand sm:inline-flex"
          >
            View all
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories?.map((category, i) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-[26px] border border-black/5 bg-ink p-6 shadow-[0_14px_36px_rgba(0,0,0,0.10)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-[0_22px_52px_rgba(0,0,0,0.16)]"
            >
              <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl transition duration-300 group-hover:bg-brand/30" />

              <div className="relative flex items-center justify-between">
                <span className="text-sm font-black tracking-[0.16em] text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition duration-300 group-hover:rotate-6 group-hover:border-brand/30 group-hover:bg-brand">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              <div className="relative">
                <p className="max-w-[16rem] text-xl font-black tracking-[-0.025em] text-white">
                  {category.category_name}
                </p>
                <p className="mt-3 text-sm font-medium text-white/55 transition group-hover:text-white/75">
                  Browse compatible parts
                </p>
              </div>

              <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
