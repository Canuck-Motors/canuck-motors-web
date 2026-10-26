import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildReturnLabelPdf } from "@/lib/return-label";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Customer profile unavailable." }, { status: 404 });
  }

  const { data: request } = await supabase
    .from("return_requests")
    .select("id, status, orders!order_id!inner(order_number, user_id)")
    .eq("id", id)
    .maybeSingle();

  const order = Array.isArray(request?.orders) ? request?.orders[0] : request?.orders;
  if (!request || !order || Number(order.user_id) !== Number(profile.id)) {
    return NextResponse.json({ error: "Return request not found." }, { status: 404 });
  }

  if (!["approved", "label_issued", "in_transit", "received", "refund_pending", "completed"].includes(String(request.status))) {
    return NextResponse.json({ error: "Return label is not available yet." }, { status: 409 });
  }

  const pdf = buildReturnLabelPdf({
    orderNumber: String(order.order_number || ""),
    requestId: String(request.id),
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="return-${String(order.order_number || "order")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
