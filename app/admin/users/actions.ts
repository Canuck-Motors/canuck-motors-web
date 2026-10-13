"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserRole(userId: string, roleId: number) {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (role !== "admin") throw new Error("Only admins can change roles.");

  const { data: auth } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("users")
    .select("id, auth_user_id")
    .eq("id", userId)
    .maybeSingle();
  if (!target) throw new Error("User not found.");
  if (target.auth_user_id === auth.user?.id) {
    throw new Error("You can't change your own role. Ask another admin.");
  }

  const { data: newRole } = await admin
    .from("role")
    .select("id, role_name")
    .eq("id", roleId)
    .eq("is_active", true)
    .maybeSingle();
  if (!newRole) throw new Error("That role doesn't exist.");

  const { error } = await admin
    .from("users")
    .update({ role_id: newRole.id, updated_on: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
  return `Role changed to ${newRole.role_name}.`;
}
