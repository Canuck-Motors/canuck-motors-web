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
    <section className="py-14">
      <div className="mx-auto max-w-7xl px-6">

        <h2 className="text-3xl font-bold">
          Shop by Category
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">

          {categories?.map((category) => (
            <div
              key={category.id}
              className="rounded-xl border bg-white p-6 text-center shadow-sm"
            >
              <p className="font-semibold">
                {category.category_name}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}