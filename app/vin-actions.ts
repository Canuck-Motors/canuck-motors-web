"use server";

import { decodeVin } from "@/lib/catalog";
import { createPublicClient } from "@/lib/supabase/public";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type Result =
  | { ok: true; url: string; label: string; note?: string }
  | { ok: false; message: string };

// Decodes a VIN and returns the /products/... page for that vehicle.
export async function lookupVin(raw: string): Promise<Result> {
  const decoded = await decodeVin(raw);
  if (decoded.status !== "ok") return { ok: false, message: decoded.message };

  // Full vehicle for messages: year, make, model, trim and engine (e.g.
  // "2024 Ford F-150 XLT with 2.7L 6-cylinder"). NHTSA sends makes in capitals.
  const niceMake = (m: string) =>
    m.length > 3 && m === m.toUpperCase() ? m.charAt(0) + m.slice(1).toLowerCase() : m;
  const fullLabel = (makeName: string) =>
    [
      decoded.year,
      niceMake(makeName),
      decoded.model,
      decoded.trim,
      decoded.engine_description ? `with ${decoded.engine_description}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  let label = fullLabel(decoded.make);
  const supabase = createPublicClient();

  const { data: yearRow } = await supabase
    .from("year")
    .select("id")
    .eq("year", decoded.year)
    .maybeSingle();

  const { data: makeRows } = await supabase
    .from("manufacturer")
    .select("id, slug, manufacturer_name");
  const make = (makeRows ?? []).find(
    (m: any) => norm(m.manufacturer_name) === norm(decoded.make),
  );

  if (make) label = fullLabel(make.manufacturer_name);

  if (!yearRow || !make) {
    return { ok: false, message: `We don't have ${label} in our catalog yet.` };
  }

  const { data: fit } = await supabase
    .from("vehicle_fitments")
    .select("models ( id, model_name, slug ), engine_sizes ( id, engine_name, slug )")
    .eq("year_id", yearRow.id)
    .eq("manufacturer_id", make.id);

  const models = new Map<number, any>();
  for (const r of (fit ?? []) as any[]) if (r.models) models.set(r.models.id, r.models);

  const wanted = norm(decoded.model);
  const all = Array.from(models.values());
  const model =
    all.find((m) => norm(m.model_name) === wanted) ??
    all.find((m) => norm(m.model_name).startsWith(wanted)) ??
    all.find((m) => wanted.startsWith(norm(m.model_name)));

  if (!model) {
    return { ok: false, message: `We don't have ${label} in our catalog yet.` };
  }

  let url = `/products/${decoded.year}/${make.slug}/${model.slug}`;

  // Same engine as the VIN, so the page shows the same parts as the chatbot.
  // Our engine names look like "5L | V8 | 4951cc | GAS": compare litres as numbers
  // (the VIN says "5.0"), then cylinders, then fuel.
  if (decoded.engine_liters) {
    const engines = new Map<number, any>();
    for (const r of (fit ?? []) as any[]) {
      if (r.models?.id === model.id && r.engine_sizes) engines.set(r.engine_sizes.id, r.engine_sizes);
    }
    const litres = Number(decoded.engine_liters);
    const cylOf = (name: string) => Number(name.match(/\b[VLIHW](\d{1,2})\b/i)?.[1] ?? NaN);
    const fuelOf = (name: string) => name.split("|").pop()?.trim().toUpperCase() ?? "";
    let hits = Array.from(engines.values()).filter((e) => {
      const l = parseFloat(String(e.engine_name));
      return Number.isFinite(l) && Math.abs(l - litres) < 0.05;
    });
    if (hits.length > 1 && decoded.engine_cylinders) {
      const byCyl = hits.filter((e) => cylOf(e.engine_name) === decoded.engine_cylinders);
      if (byCyl.length) hits = byCyl;
    }
    if (hits.length > 1 && decoded.fuel) {
      const byFuel = hits.filter((e) => fuelOf(e.engine_name) === decoded.fuel);
      if (byFuel.length) hits = byFuel;
    }
    if (hits.length === 1) {
      url += `/${hits[0].slug}`;

    }
  }

  return {
    ok: true,
    url,
    label,
    note: decoded.check_digit_ok
      ? undefined
      : "This VIN may have a typo, so please check the vehicle.",
  };
}
