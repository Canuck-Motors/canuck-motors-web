import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReturnLabelPdf, loadReturnLabelData } from "@/lib/return-label";

// Customers download their own return label; staff can open any label (admin dashboard).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: staffRole } = await supabase.rpc("current_user_staff_role");
  const isStaff = Boolean(staffRole);

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("return_requests")
    .select("id, status, orders!order_id!inner(order_number, user_id)")
    .eq("id", id)
    .maybeSingle();

  const order = Array.isArray(row?.orders) ? row?.orders[0] : row?.orders;
  if (!row || !order) {
    return NextResponse.json({ error: "Return request not found." }, { status: 404 });
  }

  if (!isStaff) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();
    if (!profile || Number(order.user_id) !== Number(profile.id)) {
      return NextResponse.json({ error: "Return request not found." }, { status: 404 });
    }
  }

  if (!["approved", "label_issued", "in_transit", "received", "refund_pending", "completed"].includes(String(row.status))) {
    return NextResponse.json({ error: "Return label is not available yet." }, { status: 409 });
  }

  const data = await loadReturnLabelData(String(row.id));
  if (!data) {
    return NextResponse.json({ error: "Could not build the label." }, { status: 500 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const pdf = buildReturnLabelPdf(data);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="return-label-${data.returnRef}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
