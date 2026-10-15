import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const expected = process.env.DELIVERY_WEBHOOK_SECRET;
  const provided = request.headers.get("x-delivery-webhook-secret") || "";

  if (!expected || !provided || !safeEqual(expected, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 32 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const raw = await request.text();
  if (raw.length > 32 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const required = [
    "order_id",
    "carrier",
    "tracking_number",
    "event_id",
    "status",
    "event_time",
  ] as const;

  for (const key of required) {
    if (!payload?.[key]) {
      return NextResponse.json(
        { error: `Missing field: ${key}` },
        { status: 400 }
      );
    }
  }

  const allowedStatuses = new Set([
    "label_created",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "exception",
    "delayed",
    "lost",
    "returned_to_sender",
    "cancelled",
  ]);

  const status = String(payload.status || "");
  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: "Unsupported tracking status" }, { status: 400 });
  }

  const limits: Record<string, number> = {
    order_id: 64,
    carrier: 100,
    tracking_number: 200,
    event_id: 200,
    event_time: 64,
    tracking_url: 2048,
    message: 1000,
    location: 500,
  };

  for (const [key, max] of Object.entries(limits)) {
    const value = payload[key];
    if (value != null && String(value).length > max) {
      return NextResponse.json({ error: `Field too long: ${key}` }, { status: 400 });
    }
  }

  const eventTime = String(payload.event_time || "");
  if (!Number.isFinite(Date.parse(eventTime))) {
    return NextResponse.json({ error: "Invalid event_time" }, { status: 400 });
  }

  const trackingUrl = payload.tracking_url ? String(payload.tracking_url) : "";
  if (trackingUrl) {
    try {
      const url = new URL(trackingUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ error: "Invalid tracking_url" }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("upsert_shipment_event", {
    p_order_id: String(payload.order_id),
    p_carrier: String(payload.carrier),
    p_tracking_number: String(payload.tracking_number),
    p_tracking_url: trackingUrl || null,
    p_provider_event_id: String(payload.event_id),
    p_status: status,
    p_message: payload.message ? String(payload.message) : null,
    p_location: payload.location ? String(payload.location) : null,
    p_event_time: eventTime,
    p_raw_payload: payload,
  });

  if (error) {
    console.error("Delivery webhook failed:", error.message);
    return NextResponse.json({ error: "Tracking update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
