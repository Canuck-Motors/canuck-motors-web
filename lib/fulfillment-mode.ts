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
