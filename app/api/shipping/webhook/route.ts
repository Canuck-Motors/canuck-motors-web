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

  const payload = await request.json();

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

  if (!allowedStatuses.has(payload.status)) {
    return NextResponse.json({ error: "Unsupported tracking status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("upsert_shipment_event", {
    p_order_id: payload.order_id,
    p_carrier: payload.carrier,
    p_tracking_number: payload.tracking_number,
    p_tracking_url: payload.tracking_url || null,
    p_provider_event_id: payload.event_id,
    p_status: payload.status,
    p_message: payload.message || null,
    p_location: payload.location || null,
    p_event_time: payload.event_time,
    p_raw_payload: payload,
  });

  if (error) {
    console.error("Delivery webhook failed:", error.message);
    return NextResponse.json({ error: "Tracking update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
