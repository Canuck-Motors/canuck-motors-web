import { createClient } from "@/lib/supabase/server";
import { AdminNavLinks } from "@/components/AdminNavLinks";

export async function AdminNav() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  return (
    <div className="rounded-[24px] border border-black/5 bg-ink p-2 shadow-[0_16px_44px_rgba(0,0,0,0.12)]">
      <AdminNavLinks showStripe={role === "admin"} />
    </div>
  );
}
