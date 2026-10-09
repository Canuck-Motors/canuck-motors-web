import { createPublicClient } from "@/lib/supabase/public";

/**
 * Shared catalog logic. Same rules as the website:
 *  - searchCatalog        -> /products/search/[query]  (name, SKU, OE, interchange)
 *  - findPartsForVehicle  -> /products/[year]/[make]/[model]/[engine]/[trim]
 * The chatbot can only show products returned by these functions.
 */

// Filler words that should not have to appear in a product name
const STOP_WORDS = new Set(["with", "and", "for", "the", "set", "of"]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Engine names look like "4.2L | V6 | GAS". The last part is the fuel type.
// The customer thinks of "4.2L V6" as ONE engine, so we group by that part.
const FUELS = new Set(["all", "gas", "electric", "diesel", "hybrid"]);

function engineParts(name: string) {
  return name
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

function engineFuel(name: string) {
  const parts = engineParts(name);
  const last = norm(parts[parts.length - 1] ?? "");
  return parts.length > 1 && FUELS.has(last) ? last : "";
}

function engineBase(name: string) {
  const parts = engineParts(name);
  if (parts.length > 1 && FUELS.has(norm(parts[parts.length - 1]))) {
    parts.pop();
  }
  return parts.join(" ");
}

const clean = (s: string) =>
  s.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export type CatalogProduct = {
  id: number;
  product_name: string;
  sku: string | null;
  price: number | null;
  position: string | null;
  url: string;
};

type Named = { id: number; name: string; slug: string };

const toProduct = (p: any): CatalogProduct => ({
  id: p.id,
  product_name: p.product_name,
  sku: p.sku ?? null,
  price: p.price ?? null,
  position: p.position ?? null,
  url: `/product/${p.slug || p.id}`,
});

const names = (items: Named[], limit = 40) =>
  items.slice(0, limit).map((i) => i.name);

// Finds the one item the customer meant, or returns candidates.
function pick(items: Named[], wanted: string): { item?: Named; options: Named[] } {
  const w = norm(wanted);
  if (!w) return { options: [] };

  const exact = items.filter((i) => norm(i.name) === w || norm(i.slug) === w);
  if (exact.length > 0) return { item: exact[0], options: [] };

  if (w.length >= 2) {
    const partial = items.filter((i) => norm(i.name).includes(w));
    if (partial.length === 1) return { item: partial[0], options: [] };
    if (partial.length > 1) return { options: partial };
  }
  return { options: [] };
}

function unresolved(level: string, matches: Named[], all: Named[]) {
  if (matches.length > 1) {
    return { status: "choose", level, options: names(matches) };
  }
  return {
    status: "not_found",
    level,
    message: `We couldn't find that ${level} in our catalog.`,
    options: names(all),
  };
}

// Lists the models / engines / trims that really exist in vehicle_fitments
async function fitmentOptions(
  supabase: any,
  relation: "models" | "engine_sizes" | "trim",
  nameColumn: string,
  filters: Record<string, number | number[]>,
): Promise<Named[]> {
  let query = supabase
    .from("vehicle_fitments")
    .select(`${relation} ( id, ${nameColumn}, slug )`);

  for (const [column, value] of Object.entries(filters)) {
    query = Array.isArray(value)
      ? query.in(column, value)
      : query.eq(column, value);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Fitment ${relation} lookup failed:`, error.message);
    return [];
  }

  const unique = new Map<number, Named>();
  for (const row of (data ?? []) as any[]) {
    const rel = row[relation];
    if (rel) {
      unique.set(rel.id, { id: rel.id, name: rel[nameColumn], slug: rel.slug });
    }
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

// ---------------------------------------------------------------
// 1. Search by name / part number / OE / interchange
// ---------------------------------------------------------------

export async function searchCatalog(
  query: string,
  limit = 8,
): Promise<CatalogProduct[]> {
  const term = clean(query);
  if (term.length < 2) return [];

  const supabase = createPublicClient();

  const [direct, interchange, oe] = await Promise.all([
    supabase
      .from("products")
      .select("id, product_name, price, sku, slug, position")
      .eq("is_active", true)
      .eq("is_delete", false)
      .or(`sku.ilike.%${term}%,product_name.ilike.%${term}%`)
      .limit(50),
    supabase
      .from("product_interchanges")
      .select("product_id")
      .ilike("interchange_number", `%${term}%`)
      .limit(100),
    supabase
      .from("product_oe_numbers")
      .select("product_id")
      .ilike("oe_number", `%${term}%`)
      .limit(100),
  ]);

  if (direct.error) {
    console.error("Catalog search failed:", direct.error.message);
  }

  const ids = new Set<number>();
  for (const p of direct.data ?? []) ids.add(p.id);
  for (const r of interchange.data ?? []) ids.add(r.product_id);
  for (const r of oe.data ?? []) ids.add(r.product_id);

  if (ids.size === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id, product_name, price, sku, slug, position")
    .in("id", Array.from(ids))
    .eq("is_active", true)
    .eq("is_delete", false)
    .limit(50);

  if (error) {
    console.error("Catalog search lookup failed:", error.message);
    return [];
  }

  const wanted = norm(term);
  return (data ?? [])
    .sort(
      (a: any, b: any) =>
        Number(norm(b.sku ?? "") === wanted) -
          Number(norm(a.sku ?? "") === wanted) ||
        a.product_name.localeCompare(b.product_name),
    )
    .slice(0, limit)
    .map(toProduct);
}

// ---------------------------------------------------------------
// 2. Parts that fit a vehicle (year > make > model > engine > trim)
// ---------------------------------------------------------------

export async function findPartsForVehicle(params: {
  year: number;
  make: string;
  model?: string;
  engine?: string;
  trim?: string;
  part?: string;
}) {
  const supabase = createPublicClient();

  // YEAR
  const { data: yearRow } = await supabase
    .from("year")
    .select("id, year")
    .eq("year", params.year)
    .maybeSingle();

  if (!yearRow) {
    return {
      status: "not_found",
      level: "year",
      message: `We have no ${params.year} vehicles in our catalog.`,
    };
  }

  // MAKE
  const { data: makeRows } = await supabase
    .from("manufacturer")
    .select("id, manufacturer_name, slug");

  const makes: Named[] = (makeRows ?? []).map((m: any) => ({
    id: m.id,
    name: m.manufacturer_name,
    slug: m.slug,
  }));

  const makePick = pick(makes, params.make);
  if (!makePick.item) return unresolved("make", makePick.options, makes);
  const make = makePick.item;

  // MODEL
  const models = await fitmentOptions(supabase, "models", "model_name", {
    year_id: yearRow.id,
    manufacturer_id: make.id,
  });

  if (models.length === 0) {
    return {
      status: "not_found",
      level: "model",
      message: `We have no ${yearRow.year} ${make.name} vehicles in our catalog.`,
    };
  }
  if (!params.model) {
    return { status: "choose", level: "model", options: names(models) };
  }

  const modelPick = pick(models, params.model);
  if (!modelPick.item) return unresolved("model", modelPick.options, models);
  const model = modelPick.item;

  // ENGINES for this vehicle
  const engines = await fitmentOptions(supabase, "engine_sizes", "engine_name", {
    year_id: yearRow.id,
    manufacturer_id: make.id,
    model_id: model.id,
  });

  if (engines.length === 0) {
    return {
      status: "not_found",
      level: "engine",
      message: `No engine data for the ${yearRow.year} ${make.name} ${model.name}.`,
    };
  }

  const partTokens = (params.part ?? "")
    .split(/\s+/)
    .map((w) => norm(w).replace(/s$/, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  // Products for the given engines (and trim), using the website's rules
  const fetchMatches = async (
    engineIds: number[],
    trimId?: number,
  ): Promise<any[] | null> => {
    let q = supabase
      .from("products")
      .select(
        `
        id,
        product_name,
        price,
        sku,
        slug,
        position,
        product_fitments!inner (
          vehicle_fitments!inner ( id )
        )
      `,
      )
      .eq("is_active", true)
      .eq("is_delete", false)
      .eq("product_fitments.vehicle_fitments.year_id", yearRow.id)
      .eq("product_fitments.vehicle_fitments.manufacturer_id", make.id)
      .eq("product_fitments.vehicle_fitments.model_id", model.id)
      .in("product_fitments.vehicle_fitments.engine_size_id", engineIds);

    if (trimId) {
      q = q.eq("product_fitments.vehicle_fitments.trim_id", trimId);
    }

    const { data, error } = await q.order("product_name");

    if (error) {
      console.error("Vehicle products lookup failed:", error.message);
      return null;
    }

    // Optional part filter (ignores spaces and plurals: "brake pads" = "Brake Pad")
    return (data ?? []).filter((p: any) =>
      partTokens.every((t) => norm(p.product_name).includes(t)),
    );
  };

  // Group the fuel variants of one engine ("4.2L | V6 | ALL / GAS / ELECTRIC").
  // Electric variants are left out unless the customer asks for electric.
  type EngineGroup = { name: string; key: string; engines: Named[] };

  const groupMap = new Map<string, EngineGroup>();
  for (const e of engines) {
    const base = engineBase(e.name);
    const key = norm(base);
    const group = groupMap.get(key) ?? { name: base, key, engines: [] };
    group.engines.push(e);
    groupMap.set(key, group);
  }
  const groups = Array.from(groupMap.values());

  const wantsElectric = norm(params.engine ?? "").includes("electric");
  const usable = (g: EngineGroup) =>
    g.engines.filter((e) => wantsElectric || engineFuel(e.name) !== "electric");
  const groupsAsNamed: Named[] = groups.map((g, i) => ({
    id: i,
    name: g.name,
    slug: g.key,
  }));

  // Decide which engine(s) to use. The customer is only asked when the
  // answer changes which parts fit.
  let engineLabel: string | null = null;
  let engineIds: number[];

  if (params.engine) {
    const wanted = norm(params.engine).replace(
      /(all|gas|electric|diesel|hybrid)$/,
      "",
    );

    let matched = groups.filter((g) => g.key === wanted);
    if (!matched.length && wanted.length >= 2) {
      matched = groups.filter((g) => g.key.includes(wanted));
    }

    if (matched.length === 0) {
      return unresolved("engine", [], groupsAsNamed);
    }
    if (matched.length > 1) {
      return {
        status: "choose",
        level: "engine",
        options: matched.map((g) => g.name),
      };
    }

    engineLabel = matched[0].name;
    engineIds = usable(matched[0]).map((e) => e.id);
  } else if (groups.length === 1) {
    engineIds = usable(groups[0]).map((e) => e.id);
  } else {
    const perGroup = await Promise.all(
      groups.map(async (g) => {
        const ids = usable(g).map((e) => e.id);
        return {
          group: g,
          ids,
          matches: ids.length ? ((await fetchMatches(ids)) ?? []) : [],
        };
      }),
    );

    const withParts = perGroup.filter((g) => g.matches.length > 0);

    if (withParts.length === 0) {
      engineIds = engines.map((e) => e.id);
    } else if (withParts.length === 1) {
      engineIds = withParts[0].ids;
    } else {
      const key = (m: any[]) =>
        m
          .map((p) => p.id)
          .sort((a, b) => a - b)
          .join(",");
      const first = key(withParts[0].matches);

      if (withParts.every((g) => key(g.matches) === first)) {
        // Every engine gets the same parts, so there is nothing to ask
        engineIds = withParts.flatMap((g) => g.ids);
      } else {
        return {
          status: "choose",
          level: "engine",
          options: withParts.map((g) => g.group.name),
        };
      }
    }
  }

  // TRIM (optional, same as the website)
  const trims = (
    await fitmentOptions(supabase, "trim", "trim_name", {
      year_id: yearRow.id,
      manufacturer_id: make.id,
      model_id: model.id,
      engine_size_id: engineIds,
    })
  ).filter((t) => t.name !== "Unknown");

  let trim: Named | null = null;
  // Some vehicles are not split by trim in the catalog (only "Unknown").
  // Then trim doesn't change the result, so we don't block on it.
  const trimNotTracked = trims.length === 0;
  if (params.trim && !trimNotTracked) {
    const trimPick = pick(trims, params.trim);
    if (!trimPick.item) return unresolved("trim", trimPick.options, trims);
    trim = trimPick.item;
  }

  const matches = await fetchMatches(engineIds, trim?.id);

  if (matches === null) {
    return { status: "error", message: "Lookup failed. Please try again." };
  }

  const vehicle = [yearRow.year, make.name, model.name, engineLabel, trim?.name]
    .filter(Boolean)
    .join(" ");

  return {
    status: matches.length > 0 ? "ok" : "no_products",
    vehicle,
    vehicle_page_url: null,
    total_matches: matches.length,
    products: matches.slice(0, 40).map(toProduct),
    positions: Array.from(
      new Set(matches.map((p: any) => p.position).filter(Boolean)),
    ),
    available_trims: trim ? [] : names(trims),
    ...(params.trim && trimNotTracked
      ? {
          trim_note:
            "Our catalog does not separate this vehicle by trim. These results apply to every trim of this vehicle.",
        }
      : {}),
  };
}


// ---------------------------------------------------------------
// 3. VIN decoding (US/Canada vehicles, free NHTSA vPIC service)
// ---------------------------------------------------------------

const VIN_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function checkVin(raw: string): {
  valid: boolean;
  formatOk: boolean;
  vin: string;
  reason?: string;
} {
  const vin = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return {
      valid: false,
      formatOk: false,
      vin,
      reason: "A VIN has exactly 17 letters and numbers, and never uses I, O or Q.",
    };
  }

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const value = /\d/.test(c) ? Number(c) : VIN_VALUES[c];
    sum += value * VIN_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);

  if (vin[8] !== expected) {
    return {
      valid: false,
      formatOk: true,
      vin,
      reason:
        "This VIN fails the built-in check-digit test, so at least one character is probably wrong.",
    };
  }

  return { valid: true, formatOk: true, vin };
}

type VinDecoded = {
  status: "ok";
  vin: string;
  check_digit_ok: boolean;
  year: number;
  make: string;
  model: string;
  trim?: string;
  engine_liters?: string;
  engine_description: string;
  body?: string;
};

type VinFailure = {
  status: "invalid_vin" | "not_decoded" | "error";
  message: string;
};

export async function decodeVin(raw: string): Promise<VinDecoded | VinFailure> {
  const check = checkVin(raw);
  // Only a wrong length or forbidden letters stops us. A bad check digit
  // still decodes, but the customer must confirm the vehicle (see below).
  if (!check.formatOk) {
    return { status: "invalid_vin", message: check.reason ?? "Invalid VIN." };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${check.vin}?format=json`,
      { signal: controller.signal, cache: "no-store" },
    );
    clearTimeout(timer);

    if (!res.ok) throw new Error(`NHTSA responded ${res.status}`);

    const json = await res.json();
    const r = json?.Results?.[0];

    const year = Number(r?.ModelYear);
    const make = String(r?.Make ?? "").trim();
    const model = String(r?.Model ?? "").trim();

    if (!r || !year || !make || !model) {
      return {
        status: "not_decoded",
        message: "We couldn't read the vehicle details from this VIN.",
      };
    }

    const displacement = parseFloat(r.DisplacementL);
    const liters = Number.isFinite(displacement)
      ? displacement.toFixed(1)
      : undefined;
    const cylinders = String(r.EngineCylinders ?? "").trim();

    return {
      status: "ok",
      vin: check.vin,
      check_digit_ok: check.valid,
      year,
      make,
      model,
      trim: String(r.Trim ?? "").trim() || undefined,
      engine_liters: liters,
      engine_description: [
        liters ? `${liters}L` : null,
        cylinders ? `${cylinders}-cylinder` : null,
      ]
        .filter(Boolean)
        .join(" "),
      body: String(r.BodyClass ?? "").trim() || undefined,
    };
  } catch (error) {
    console.error("VIN decode failed:", error);
    return {
      status: "error",
      message: "VIN lookup is unavailable right now.",
    };
  }
}

// Decode the VIN, then run the same fitment rules as a manual search.
export async function findPartsByVin(vin: string, part?: string) {
  const decoded = await decodeVin(vin);
  if (decoded.status !== "ok") return decoded;

  // Possible typo in the VIN: the decoded year or engine may be wrong, so
  // show the customer what it decoded to and let them confirm first.
  if (!decoded.check_digit_ok) {
    return {
      status: "confirm_vehicle" as const,
      message:
        "This VIN fails the check-digit test, so it may contain a typo and the decoded details may be wrong.",
      vin_vehicle: {
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
        trim: decoded.trim,
        engine: decoded.engine_description,
        engine_liters: decoded.engine_liters,
        body: decoded.body,
      },
    };
  }

  const fitment = await findPartsForVehicle({
    year: decoded.year,
    make: decoded.make,
    model: decoded.model,
    engine: decoded.engine_liters,
    part,
  });

  return {
    vin_vehicle: {
      year: decoded.year,
      make: decoded.make,
      model: decoded.model,
      trim: decoded.trim,
      engine: decoded.engine_description,
      body: decoded.body,
    },
    ...fitment,
  };
}
