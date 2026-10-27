import { createClient } from "@/lib/supabase/server";
import { AdminNavLinks } from "@/components/AdminNavLinks";
import { TO_SHIP_STATUSES } from "@/lib/order-flow";

const RETURN_NEEDS_REVIEW = [
  "requested",
  "under_review",
  "exchange_processing",
];

export async function AdminSidebar() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  let returnAttentionCount = 0;
  let orderAttentionCount = 0;

  if (role) {
    const [{ count: returnCount }, { count: orderCount }] = await Promise.all([
      supabase
        .from("return_requests")
        .select("id", { count: "exact", head: true })
        .in("status", RETURN_NEEDS_REVIEW),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .in("status", TO_SHIP_STATUSES),
    ]);

    returnAttentionCount = returnCount ?? 0;
    orderAttentionCount = orderCount ?? 0;
  }

  return (
    <AdminNavLinks
      showStripe={role === "admin"}
      returnAttentionCount={returnAttentionCount}
      orderAttentionCount={orderAttentionCount}
    />
  );
}
