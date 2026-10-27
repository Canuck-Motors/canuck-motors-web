"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailShipmentToCustomer } from "@/lib/shipment-email";
import { processFulfillmentQueue, syncAmazonMcfOrders, syncAmazonMcfPackageTracking } from "@/lib/fulfillment";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");
  if (error || role !== "admin") {
    throw new Error("Admin access is required.");
  }
  return supabase;
}

export async function saveFulfillmentSettings(input: {
  amazonRedirectEnabled?: boolean;
  uberEnabled?: boolean;
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

  const { error: redirectError } = await createAdminClient()
    .from("fulfillment_settings")
    .update({ amazon_redirect_enabled: Boolean(input.amazonRedirectEnabled) })
    .eq("id", 1);
  if (redirectError) throw new Error(redirectError.message);
  if (input.uberEnabled !== undefined) {
    const { error: uberError } = await createAdminClient()
      .from("fulfillment_settings")
      .update({ uber_enabled: input.uberEnabled })
      .eq("id", 1);
    if (uberError) throw new Error(`${uberError.message} (run database/uber_toggle.sql in Supabase first)`);
  }
  revalidatePath("/", "layout");

  // Keep already-paid, not-yet-shipped orders aligned with the current
  // fulfillment switches. This makes the Orders screen immediately follow
  // the Amazon MCF / Delivery Partner settings instead of keeping stale routes.
  const admin = createAdminClient();
  const { data: openPaidOrders } = await admin
    .from("orders")
    .select("id, fulfillment_status")
    .eq("payment_status", "paid");

  for (const order of openPaidOrders ?? []) {
    if (
      ["shipped", "out_for_delivery", "delivered", "cancelled"].includes(
        String(order.fulfillment_status || "")
      )
    ) {
      continue;
    }

    const { error: routeError } = await admin.rpc("route_order_fulfillment", {
      p_order_id: order.id,
    });
    if (routeError) {
      console.error("Unable to re-route order after fulfillment settings change:", order.id, routeError);
    }
  }

  revalidatePath("/admin/fulfillment");
  revalidatePath("/admin/orders");
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
    throw new Error(message);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/fulfillment");
}

export async function runAmazonMcfSyncNow() {
  await requireAdmin();
  const queued = await processFulfillmentQueue(25);
  const outbound = await syncAmazonMcfOrders(50);
  const tracking = await syncAmazonMcfPackageTracking(50);
  revalidatePath("/admin/fulfillment");
  revalidatePath("/admin/orders");
  return JSON.stringify({ queued, outbound, tracking });
}

export async function processAmazonMcfQueueNow() {
  await requireAdmin();
  const result = await processFulfillmentQueue(25);
  revalidatePath("/admin/fulfillment");
  revalidatePath("/admin/orders");
  return result;
}


type TrackingImportRow = {
  orderNumber: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
  serviceLevel: string;
  estimatedDelivery: string;
};

function headerKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "object") {
    const rich = value as { text?: string; hyperlink?: string; result?: unknown };
    if (rich.hyperlink) return String(rich.hyperlink).trim();
    if (rich.text) return String(rich.text).trim();
    if (rich.result != null) return String(rich.result).trim();
  }
  return String(value).trim();
}

function findColumn(headers: string[], aliases: string[]) {
  const normalized = new Set(aliases.map(headerKey));
  const index = headers.findIndex((header) => normalized.has(header));
  return index >= 0 ? index : null;
}

