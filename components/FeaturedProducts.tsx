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
    <section className="bg-gray-50 py-14">
      <div className="mx-auto max-w-7xl px-6">

        <h2 className="text-3xl font-bold">
          Featured Products
        </h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

          {products?.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex h-40 items-center justify-center rounded-lg bg-gray-100">
                <span className="text-gray-400">
                  Product Image
                </span>
              </div>

              <p className="text-sm text-gray-500">
                SKU: {product.sku}
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                {product.product_name}
              </h3>

              <p className="mt-3 text-xl font-bold">
                ${product.price}
              </p>

              <button className="mt-5 w-full rounded-md bg-black px-4 py-2 text-white">
                View Product
              </button>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}