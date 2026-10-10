import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type Spec = { name: string; value: string };
export type PartNumber = { brand: string; number: string };
export type FitmentRow = {
  year: number;
  make: string;
  model: string;
  engine: string;
  fuel: string;
  trim: string;
  bodyType: string;
  comment: string;
};

const FUELS = ["ALL", "GAS", "ELECTRIC", "DIESEL", "HYBRID"];

// "4.2L | V6 | GAS" -> engine "4.2L V6", fuel "GAS"
// "5.7L V8" -> "V8 5.7L" (same order as the old website)
const oldStyle = (e: string) => e.replace(/^(\d+(?:\.\d+)?L)\s+(\S+)$/i, "$2 $1");

function splitEngine(name: string) {
  const parts = name.split("|").map((s) => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1]?.toUpperCase();
  if (parts.length > 1 && FUELS.includes(last)) {
    return { engine: oldStyle(parts.slice(0, -1).join(" ")), fuel: last };
  }
  return { engine: oldStyle(parts.join(" ")), fuel: "" };
}

export async function getSpecs(productId: number): Promise<Spec[]> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 1800, expire: 86400 });
  cacheTag(`product-specs:${productId}`);

  const { data, error } = await createPublicClient()
    .from("product_specifications")
    .select("spec_name, spec_value, sort_order")
    .eq("product_id", productId)
    .order("sort_order");

  if (error) {
    console.error("Specs lookup failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({ name: r.spec_name, value: r.spec_value }));
}

export async function getOeNumbers(productId: number): Promise<PartNumber[]> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 1800, expire: 86400 });
  cacheTag(`product-oe:${productId}`);

  const { data, error } = await createPublicClient()
    .from("product_oe_numbers")
    .select("oe_brand, oe_number")
    .eq("product_id", productId)
    .order("oe_brand")
    .limit(1000);

  if (error) {
    console.error("OE numbers lookup failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({ brand: r.oe_brand ?? "", number: r.oe_number ?? "" }));
}

export async function getInterchanges(productId: number): Promise<PartNumber[]> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 1800, expire: 86400 });
  cacheTag(`product-interchange:${productId}`);

  const { data, error } = await createPublicClient()
    .from("product_interchanges")
    .select("interchange_brand, interchange_number")
    .eq("product_id", productId)
    .order("interchange_brand")
    .limit(1000);

  if (error) {
    console.error("Interchange lookup failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    brand: r.interchange_brand ?? "",
    number: r.interchange_number ?? "",
  }));
}

export async function getFitments(productId: number): Promise<FitmentRow[]> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 1800, expire: 86400 });
  cacheTag(`product-fitments:${productId}`);

  const supabase = createPublicClient();
  const rows: FitmentRow[] = [];
  const size = 1000;

  for (let from = 0; from < 20000; from += size) {
    const columns = (withComment: boolean) =>
      `id, ${withComment ? "comment, body_type, " : ""}vehicle_fitments (
          year ( year ),
          manufacturer ( manufacturer_name ),
          models ( model_name ),
          engine_sizes ( engine_name ),
          trim ( trim_name )
        )`;

    const query = (withComment: boolean) =>
      supabase
        .from("product_fitments")
        .select(columns(withComment))
        .eq("product_id", productId)
        .order("id")
        .range(from, from + size - 1);

    let { data, error } = await query(true);
    // "comment" column not created yet: show the table without it
    if (error) ({ data, error } = await query(false));

    if (error) {
      console.error("Fitment lookup failed:", error.message);
      break;
    }

    for (const r of (data ?? []) as any[]) {
      const v = r.vehicle_fitments;
      if (!v) continue;
      const { engine, fuel } = splitEngine(v.engine_sizes?.engine_name ?? "");
      rows.push({
        year: Number(v.year?.year ?? 0),
        make: v.manufacturer?.manufacturer_name ?? "",
        model: v.models?.model_name ?? "",
        engine,
        fuel,
        trim: v.trim?.trim_name ?? "",
        bodyType: r.body_type ?? "",
        comment: r.comment ?? "",
      });
    }

    if (!data || data.length < size) break;
  }

  return rows.sort(
    (a, b) =>
      a.make.localeCompare(b.make) ||
      a.model.localeCompare(b.model) ||
      a.year - b.year ||
      a.engine.localeCompare(b.engine),
  );
}
