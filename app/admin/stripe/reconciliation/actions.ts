"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runStripeReconciliation } from "@/lib/stripe-reconciliation";

export async function runManualStripeReconciliation() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (role !== "admin") {
    throw new Error("Only administrators can run Stripe reconciliation.");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  const result = await runStripeReconciliation(profile?.id ?? null);

  revalidatePath("/admin/stripe/reconciliation");
  return result;
}
