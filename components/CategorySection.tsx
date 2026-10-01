import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function CategorySection() {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("product_categories")
    .select("id, category_name")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("category_name");

  if (error) {
    console.error("Error loading categories:", error.message);
  }

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              Browse
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink md:text-4xl">
              Shop by Category
            </h2>
          </div>
          <Link
            href="/categories"
            className="hidden text-sm font-medium text-ink/70 transition hover:text-brand sm:block"
          >
            View all →
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories?.map((category, i) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="group relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl"
            >
              {/* soft red glow on hover */}
              <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-tint opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />

              <span className="relative text-sm font-semibold text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="relative">
                <p className="text-lg font-semibold leading-snug text-ink">
                  {category.category_name}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink/60 transition group-hover:text-brand">
                  Shop now
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>

              {/* red line slides in at the bottom */}
              <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}