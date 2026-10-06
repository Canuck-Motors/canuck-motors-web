"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");

  if (error || !role) {
    throw new Error("You are not authorized to perform this action.");
  }

  return supabase;
}

export async function setInventoryQuantity(
  productId: number,
  quantity: number,
  reason = "Admin inventory adjustment"
) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Inventory quantity must be a non-negative whole number.");
  }

  const supabase = await requireStaff();

  const { error } = await supabase.rpc("adjust_inventory", {
    p_product_id: productId,
    p_new_quantity: quantity,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/inventory");
}

export async function updateOrderStatus(orderId: string, status: string) {
  const allowed = new Set(["cancelled", "processing", "packed", "ready_to_ship", "shipped", "out_for_delivery", "delivered"]);

  if (!allowed.has(status)) {
    throw new Error("Unsupported order status.");
  }

  const supabase = await requireStaff();

  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_new_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/orders");
}


export async function createShipment(
  orderId: string,
  carrier: string,
  trackingNumber: string,
  trackingUrl = "",
  serviceLevel = "",
  estimatedDelivery = ""
) {
  const supabase = await requireStaff();

  const { error } = await supabase.rpc("admin_create_shipment", {
    p_order_id: orderId,
    p_carrier: carrier,
    p_tracking_number: trackingNumber,
    p_tracking_url: trackingUrl || null,
    p_service_level: serviceLevel || null,
    p_estimated_delivery: estimatedDelivery || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/account/orders/${orderId}`);
}
