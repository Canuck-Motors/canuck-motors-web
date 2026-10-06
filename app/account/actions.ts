"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateCommunicationPreferences(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const phone = String(formData.get("phone_number") || "").trim();
  const whatsappOptIn = formData.get("whatsapp_opt_in") === "on";

  if (whatsappOptIn && !phone) {
    throw new Error("Add a phone number before enabling WhatsApp updates.");
  }

  const { error } = await supabase
    .from("users")
    .update({
      phone_number: phone || null,
      whatsapp_opt_in: whatsappOptIn,
      updated_on: new Date().toISOString(),
    })
    .eq("auth_user_id", auth.user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/account");
}
