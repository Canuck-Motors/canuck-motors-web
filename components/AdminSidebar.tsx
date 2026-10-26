import { createClient } from "@/lib/supabase/server";
import { AdminNavLinks } from "@/components/AdminNavLinks";

const RETURN_NEEDS_ACTION = [
  "requested",
  "under_review",
  "received",
  "refund_pending",
  "inspection_failed",
  "exchange_processing",
];

export async function AdminSidebar() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  let returnAttentionCount = 0;
  if (role) {
    const { count } = await supabase
      .from("return_requests")
      .select("id", { count: "exact", head: true })
      .in("status", RETURN_NEEDS_ACTION);
    returnAttentionCount = count ?? 0;
  }

  return (
    <AdminNavLinks
      showStripe={role === "admin"}
      returnAttentionCount={returnAttentionCount}
    />
  );
}
