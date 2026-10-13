"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");

  if (error || !role) {
    throw new Error("You are not authorized to perform this action.");
  }

  return supabase;
}

async function adjustStock(
  supabase: Awaited<ReturnType<typeof requireStaff>>,
  productId: number,
  quantity: number,
  reason: string
) {
  // Preferred: also writes a stock-history row (database/admin_inventory_extras.sql).
  const first = await supabase.rpc("admin_adjust_stock", {
    p_product_id: productId,
    p_new_quantity: quantity,
    p_reason: reason,
  });
  if (!first.error) return;

  const missing = /admin_adjust_stock|schema cache|does not exist/i.test(first.error.message);
  if (!missing) throw new Error(first.error.message);

  const { error } = await supabase.rpc("adjust_inventory", {
    p_product_id: productId,
    p_new_quantity: quantity,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
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
  try {
    await adjustStock(supabase, productId, quantity, reason);
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/quantity_below_reserved/.test(m)) {
      const { data: inv } = await supabase
        .from("inventory")
        .select("reserved_quantity")
        .eq("product_id", productId)
        .maybeSingle();
      const n = Number(inv?.reserved_quantity ?? 0);
      throw new Error(
        `Can't set stock to ${quantity}: ${n} unit${n === 1 ? " is" : "s are"} reserved by open orders. Ship or cancel those orders first, or set stock to ${n} or more.`
      );
    }
    throw e;
  }

  const { data: rows } = await supabase
    .from("inventory")
    .select("quantity")
    .eq("product_id", productId);
  if (rows && rows.length > 0 && !rows.some((r) => Number(r.quantity) === quantity)) {
    throw new Error(
      `Stock did not change: the database still shows ${rows[0].quantity}. Please tell the developer.`
    );
  }
  if (rows && rows.length > 1) {
    throw new Error(`This product has ${rows.length} stock rows in the database; it needs cleaning up.`);
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function setLowStockLevel(productId: number, threshold: number) {
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error("Low-stock level must be a whole number, zero or more.");
  }
  const supabase = await requireStaff();
  const { error } = await supabase.rpc("admin_set_low_stock", {
    p_product_id: productId,
    p_threshold: threshold,
  });
  if (error) {
    throw new Error(
      /admin_set_low_stock|schema cache/.test(error.message)
        ? "Run database/admin_inventory_extras.sql in the Supabase SQL editor first."
        : error.message
    );
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

export async function bulkSetStock(productIds: number[], quantity: number, reason: string) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Stock must be a whole number, zero or more.");
  }
  const supabase = await requireStaff();
  const ids = Array.from(new Set(productIds)).slice(0, 500);
  for (let i = 0; i < ids.length; i += 10) {
    await Promise.all(
      ids.slice(i, i + 10).map((id) => adjustStock(supabase, id, quantity, reason || "Bulk stock update"))
    );
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

export async function bulkChangePrice(
  productIds: number[],
  mode: "percent" | "set",
  value: number
) {
  if (!Number.isFinite(value)) throw new Error("Enter a number.");
  if (mode === "set" && value < 0) throw new Error("Price must be zero or more.");
  if (mode === "percent" && value <= -100) throw new Error("A decrease must be less than 100%.");

  const supabase = await requireStaff();
  const ids = Array.from(new Set(productIds)).slice(0, 500);
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, product_name, description, price, is_active")
    .in("id", ids);
  if (error) throw new Error(error.message);

  const list = rows ?? [];
  for (let i = 0; i < list.length; i += 10) {
    const results = await Promise.all(
      list.slice(i, i + 10).map((r) => {
        const old = Number(r.price ?? 0);
        const next = mode === "set" ? value : old * (1 + value / 100);
        return supabase.rpc("admin_update_product", {
          p_product_id: r.id,
          p_name: r.product_name,
          p_description: r.description ?? "",
          p_price: Math.round(next * 100) / 100,
          p_is_active: Boolean(r.is_active),
        });
      })
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/", "layout");
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

export async function updateProduct(
  productId: number,
  fields: { name: string; description: string; price: number; isActive: boolean }
) {
  const supabase = await requireStaff();

  const { error } = await supabase.rpc("admin_update_product", {
    p_product_id: productId,
    p_name: fields.name,
    p_description: fields.description,
    p_price: fields.price,
    p_is_active: fields.isActive,
  });

  if (error) {
    throw new Error(
      error.message.includes("admin_update_product")
        ? "The database function is missing. Run database/admin_products.sql in the Supabase SQL editor."
        : error.message
    );
  }

  // Read the row back so the page never shows a change that did not save.
  const { data: saved } = await supabase
    .from("products")
    .select("is_active")
    .eq("id", productId)
    .maybeSingle();
  if (saved && Boolean(saved.is_active) !== fields.isActive) {
    throw new Error("The change did not save. Please try again.");
  }

  revalidatePath("/admin/inventory");
  // Product pages, listings, search and categories are cached: refresh them all.
  revalidatePath("/", "layout");
}

export async function saveProductEdit(productId: number, formData: FormData) {
  await updateProduct(productId, {
    name: String(formData.get("name") || ""),
    description: String(formData.get("description") || ""),
    price: Number(formData.get("price")),
    isActive: formData.get("hidden") !== "on",
  });
  redirect("/admin/inventory");
}

export async function setProductsVisibility(productIds: number[], isActive: boolean) {
  const ids = Array.from(new Set(productIds.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 1000);
  if (!ids.length) return;

  const supabase = await requireStaff();

  const { data: rows, error } = await supabase
    .from("products")
    .select("id, product_name, description, price")
    .in("id", ids);
  if (error) throw new Error(error.message);

  for (let i = 0; i < (rows ?? []).length; i += 10) {
    const results = await Promise.all(
      (rows ?? []).slice(i, i + 10).map((r) =>
        supabase.rpc("admin_update_product", {
          p_product_id: r.id,
          p_name: r.product_name,
          p_description: r.description ?? "",
          p_price: Number(r.price ?? 0),
          p_is_active: isActive,
        })
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/", "layout");
}

export async function advanceOrders(orderIds: string[]) {
  const supabase = await requireStaff();
  const { nextStatus } = await import("@/lib/order-flow");

  const { data: rows, error } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .in("id", orderIds.slice(0, 200));
  if (error) throw new Error(error.message);

  let done = 0;
  const failed: string[] = [];
  for (const o of rows ?? []) {
    const next = nextStatus(o.status);
    if (!next || next === "cancelled") {
      failed.push(`${o.order_number}: nothing to advance`);
      continue;
    }
    const { error: e } = await supabase.rpc("admin_update_order_status", {
      p_order_id: o.id,
      p_new_status: next,
    });
    if (e) failed.push(`${o.order_number}: ${e.message}`);
    else done++;
  }

  revalidatePath("/admin/orders");
  return { done, failed };
}

export async function setOrderNote(orderId: string, note: string) {
  const supabase = await requireStaff();
  const { error } = await supabase.rpc("admin_set_order_note", {
    p_order_id: orderId,
    p_note: note,
  });
  if (error) {
    throw new Error(
      error.message.includes("admin_set_order_note")
        ? "Run database/admin_order_notes.sql in the Supabase SQL editor first."
        : error.message
    );
  }
  revalidatePath("/admin/orders");
}
