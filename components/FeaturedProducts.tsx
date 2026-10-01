import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function FeaturedProducts() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      product_name,
      price,
      sku,
      product_category_id
    `)
    .eq("is_active", true)
    .eq("is_delete", false)
    .limit(8);

  if (error) {
    console.error("Error loading products:", error.message);
  }

  return (
    <section className="bg-secondary py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              Popular
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink md:text-4xl">
              Featured Products
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-medium text-ink/70 transition hover:text-brand sm:block"
          >
            View all →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products?.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Image area */}
              <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-white">
                <span className="text-sm text-muted-foreground transition duration-500 group-hover:scale-110">
                  Product Image
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand">
                  In stock
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  SKU: {product.sku}
                </p>

                <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-ink">
                  {product.product_name}
                </h3>

                <div className="mt-auto flex items-center justify-between pt-5">
                  <p className="text-xl font-bold text-ink">
                    ${Number(product.price).toFixed(2)}
                  </p>
                  <span className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition group-hover:bg-brand">
                    View
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}