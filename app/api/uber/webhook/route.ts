import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Uber sends delivery status and courier location here (event.delivery_status, event.courier_update).
function validSignature(raw: string, header: string | null) {
  const key = process.env.UBER_WEBHOOK_SIGNING_KEY;
  if (!key || !header) return false;
  const expected = crypto.createHmac("sha256", key).update(raw, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header.trim().toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const raw = await request.text();
  const sig = request.headers.get("x-uber-signature") ?? request.headers.get("x-postmates-signature");
  if (!validSignature(raw, sig)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const deliveryId: string | undefined = event.delivery_id ?? event.data?.id;
  if (!deliveryId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, uber_live, uber_status")
    .eq("uber_delivery_id", deliveryId)
    .maybeSingle();
  if (!order) return NextResponse.json({ ok: true });

  const live: any = { ...(order.uber_live ?? {}) };
  let status: string | undefined = order.uber_status ?? undefined;

  if (event.kind === "event.courier_update") {
    const loc = event.location ?? event.data?.location;
    if (loc?.lat != null && loc?.lng != null) live.location = { lat: Number(loc.lat), lng: Number(loc.lng) };
  } else {
    const d = event.data ?? event;
    status = event.status ?? d.status ?? status;
    const c = d.courier;
    if (c) {
      live.courier = {
        name: c.name ?? live.courier?.name ?? null,
        phone: c.phone_number ?? live.courier?.phone ?? null,
        vehicle: [c.vehicle_color, c.vehicle_make, c.vehicle_model].filter(Boolean).join(" ") || c.vehicle_type || live.courier?.vehicle || null,
        image: c.img_href ?? live.courier?.image ?? null,
      };
      if (c.location?.lat != null) live.location = { lat: Number(c.location.lat), lng: Number(c.location.lng) };
    }
    live.pickupEta = d.pickup_eta ?? live.pickupEta ?? null;
    live.dropoffEta = d.dropoff_eta ?? live.dropoffEta ?? null;
  }
  live.updatedAt = new Date().toISOString();

  const patch: Record<string, unknown> = { uber_live: live, updated_on: new Date().toISOString() };
  if (status) patch.uber_status = status;
  if (event.data?.tracking_url) patch.uber_tracking_url = event.data.tracking_url;
  await admin.from("orders").update(patch).eq("id", order.id);

  if (event.kind !== "event.courier_update") {
    await admin.from("uber_delivery_events").insert({
      order_id: order.id,
      uber_delivery_id: deliveryId,
      status: status ?? null,
      courier_name: live.courier?.name ?? null,
      courier_lat: live.location?.lat ?? null,
      courier_lng: live.location?.lng ?? null,
      eta: live.dropoffEta ?? null,
    });

    // Keep the normal order status in step. Failure here must never reject the webhook.
    const map: Record<string, Record<string, unknown>> = {
      pickup_complete: { fulfillment_status: "out_for_delivery" },
      dropoff: { fulfillment_status: "out_for_delivery" },
      delivered: { fulfillment_status: "delivered", delivered_on: new Date().toISOString(), return_window_ends_on: new Date(Date.now() + 30 * 86400000).toISOString() },
    };
    if (status && map[status]) await admin.from("orders").update(map[status]).eq("id", order.id);
  }

  return NextResponse.json({ ok: true });
}
