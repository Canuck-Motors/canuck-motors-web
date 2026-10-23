import { createClient } from "@/lib/supabase/server";
import { AdminNavLinks } from "@/components/AdminNavLinks";

export async function AdminSidebar() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  return <AdminNavLinks showStripe={role === "admin"} />;
}
