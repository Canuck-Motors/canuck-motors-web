import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { isAmazonRedirectOn } from "@/lib/fulfillment-mode";
import { boxFirst, imageUrl, isVideo } from "@/lib/product-images";
import { withMaterial } from "@/lib/material";

const KEY_SPECS = ["Position", "Pad Material", "Water Pump Drive Type", "Pulley Included", "Impeller Material", "Housing Material", "Housing Included", "Includes Back Housing", "Seal In Box", "Contents", "Brake Type"];

// Light product details for the "Quick view" window on product cards.
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const pub = createPublicClient();
  const { data: p } = await pub
    .from("products")
    .select("id, product_name, sku, price, slug, position, amazon_url, product_images ( path, sort_order )")
    .eq("id", id)
    .eq("is_active", true)
    .eq("is_delete", false)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: specRows } = await pub
    .from("product_specifications")
    .select("spec_name, spec_value, sort_order")
    .eq("product_id", id)
    .order("sort_order")
    .limit(60);
  const all = (specRows ?? []).map((r: any) => ({ name: String(r.spec_name), value: String(r.spec_value) }));
  const key = all.filter((s) => KEY_SPECS.some((k) => k.toLowerCase() === s.name.toLowerCase()));
  const specs = (key.length ? key : all).slice(0, 6);
  if (p.position && !specs.some((s) => s.name.toLowerCase() === "position")) specs.unshift({ name: "Position", value: String(p.position) });

  const images = boxFirst(
    ((p.product_images ?? []) as { path: string; sort_order: number }[])
      .filter((i) => !isVideo(i.path))
      .sort((a, b) => a.sort_order - b.sort_order),
  )
    .slice(0, 5)
    .map((i) => imageUrl(i.path));

  const redirect = await isAmazonRedirectOn();
  let available = 0;
  if (!redirect) {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("inventory(quantity, reserved_quantity, is_active)").eq("id", id).maybeSingle();
    const inv = Array.isArray(data?.inventory) ? data?.inventory[0] : data?.inventory;
    available = inv?.is_active ? Math.max(0, Number(inv.quantity ?? 0) - Number(inv.reserved_quantity ?? 0)) : 0;
  }

  return NextResponse.json({
    id: p.id,
    name: withMaterial(p.product_name, p.sku),
    sku: p.sku,
    price: p.price,
    href: `/product/${p.slug || p.id}`,
    images,
    specs,
    available,
    amazonRedirect: redirect,
    amazonUrl: p.amazon_url,
  });
}