function safeTrackingUrl(value: string) {
  const text = value.trim();
  if (!text) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

async function parseTrackingFile(file: File): Promise<TrackingImportRow[]> {
  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  const rows: unknown[][] = [];

  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/node");
    const parsed = await readSheet(bytes);
    for (const row of parsed) {
      rows.push(row as unknown[]);
    }
  } else if (name.endsWith(".csv")) {
    const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const values: string[] = [];
      let value = "";
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (quoted && line[i + 1] === '"') {
            value += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (ch === "," && !quoted) {
          values.push(value);
          value = "";
        } else {
          value += ch;
        }
      }
      values.push(value);
      rows.push(values);
    }
  } else {
    throw new Error("Upload an .xlsx or .csv tracking file.");
  }

  if (rows.length < 2) throw new Error("The tracking file has no data rows.");

  const headers = rows[0].map((value) => headerKey(cellText(value)));
  const orderColumn = findColumn(headers, [
    "order number",
    "order id",
    "seller fulfillment order id",
    "seller order id",
    "merchant order id",
    "merchant order number",
  ]);
  const trackingColumn = findColumn(headers, [
    "tracking number",
    "tracking id",
    "tracking no",
    "tracking",
  ]);
  const urlColumn = findColumn(headers, [
    "tracking url",
    "tracking link",
    "tracking website",
    "tracking page",
  ]);
  const carrierColumn = findColumn(headers, [
    "carrier",
    "carrier code",
    "shipping carrier",
    "ship carrier",
  ]);
  const serviceColumn = findColumn(headers, [
    "service level",
    "shipping service",
    "ship method",
    "shipping method",
  ]);
  const etaColumn = findColumn(headers, [
    "estimated delivery",
    "estimated delivery date",
    "estimated arrival",
    "delivery date",
  ]);

  if (orderColumn == null || trackingColumn == null) {
    throw new Error(
      'The spreadsheet needs an "Order Number" column and a "Tracking Number" column.'
    );
  }

  return rows
    .slice(1)
    .map((row) => {
      const values = row.map(cellText);
      return {
        orderNumber: values[orderColumn] ?? "",
        trackingNumber: values[trackingColumn] ?? "",
        trackingUrl: urlColumn == null ? "" : safeTrackingUrl(values[urlColumn] ?? ""),
        carrier: carrierColumn == null ? "Amazon MCF" : values[carrierColumn] || "Amazon MCF",
        serviceLevel: serviceColumn == null ? "" : values[serviceColumn] ?? "",
        estimatedDelivery: etaColumn == null ? "" : values[etaColumn] ?? "",
      };
    })
    .filter((row) => row.orderNumber || row.trackingNumber);
}

