import { createPublicClient } from "@/lib/supabase/public";
import { normNumber, type RefMap, type SpecMap } from "@/lib/part-finder";

// Specifications of the candidate parts (product_specifications)
export async function getSpecs(ids: number[]): Promise<SpecMap> {
  const map: SpecMap = new Map();
  if (!ids.length) return map;
  const { data, error } = await createPublicClient()
    .from("product_specifications")
    .select("product_id, spec_name, spec_value")
    .in("product_id", ids);
  if (error) {
    // Table missing or blocked: Axel still narrows by fitment rows and comments
    console.error("Spec lookup failed:", error.message);
    return map;
  }
  for (const r of data ?? []) {
    if (!map.has(r.product_id)) map.set(r.product_id, new Map());
    map.get(r.product_id)!.set(r.spec_name, r.spec_value);
  }
  return map;
}

// OE and interchange numbers of the candidate parts, so a number read off the
// customer's old part can settle which candidate it is
export async function getRefs(ids: number[]): Promise<RefMap> {
  const map: RefMap = new Map();
  if (!ids.length) return map;
  const supabase = createPublicClient();
  const [{ data: oe, error: e1 }, { data: ic, error: e2 }] = await Promise.all([
    supabase.from("product_oe_numbers").select("product_id, oe_brand, oe_number").in("product_id", ids),
    supabase.from("product_interchanges").select("product_id, interchange_brand, interchange_number").in("product_id", ids),
  ]);
  if (e1) console.error("OE lookup failed:", e1.message);
  if (e2) console.error("Interchange lookup failed:", e2.message);
  const add = (id: number, label: string, number: string) => {
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push({ label: label.replace(/\s+/g, " ").trim(), norm: normNumber(number) });
  };
  for (const r of (oe ?? []) as any[]) {
    add(r.product_id, `OE number ${r.oe_brand ?? ""} ${r.oe_number}`, String(r.oe_number ?? ""));
    // Some rows were imported split ("Ford 7T4Z 8501" + "D"): also match the joined number
    const head = splitOeHead(String(r.oe_brand ?? ""));
    if (head) add(r.product_id, `OE number ${r.oe_brand ?? ""} ${r.oe_number}`, head + String(r.oe_number ?? ""));
  }
  for (const r of (ic ?? []) as any[]) add(r.product_id, `interchange number ${r.interchange_brand ?? ""} ${r.interchange_number}`, String(r.interchange_number ?? ""));
  return map;
}

// "Ford 7T4Z 8501" -> "7T4Z 8501" (the part of an OE brand that is really the number)
export function splitOeHead(brand: string): string {
  const words = brand.trim().split(/\s+/);
  const i = words.findIndex((w) => /\d/.test(w));
  return i > 0 ? words.slice(i).join(" ") : "";
}
