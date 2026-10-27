import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// True when the admin turned on "Amazon redirect" (customers buy on Amazon, no cart/checkout/Uber).
// Read live; never cached, so the admin switch takes effect right away.
export async function isAmazonRedirectOn(): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from("fulfillment_settings")
      .select("amazon_redirect_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) console.error("[fulfillment-mode]", error.message);
    return Boolean(data?.amazon_redirect_enabled);
  } catch (e) {
    console.error("[fulfillment-mode]", e);
    return false;
  }
}

// True unless the admin switched Uber same-day delivery off (also true if the column is not installed yet).
export async function isUberEnabled(): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from("fulfillment_settings")
      .select("uber_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) return true;
    return data?.uber_enabled !== false;
  } catch {
    return true;
  }
}