export async function importAmazonTrackingSheet(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an Amazon tracking spreadsheet.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Tracking spreadsheet must be 10 MB or smaller.");
  }

  const rows = await parseTrackingFile(file);
  if (rows.length > 5000) {
    throw new Error("A maximum of 5,000 tracking rows can be imported at once.");
  }

  const admin = createAdminClient();
  const orderNumbers = [...new Set(rows.map((row) => row.orderNumber.trim()).filter(Boolean))];

  const { data: orders, error: orderError } = await admin
    .from("orders")
    .select("id, order_number, status, fulfillment_status, payment_status, fulfillment_provider")
    .in("order_number", orderNumbers);

  if (orderError) throw new Error(orderError.message);

  const byNumber = new Map((orders ?? []).map((order) => [String(order.order_number), order]));
  let imported = 0;
  let emailed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const orderNumber = row.orderNumber.trim();
    const trackingNumber = row.trackingNumber.trim();

    if (!orderNumber || !trackingNumber) {
      skipped++;
      errors.push(`Missing order/tracking number: ${orderNumber || "(blank order)"}`);
      continue;
    }

    const order = byNumber.get(orderNumber);
    if (!order) {
      skipped++;
      errors.push(`${orderNumber}: order not found in Canuck Motors.`);
      continue;
    }
    if (order.fulfillment_provider !== "amazon_mcf") {
      skipped++;
      errors.push(`${orderNumber}: not routed to Amazon MCF.`);
      continue;
    }
    if (order.payment_status !== "paid") {
      skipped++;
      errors.push(`${orderNumber}: order is not paid.`);
      continue;
    }

    const { data: existing } = await admin
      .from("shipments")
      .select("id, tracking_url, metadata")
      .eq("order_id", order.id)
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    const estimatedDelivery =
      row.estimatedDelivery && Number.isFinite(Date.parse(row.estimatedDelivery))
        ? new Date(row.estimatedDelivery).toISOString()
        : null;

    if (existing) {
      const existingMetadata =
        existing.metadata && typeof existing.metadata === "object"
          ? (existing.metadata as Record<string, unknown>)
          : {};

      await admin
        .from("shipments")
        .update({
          carrier: row.carrier,
          tracking_url: row.trackingUrl || existing.tracking_url || null,
          service_level: row.serviceLevel || null,
          estimated_delivery: estimatedDelivery,
          status: "in_transit",
          shipped_on: new Date().toISOString(),
          metadata: {
            ...existingMetadata,
            provider: "amazon_mcf",
            source: "tracking_sheet_import",
          },
          updated_on: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (!existingMetadata.email_sent_at) {
        const emailResult = await emailShipmentToCustomer({
          orderId: String(order.id),
          carrier: row.carrier,
          trackingNumber,
          trackingUrl: row.trackingUrl || String(existing.tracking_url || ""),
          serviceLevel: row.serviceLevel,
          estimatedDelivery: estimatedDelivery ?? "",
        });

        if (/Customer emailed/i.test(emailResult)) {
          emailed++;
          await admin
            .from("shipments")
            .update({
              metadata: {
                ...existingMetadata,
                provider: "amazon_mcf",
                source: "tracking_sheet_import",
                email_sent_at: new Date().toISOString(),
              },
              updated_on: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          errors.push(`${orderNumber}: ${emailResult}`);
        }
      }

      skipped++;
      continue;
    }

    const { error: shipmentError } = await admin.from("shipments").insert({
      order_id: order.id,
      carrier: row.carrier,
      tracking_number: trackingNumber,
      tracking_url: row.trackingUrl || null,
      service_level: row.serviceLevel || null,
      status: "in_transit",
      estimated_delivery: estimatedDelivery,
      shipped_on: new Date().toISOString(),
      last_event_at: new Date().toISOString(),
      metadata: { provider: "amazon_mcf", source: "tracking_sheet_import" },
    });

    if (shipmentError) {
      skipped++;
      errors.push(`${orderNumber}: ${shipmentError.message}`);
      continue;
    }

    await admin
      .from("orders")
      .update({
        status: "shipped",
        fulfillment_status: "shipped",
        fulfillment_routing_status: "completed",
        fulfillment_error: null,
        updated_on: new Date().toISOString(),
      })
      .eq("id", order.id);

    await admin.from("order_status_history").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: "shipped",
      source: "amazon_mcf_import",
      reason: "Amazon MCF tracking imported",
    });

    const emailResult = await emailShipmentToCustomer({
      orderId: String(order.id),
      carrier: row.carrier,
      trackingNumber,
      trackingUrl: row.trackingUrl,
      serviceLevel: row.serviceLevel,
      estimatedDelivery: estimatedDelivery ?? "",
    });

    if (/Customer emailed/i.test(emailResult)) {
      emailed++;
      const { data: createdShipment } = await admin
        .from("shipments")
        .select("id, metadata")
        .eq("order_id", order.id)
        .eq("tracking_number", trackingNumber)
        .maybeSingle();

      if (createdShipment) {
        const metadata =
          createdShipment.metadata && typeof createdShipment.metadata === "object"
            ? (createdShipment.metadata as Record<string, unknown>)
            : {};

        await admin
          .from("shipments")
          .update({
            metadata: {
              ...metadata,
              provider: "amazon_mcf",
              source: "tracking_sheet_import",
              email_sent_at: new Date().toISOString(),
            },
            updated_on: new Date().toISOString(),
          })
          .eq("id", createdShipment.id);
      }
    } else {
      errors.push(`${orderNumber}: ${emailResult}`);
    }

    imported++;
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/fulfillment");
  revalidatePath("/account/orders");

  return {
    rows: rows.length,
    imported,
    emailed,
    skipped,
    errors: errors.slice(0, 25),
  };
}

// Instant on/off for Uber same-day delivery (no Save button needed).
export async function setUberEnabled(enabled: boolean) {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("fulfillment_settings")
    .update({ uber_enabled: enabled })
    .eq("id", 1)
    .select("uber_enabled")
    .single();
  if (error) {
    throw new Error(`${error.message}. Run database/uber_toggle.sql in Supabase first.`);
  }
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  revalidatePath("/admin/fulfillment");
  return Boolean(data?.uber_enabled);
}

