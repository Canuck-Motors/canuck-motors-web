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

// ---- My details: name, phone, WhatsApp and saved delivery address ----

export type ProfileState = { ok: boolean; message: string } | null;

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

const clean = (v: FormDataEntryValue | null, max = 120) =>
  String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const firstName = clean(formData.get("first_name"), 60);
  const lastName = clean(formData.get("last_name"), 60);
  const phone = clean(formData.get("phone_number"), 30);
  const whatsappOptIn = formData.get("whatsapp_opt_in") === "on";

  if (!firstName) return { ok: false, message: "Please enter your first name." };
  if (phone && !/^[0-9+()\-.\s]{7,20}$/.test(phone)) {
    return { ok: false, message: "That phone number does not look right." };
  }
  if (whatsappOptIn && !phone) {
    return { ok: false, message: "Add a phone number before turning on WhatsApp updates." };
  }

  // Address: all empty = remove it; otherwise the main parts are required
  const line1 = clean(formData.get("line1"));
  const line2 = clean(formData.get("line2"));
  const city = clean(formData.get("city"), 80);
  const province = clean(formData.get("province"), 2).toUpperCase();
  const postalRaw = clean(formData.get("postal_code"), 10).toUpperCase().replace(/[\s-]/g, "");

  let shipping_address: Record<string, string> | null = null;
  if (line1 || city || province || postalRaw) {
    if (!line1 || !city || !province || !postalRaw) {
      return { ok: false, message: "Please fill in street, city, province and postal code (or clear them all)." };
    }
    if (!PROVINCES.includes(province)) return { ok: false, message: "Please choose a province." };
    if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postalRaw)) {
      return { ok: false, message: "Postal code should look like M5V 2T6." };
    }
    shipping_address = {
      name: [firstName, lastName].filter(Boolean).join(" "),
      line1,
      line2,
      city,
      province,
      postal_code: `${postalRaw.slice(0, 3)} ${postalRaw.slice(3)}`,
      country: "CA",
    };
  }

  const { error } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName || null,
      phone_number: phone || null,
      whatsapp_opt_in: whatsappOptIn,
      shipping_address,
      updated_on: new Date().toISOString(),
    })
    .eq("auth_user_id", auth.user.id);

  if (error) {
    console.error("Profile update failed:", error.message);
    return {
      ok: false,
      message: /shipping_address/i.test(error.message)
        ? "The address column is missing. Run database/user_profile_address.sql in Supabase."
        : `We could not save your details. Please try again.${process.env.NODE_ENV !== "production" ? ` (${error.message})` : ""}`,
    };
  }

  // Keep the greeting (header and chat) in step with the new name
  await supabase.auth.updateUser({ data: { first_name: firstName } }).catch(() => undefined);

  revalidatePath("/account");
  return { ok: true, message: "Saved." };
}
