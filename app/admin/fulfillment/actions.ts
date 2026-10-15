"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processFulfillmentQueue } from "@/lib/fulfillment";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");
  if (error || role !== "admin") {
    throw new Error("Admin access is required.");
  }
  return supabase;
}

export async function saveFulfillmentSettings(input: {
  amazonMcfEnabled: boolean;
  deliveryPartnerEnabled: boolean;
  preferredProvider: "amazon_mcf" | "delivery_partner";
  amazonShippingSpeed: "Standard" | "Expedited" | "Priority";
}) {
  const supabase = await requireAdmin();

  const { error } = await supabase.rpc("admin_update_fulfillment_settings", {
    p_amazon_mcf_enabled: input.amazonMcfEnabled,
    p_delivery_partner_enabled: input.deliveryPartnerEnabled,
    p_preferred_provider: input.preferredProvider,
    p_amazon_shipping_speed: input.amazonShippingSpeed,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/fulfillment");
  revalidatePath("/admin/orders");
}

export async function saveProductFulfillment(input: {
  productId: number;
  amazonSku: string;
  amazonMcfEligible: boolean;
}) {
  if (!Number.isInteger(input.productId) || input.productId <= 0) {
    throw new Error("Invalid product.");
  }
  if (input.amazonSku.length > 100) {
    throw new Error("Amazon SKU must be 100 characters or fewer.");
  }

  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_save_product_fulfillment", {
    p_product_id: input.productId,
    p_amazon_sku: input.amazonSku,
    p_amazon_mcf_eligible: input.amazonMcfEligible,
  });
  if (error) {
    throw new Error(
      /amazon_sku_required/.test(error.message)
        ? "Enter the Amazon Seller SKU before enabling MCF for this product."
        : error.message
    );
  }

  revalidatePath("/admin/fulfillment");
}

export async function overrideOrderFulfillment(
  orderId: string,
  provider: "amazon_mcf" | "delivery_partner"
) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_override_order_fulfillment", {
    p_order_id: orderId,
    p_provider: provider,
  });

  if (error) {
    const message = error.message;
    if (/amazon_mcf_disabled/.test(message)) throw new Error("Amazon MCF is switched off.");
    if (/delivery_partner_disabled/.test(message)) throw new Error("Delivery Partner is switched off.");
    if (/amazon_mcf_items_not_mapped/.test(message)) {
      throw new Error("Every active item in this order must have an enabled Amazon MCF SKU.");
    }
    throw new Error(message);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/fulfillment");
}

export async function processAmazonMcfQueueNow() {
  await requireAdmin();
  const result = await processFulfillmentQueue(25);
  revalidatePath("/admin/fulfillment");
  revalidatePath("/admin/orders");
  return result;
}
