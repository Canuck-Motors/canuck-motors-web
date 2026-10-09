import { existsSync } from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { imageUrl } from "@/lib/product-images";
import { PRODUCT_TYPE_ORDER } from "@/lib/product-order";

export type CategoryMedia = {
  url: string;
  // "render" = transparent product render dropped in /public/categories
  // "photo"  = ordinary product photo (white background)
  kind: "render" | "photo";
};

function typeFor(name: string) {
  const n = name.toLowerCase();
  return PRODUCT_TYPE_ORDER.find(
    (t) => n.includes(t.match) && !(t.exclude && n.includes(t.exclude)),
  );
}

// 1) /public/categories/<key>.(png|webp) wins if it exists (clean renders, no logos)
// 2) otherwise the main photo of a real product of that type
export async function getCategoryMedia(
  names: string[],
): Promise<Record<string, CategoryMedia | null>> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 1800, expire: 86400 });
  cacheTag("category-media");

  const supabase = createPublicClient();
  const out: Record<string, CategoryMedia | null> = {};

  await Promise.all(
    names.map(async (name) => {
      const type = typeFor(name);
      out[name] = null;
      if (!type) return;

      for (const ext of ["png", "webp"]) {
        if (existsSync(path.join(process.cwd(), "public", "categories", `${type.key}.${ext}`))) {
          out[name] = { url: `/categories/${type.key}.${ext}`, kind: "render" };
          return;
        }
      }

      let q = supabase
        .from("products")
        .select("id, product_images!inner ( path, sort_order )")
        .eq("is_active", true)
        .eq("is_delete", false)
        .ilike("product_name", `%${type.match}%`)
        .order("sku")
        .limit(1);
      if (type.exclude) q = q.not("product_name", "ilike", `%${type.exclude}%`);

      const { data } = await q;
      const imgs = ((data?.[0] as any)?.product_images ?? []) as { path: string; sort_order: number }[];
      const main = [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0];
      if (main) out[name] = { url: imageUrl(main.path), kind: "photo" };
    }),
  );

  return out;
}
