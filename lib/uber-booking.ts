import { createAdminClient } from "@/lib/supabase/admin";
import { createUberDelivery, getUberQuote, type UberAddress } from "@/lib/uber-direct";

type Dropoff = UberAddress & { name?: string; phone?: string };

// Books the courier for a paid Uber order. Safe to call twice: it does nothing if already booked.
export async function bookUberForOrder(orderId: string) {
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, order_number, customer_name, delivery_method, delivery_phone, uber_delivery_id, uber_dropoff, order_items(product_name, quantity, cancelled_on)")
    .eq("id", orderId)
    .single();

  if (error || !order) throw new Error("Order could not be loaded for Uber delivery.");
  if (order.delivery_method !== "uber" || order.uber_delivery_id) return null;

  const dropoff = order.uber_dropoff as Dropoff | null;
  if (!dropoff?.street) throw new Error("The Uber delivery address is missing.");

  try {
    // Fresh quote: the one from checkout may have expired while the customer paid.
    const quote = await getUberQuote(dropoff);
    const items = (order.order_items ?? []).filter((i: { cancelled_on: string | null }) => !i.cancelled_on);
    const d = await createUberDelivery({
      quoteId: quote.id,
      dropoff,
      customerName: dropoff.name || order.customer_name || "Customer",
      customerPhone: dropoff.phone || order.delivery_phone || "",
      orderNumber: String(order.order_number),
      items: items.map((i: { product_name: string; quantity: number }) => ({ name: i.product_name, quantity: i.quantity })),
    });

    await admin
      .from("orders")
      .update({
        uber_quote_id: quote.id,
        uber_delivery_id: d.id,
        uber_tracking_url: d.trackingUrl ?? null,
        uber_status: d.status ?? "pending",
        updated_on: new Date().toISOString(),
      })
      .eq("id", orderId);

    return d;
  } catch (e) {
    await admin.from("orders").update({ uber_status: "booking_failed" }).eq("id", orderId);
    throw e;
  }
}
