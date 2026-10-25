import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("id").eq("auth_user_id", auth.user.id).maybeSingle();
  const { data: order } = await supabase
    .from("orders")
    .select("delivery_method, uber_status, uber_live, uber_tracking_url")
    .eq("id", orderId)
    .eq("user_id", profile?.id ?? "")
    .maybeSingle();

  if (!order || order.delivery_method !== "uber") return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    { status: order.uber_status, live: order.uber_live ?? {}, trackingUrl: order.uber_tracking_url },
    { headers: { "Cache-Control": "no-store" } },
  );
}
