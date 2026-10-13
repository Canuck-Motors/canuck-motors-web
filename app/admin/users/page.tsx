import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/AdminNav";
import UsersTable, { type UserRow } from "@/components/admin/UsersTable";

export const instant = false;

export const metadata: Metadata = {
  title: "Users Admin",
  robots: { index: false, follow: false },
};

type Rec = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (role !== "admin") redirect("/admin");

  const { data: me } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const all: Rec[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const res = await admin.from("users").select("*").range(from, from + 999);
    if (res.error) throw new Error(`Unable to load users: ${res.error.message}`);
    all.push(...((res.data ?? []) as Rec[]));
    if ((res.data ?? []).length < 1000) break;
  }

  const { data: roleData } = await admin.from("role").select("id, role_name").eq("is_active", true).order("id");
  const roles = (roleData ?? []).map((r) => ({ id: Number(r.id), name: String(r.role_name) }));
  const roleName = new Map(roles.map((r) => [r.id, r.name]));

  const rows: UserRow[] = all
    .map((u) => ({
      id: str(u.id),
      name: [str(u.first_name), str(u.last_name)].filter(Boolean).join(" "),
      email: str(u.email_id),
      phone: str(u.phone_number),
      joined: str(u.created_on),
      roleId: u.role_id == null ? null : Number(u.role_id),
      role: roleName.get(Number(u.role_id)) ?? "",
      isMe: u.auth_user_id === me.user?.id,
    }))
    .sort((a, b) => b.joined.localeCompare(a.joined));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />
        <div className="mt-10">
          <p className="cm-eyebrow">People</p>
          <h1 className="cm-section-title mt-3">Users</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Everyone who has an account: name, email, phone number and role. Change a role to make someone an admin or a customer.
          </p>
        </div>
        <UsersTable rows={rows} roles={roles.filter((r) => r.name !== "staff")} />
      </div>
    </main>
  );
}
