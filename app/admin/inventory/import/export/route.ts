import { createClient } from "@/lib/supabase/server";

const esc = (v: unknown) => {
  const s = String(v ?? "").replace(/\r?\n/g, " ");
  return /[",]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export async function GET() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) return new Response("Not authorized", { status: 403 });

  const { data: cats } = await supabase.from("product_categories").select("id, category_name");
  const catName = new Map((cats ?? []).map((c) => [c.id, c.category_name]));

  const lines = ["SKU,Name,Price,Description,Category,Quantity,Low stock"];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase
      .from("products")
      .select("sku, product_name, price, description, product_category_id, inventory(quantity, low_stock_threshold)")
      .eq("is_delete", false)
      .order("sku")
      .range(from, from + 999);
    for (const p of data ?? []) {
      const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
      lines.push(
        [
          p.sku,
          p.product_name,
          p.price,
          p.description,
          catName.get(p.product_category_id) ?? "",
          inv?.quantity ?? 0,
          inv?.low_stock_threshold ?? 5,
        ]
          .map(esc)
          .join(",")
      );
    }
    if (!data || data.length < 1000) break;
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
