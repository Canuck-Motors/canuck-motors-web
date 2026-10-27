"use server";

import { createClient } from "@/lib/supabase/server";
import { boxFirst, imageUrl, isVideo } from "@/lib/product-images";
import { withMaterial } from "@/lib/material";

export type MiniCartLine = {
  id: number;
  productId: number;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  image: string | null;
  href: string;
  available: number;
};
export type MiniCart = { signedIn: boolean; lines: MiniCartLine[]; subtotal: number };

// Light read of the signed-in customer's active cart for the slide-in mini cart.
export async function getMiniCart(): Promise<MiniCart> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const empty: MiniCart = { signedIn: Boolean(auth.user), lines: [], subtotal: 0 };
  if (!auth.user) return empty;

  const { data: profile } = await supabase.from("users").select("id").eq("auth_user_id", auth.user.id).maybeSingle();
  if (!profile) return empty;
  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", profile.id).eq("status", "active").maybeSingle();
  if (!cart) return empty;
  const { data: items } = await supabase.from("cart_items").select("id, product_id, quantity").eq("cart_id", cart.id).order("created_on");
  if (!items?.length) return empty;

  const ids = [...new Set(items.map((i) => i.product_id))];
  const [{ data: products }, { data: stock }] = await Promise.all([
    supabase
      .from("products")
      .select("id, product_name, sku, slug, price, product_images ( path, sort_order )")
      .in("id", ids)
      .eq("is_active", true)
      .eq("is_delete", false),
    supabase.from("inventory").select("product_id, quantity, reserved_quantity, is_active").in("product_id", ids),
  ]);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const avail = new Map(
    (stock ?? []).map((r) => [r.product_id as number, r.is_active ? Math.max(0, Number(r.quantity ?? 0) - Number(r.reserved_quantity ?? 0)) : 0]),
  );

  const lines: MiniCartLine[] = [];
  for (const it of items) {
    const p = byId.get(it.product_id);
    if (!p || p.price === null) continue;
    const photo = boxFirst(
      ((p.product_images ?? []) as { path: string; sort_order: number }[]).filter((i) => !isVideo(i.path)).sort((a, b) => a.sort_order - b.sort_order),
    )[0];
    lines.push({
      id: it.id,
      productId: p.id,
      name: withMaterial(p.product_name, p.sku),
      sku: p.sku,
      price: Number(p.price),
      quantity: it.quantity,
      image: photo ? imageUrl(photo.path) : null,
      href: `/product/${p.slug || p.id}`,
      available: avail.get(p.id) ?? 0,
    });
  }
  return { ...empty, lines, subtotal: lines.reduce((t, l) => t + l.price * l.quantity, 0) };
}
