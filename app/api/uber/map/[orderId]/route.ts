import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickup } from "@/lib/uber-direct";

const geoCache = new Map<string, { lng: number; lat: number }>();

async function geocode(q: string, token: string) {
  const hit = geoCache.get(q);
  if (hit) return hit;
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", q);
  url.searchParams.set("country", "ca");
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  const json: any = await res.json().catch(() => null);
  const c = json?.features?.[0]?.geometry?.coordinates;
  if (!c) return null;
  const pt = { lng: Number(c[0]), lat: Number(c[1]) };
  geoCache.set(q, pt);
  return pt;
}

// Draws pickup, drop-off and the driver on a map image. The Mapbox token never leaves the server.
export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return new NextResponse(null, { status: 404 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse(null, { status: 401 });
  const { data: profile } = await supabase.from("users").select("id").eq("auth_user_id", auth.user.id).maybeSingle();
  const { data: order } = await supabase
    .from("orders")
    .select("delivery_method, uber_dropoff, uber_live")
    .eq("id", orderId)
    .eq("user_id", profile?.id ?? "")
    .maybeSingle();
  if (!order || order.delivery_method !== "uber") return new NextResponse(null, { status: 404 });

  const d = order.uber_dropoff as any;
  const p = pickup().address;
  const [from, to] = await Promise.all([
    geocode(`${p.street}, ${p.city}, ${p.state} ${p.zip}`, token),
    d?.street ? geocode(`${d.street}, ${d.city}, ${d.state} ${d.zip}`, token) : null,
  ]);
  const loc = (order.uber_live as any)?.location;

  const marks: string[] = [];
  if (from) marks.push(`pin-s-shop+555555(${from.lng},${from.lat})`);
  if (to) marks.push(`pin-l-home+d62828(${to.lng},${to.lat})`);
  if (loc) marks.push(`pin-l-bicycle+1a73e8(${loc.lng},${loc.lat})`);
  if (marks.length === 0) return new NextResponse(null, { status: 404 });

  const img = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${marks.join(",")}/auto/800x420@2x?padding=60&access_token=${token}`;
  const res = await fetch(img, { cache: "no-store" });
  if (!res.ok) return new NextResponse(null, { status: 502 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
