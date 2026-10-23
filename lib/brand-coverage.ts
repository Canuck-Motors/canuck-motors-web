import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Brands and models that have at least one visible product.
 * Returns null if the database function is not installed yet (callers then show everything).
 */
export async function getCoverage(): Promise<{
  brands: Set<number>;
  models: Set<number>;
} | null> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 300, expire: 3600 });
  cacheTag("brand-coverage");

  const supabase = createPublicClient();
  const brands = new Set<number>();
  const models = new Set<number>();

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .rpc("models_with_parts")
      .range(from, from + 999);
    if (error) return null;
    for (const r of (data ?? []) as { manufacturer_id: number; model_id: number }[]) {
      brands.add(Number(r.manufacturer_id));
      models.add(Number(r.model_id));
    }
    if (!data || data.length < 1000) break;
  }

  return { brands, models };
}
