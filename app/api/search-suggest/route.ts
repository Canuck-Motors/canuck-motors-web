import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { findProductIds } from "@/lib/part-search";
import { boxFirst, imageUrl, isVideo } from "@/lib/product-images";
import { typeRank } from "@/lib/product-order";
import { withMaterial } from "@/lib/material";

// Instant search suggestions for the header search box (same matching as the full search page).
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const supabase = createPublicClient();
  const ids = [...(await findProductIds(supabase, q))].slice(0, 80);
  if (!ids.length) return NextResponse.json({ suggestions: [] });

  const { data } = await supabase
    .from("products")
    .select("id, product_name, sku, slug, price, product_images ( path, sort_order )")
    .in("id", ids)
    .eq("is_active", true)
    .eq("is_delete", false);

  const lower = q.toLowerCase();
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const rows = (data ?? [])
    .map((p: any) => {
      const sku = String(p.sku ?? "");
      const score = norm(sku).startsWith(norm(q)) ? 0 : String(p.product_name).toLowerCase().includes(lower) ? 1 : 2;
      return { p, score };
    })
    .sort((a, b) => a.score - b.score || typeRank(a.p.product_name) - typeRank(b.p.product_name) || String(a.p.sku).localeCompare(String(b.p.sku)))
    .slice(0, 6)
    .map(({ p }: any) => {
      const photo = boxFirst(
        ((p.product_images ?? []) as { path: string; sort_order: number }[]).filter((i) => !isVideo(i.path)).sort((a, b) => a.sort_order - b.sort_order),
      )[0];
      return {
        id: p.id,
        name: withMaterial(p.product_name, p.sku),
        sku: p.sku,
        price: p.price,
        href: `/product/${p.slug || p.id}`,
        image: photo ? imageUrl(photo.path) : null,
      };
    });

  return NextResponse.json({ suggestions: rows, total: ids.length });
}
