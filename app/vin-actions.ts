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

  const label = `${decoded.year} ${decoded.make} ${decoded.model}`;
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

  // Add the engine only when exactly one engine matches the VIN's size.
  if (decoded.engine_liters) {
    const engines = new Map<number, any>();
    for (const r of (fit ?? []) as any[]) {
      if (r.models?.id === model.id && r.engine_sizes) {
        engines.set(r.engine_sizes.id, r.engine_sizes);
      }
    }
    const hits = Array.from(engines.values()).filter((e) =>
      String(e.engine_name).startsWith(`${decoded.engine_liters}L`),
    );
    if (hits.length === 1) url += `/${hits[0].slug}`;
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
