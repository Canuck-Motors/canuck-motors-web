import { createClient } from "@/lib/supabase/server";

const clean = (s: string) => s.replace(/[%,()]/g, " ").trim().slice(0, 60);

// Ignore case, spaces, and hyphens when comparing names ("F-150" = "f150")
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function searchParts(query: string, limit = 8) {
  const q = clean(query);
  if (q.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, product_name, price, sku, product_category_id")
    .eq("is_active", true)
    .eq("is_delete", false)
    .or(`product_name.ilike.%${q}%,sku.ilike.%${q}%`)
    .limit(limit);

  if (error) {
    console.error("searchParts error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getPart(id: string | number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, product_name, price, sku, product_category_id")
    .eq("id", id)
    .eq("is_active", true)
    .eq("is_delete", false)
    .single();

  if (error) {
    console.error("getPart error:", error.message);
    return null;
  }
  return data;
}

export async function listCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, category_name")
    .eq("is_active", true)
    .eq("is_delete", false)
    .order("category_name");

  if (error) {
    console.error("listCategories error:", error.message);
    return [];
  }
  return data ?? [];
}

async function checkFitmentInner(params: {
  year: number;
  make: string;
  model: string;
  part?: string;
}) {
  const supabase = await createClient();

  // 1. Year
  const { data: years } = await supabase
    .from("year")
    .select("id")
    .eq("year", params.year)
    .limit(1);
  if (!years?.length) return { found: false, reason: "Year not in our database" };

  // 2. Make
  const { data: allMakes } = await supabase
    .from("manufacturer")
    .select("id, manufacturer_name");
  const wantedMake = norm(params.make);
  const make = (allMakes ?? []).find(
    (m) => norm(m.manufacturer_name) === wantedMake
  );
  if (!make) return { found: false, reason: "Make not found" };

  // 3. Model
  const { data: allModels } = await supabase
    .from("models")
    .select("id, model_name")
    .eq("manufacturer_id", make.id);
  const wantedModel = norm(params.model);
  const models = (allModels ?? [])
    .filter(
      (m) => wantedModel.length >= 2 && norm(m.model_name).startsWith(wantedModel)
    )
    .sort((a, b) => norm(a.model_name).length - norm(b.model_name).length);
  if (!models.length) return { found: false, reason: "Model not found" };

  // 4. Matching vehicles
  const { data: vehicles } = await supabase
    .from("vehicle_fitments")
    .select("id")
    .eq("year_id", years[0].id)
    .eq("manufacturer_id", make.id)
    .in("model_id", models.map((m) => m.id))
    .limit(500);
  if (!vehicles?.length)
    return {
      found: false,
      reason: "No vehicle match for that year, make, and model",
    };

  // 5. Products linked to those vehicles
console.log("FITMENT DEBUG");
console.log("Vehicle IDs:", vehicles.map((v) => v.id));

const { data: links, error: linksError } = await supabase
  .from("product_fitments")
  .select("id, product_id, vehicle_fitment_id")
  .in("vehicle_fitment_id", vehicles.map((v) => v.id));

console.log("Product fitment links:", links);
console.log("Product fitment error:", linksError);

const productIds = [...new Set((links ?? []).map((l) => l.product_id))];

console.log("Product IDs:", productIds);

  // 6. Product details, filtered by part name (ignoring spaces and plurals)
  const { data: products, error } = await supabase
    .from("products")
    .select("id, product_name, price, sku")
    .in("id", productIds)
    .eq("is_active", true)
    .eq("is_delete", false);
  if (error) {
    console.error("checkFitment error:", error.message);
    return { found: false, reason: "Lookup failed" };
  }

  const tokens = (params.part ?? "")
    .split(/\s+/)
    .map((w) => norm(w).replace(/s$/, ""))
    .filter((w) => w.length > 1);

  const parts = (products ?? [])
    .filter((p) => tokens.every((t) => norm(p.product_name).includes(t)))
    .slice(0, 8);

  if (!parts.length)
    return {
      found: false,
      reason: "No matching products are linked to this vehicle in our catalog",
    };

  return {
    found: true,
    vehicle: `${params.year} ${make.manufacturer_name} ${models[0].model_name}`,
    parts,
  };
}

export async function checkFitment(params: {
  year: number;
  make: string;
  model: string;
  part?: string;
}) {
  const result = await checkFitmentInner(params);
  console.log(
    "checkFitment:",
    JSON.stringify(params),
    "->",
    JSON.stringify(result).slice(0, 300)
  );
  return result;
}