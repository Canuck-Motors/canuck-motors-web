import { createAdminClient } from "@/lib/supabase/admin";

type FulfillmentResult = {
  processed: number;
  succeeded: number;
  failed: number;
};

type Address = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

async function getAmazonAccessToken() {
  const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Amazon SP-API credentials are not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || "Unable to obtain Amazon SP-API access token.");
  }

  return String(payload.access_token);
}

function amazonEndpoint() {
  return (process.env.AMAZON_SP_API_ENDPOINT || "https://sellingpartnerapi-na.amazon.com").replace(/\/$/, "");
}

function marketplaceId() {
  return process.env.AMAZON_SP_API_MARKETPLACE_ID || "A2EUQ1WTGCTBG2";
}

async function submitAmazonMcfOrder(orderId: string) {
  const admin = createAdminClient();

  const [{ data: order, error: orderError }, { data: settings, error: settingsError }] =
    await Promise.all([
      admin
        .from("orders")
        .select(
          "id, order_number, customer_email, customer_name, shipping_address, created_on, order_items(id, product_id, sku, product_name, quantity, cancelled_on)"
        )
        .eq("id", orderId)
        .single(),
      admin
        .from("fulfillment_settings")
        .select("amazon_shipping_speed")
        .eq("id", 1)
        .single(),
    ]);

  if (orderError || !order) throw new Error("Order could not be loaded for Amazon MCF.");
  if (settingsError || !settings) throw new Error("Fulfillment settings could not be loaded.");

  const items = (order.order_items ?? []).filter((item: any) => !item.cancelled_on);
  if (!items.length) throw new Error("Order has no active items to fulfill.");

  const amazonItems = items.map((item: any) => {
    if (!String(item.sku || "").trim()) {
      throw new Error(`Product ${item.product_name || item.product_id} has no SKU.`);
    }

    return {
      sellerSku: String(item.sku).trim(),
      sellerFulfillmentOrderItemId: String(item.id),
      quantity: Number(item.quantity),
    };
  });

  const address = (order.shipping_address ?? {}) as Address;
  if (
    !address.line1 ||
    !address.city ||
    !address.province ||
    !address.postal_code ||
    !address.country
  ) {
    throw new Error("A complete shipping address is required for Amazon MCF.");
  }

  const token = await getAmazonAccessToken();
  const sellerFulfillmentOrderId = String(order.order_number);

  const payload = {
    marketplaceId: marketplaceId(),
    sellerFulfillmentOrderId,
    displayableOrderId: String(order.order_number),
    displayableOrderDate: new Date(order.created_on).toISOString(),
    displayableOrderComment: "Canuck Motors order",
    shippingSpeedCategory: String(settings.amazon_shipping_speed || "Standard"),
    fulfillmentAction: "Ship",
    destinationAddress: {
      name: address.name || order.customer_name || "Customer",
      addressLine1: address.line1,
      ...(address.line2 ? { addressLine2: address.line2 } : {}),
      city: address.city,
      stateOrRegion: address.province,
      postalCode: address.postal_code,
      countryCode: address.country,
    },
    notificationEmails: order.customer_email ? [String(order.customer_email)] : [],
    items: amazonItems,
  };

  const response = await fetch(
    `${amazonEndpoint()}/fba/outbound/2020-07-01/fulfillmentOrders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-amz-access-token": token,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  const responseText = await response.text();
  let responseJson: any = null;
  try {
    responseJson = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseJson = { raw: responseText.slice(0, 2000) };
  }

  if (!response.ok) {
    const message =
      responseJson?.errors?.[0]?.message ||
      responseJson?.message ||
      `Amazon MCF request failed with status ${response.status}.`;
    throw new Error(String(message));
  }

  return {
    sellerFulfillmentOrderId,
    payload,
    response: responseJson,
  };
}

async function fallbackOrFail(orderId: string, jobId: string, attempts: number, error: Error) {
  const admin = createAdminClient();

  if (attempts < 3) {
    const retryAt = new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString();
    await admin
      .from("fulfillment_jobs")
      .update({
        status: "pending",
        attempts,
        next_attempt_on: retryAt,
        last_error: error.message.slice(0, 2000),
        updated_on: new Date().toISOString(),
      })
      .eq("id", jobId);

    await admin
      .from("orders")
      .update({
        fulfillment_routing_status: "queued",
        fulfillment_error: error.message.slice(0, 2000),
        updated_on: new Date().toISOString(),
      })
      .eq("id", orderId);

    return;
  }

  const { data: settings } = await admin
    .from("fulfillment_settings")
    .select("delivery_partner_enabled")
    .eq("id", 1)
    .single();

  if (settings?.delivery_partner_enabled) {
    await admin.rpc("route_order_fulfillment", { p_order_id: orderId });

    const { data: routedOrder } = await admin
      .from("orders")
      .select("fulfillment_provider")
      .eq("id", orderId)
      .single();

    if (routedOrder?.fulfillment_provider !== "delivery_partner") {
      await admin
        .from("orders")
        .update({
          fulfillment_provider: "delivery_partner",
          fulfillment_routing_status: "ready",
          fulfillment_error: `Amazon MCF failed after 3 attempts: ${error.message.slice(0, 1200)}`,
          fulfillment_routed_on: new Date().toISOString(),
          updated_on: new Date().toISOString(),
        })
        .eq("id", orderId);

      await admin
        .from("fulfillment_jobs")
        .update({
          provider: "delivery_partner",
          status: "ready",
          attempts,
          last_error: error.message.slice(0, 2000),
          updated_on: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
  } else {
    await admin
      .from("fulfillment_jobs")
      .update({
        status: "failed",
        attempts,
        last_error: error.message.slice(0, 2000),
        updated_on: new Date().toISOString(),
      })
      .eq("id", jobId);

    await admin
      .from("orders")
      .update({
        fulfillment_routing_status: "error",
        fulfillment_error: error.message.slice(0, 2000),
        updated_on: new Date().toISOString(),
      })
      .eq("id", orderId);
  }

  await admin.from("fulfillment_events").insert({
    order_id: orderId,
    provider: "amazon_mcf",
    event_type: "submission_failed",
    detail: error.message.slice(0, 2000),
  });
}

export async function processFulfillmentQueue(limit = 25): Promise<FulfillmentResult> {
  const admin = createAdminClient();
  const cappedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));

  const { data: jobs, error } = await admin
    .from("fulfillment_jobs")
    .select("id, order_id, attempts")
    .eq("provider", "amazon_mcf")
    .eq("status", "pending")
    .lte("next_attempt_on", new Date().toISOString())
    .order("created_on", { ascending: true })
    .limit(cappedLimit);

  if (error) throw new Error(error.message);

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const attempts = Number(job.attempts ?? 0) + 1;

    const { data: claimed } = await admin
      .from("fulfillment_jobs")
      .update({
        status: "processing",
        attempts,
        updated_on: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    // Uber same-day orders are delivered by an Uber courier, never by Amazon.
    const { data: jobOrder } = await admin
      .from("orders")
      .select("delivery_method")
      .eq("id", job.order_id)
      .maybeSingle();
    if (jobOrder?.delivery_method === "uber") {
      await admin
        .from("fulfillment_jobs")
        .update({
          status: "failed",
          last_error: "Skipped: this order is delivered by Uber same-day.",
          updated_on: new Date().toISOString(),
        })
        .eq("id", job.id);
      continue;
    }

    try {
      const submitted = await submitAmazonMcfOrder(String(job.order_id));

      await admin
        .from("fulfillment_jobs")
        .update({
          status: "succeeded",
          provider_order_id: submitted.sellerFulfillmentOrderId,
          last_error: null,
          payload: submitted.response ?? {},
          updated_on: new Date().toISOString(),
        })
        .eq("id", job.id);

      await admin
        .from("orders")
        .update({
          fulfillment_provider: "amazon_mcf",
          fulfillment_provider_order_id: submitted.sellerFulfillmentOrderId,
          fulfillment_routing_status: "submitted",
          fulfillment_error: null,
          updated_on: new Date().toISOString(),
        })
        .eq("id", job.order_id);

      await admin.from("fulfillment_events").insert({
        order_id: job.order_id,
        provider: "amazon_mcf",
        event_type: "submitted",
        detail: "Order submitted to Amazon MCF.",
        payload: submitted.response ?? {},
      });

      succeeded += 1;
    } catch (caught) {
      const err = caught instanceof Error ? caught : new Error("Amazon MCF submission failed.");
      await fallbackOrFail(String(job.order_id), String(job.id), attempts, err);
      failed += 1;
    }
  }

  return {
    processed: (jobs ?? []).length,
    succeeded,
    failed,
  };
}


async function fetchAmazonFulfillmentOrder(sellerFulfillmentOrderId: string) {
  const token = await getAmazonAccessToken();
  const response = await fetch(
    `${amazonEndpoint()}/fba/outbound/2020-07-01/fulfillmentOrders/${encodeURIComponent(
      sellerFulfillmentOrderId
    )}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-amz-access-token": token,
      },
      cache: "no-store",
    }
  );

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 2000) };
  }

  if (!response.ok) {
    const message =
      json?.errors?.[0]?.message ||
      json?.message ||
      `Amazon MCF status request failed with status ${response.status}.`;
    throw new Error(String(message));
  }

  return json;
}

function normalizeAmazonOrderState(status: string) {
  const value = status.toLowerCase();
  if (["invalid", "cancelled", "unfulfillable"].includes(value)) {
    return { routing: "error", order: "exception", fulfillment: "unfulfilled" };
  }
  if (["complete", "completepartialled"].includes(value)) {
    return { routing: "completed", order: "shipped", fulfillment: "shipped" };
  }
  if (["processing", "planning", "received"].includes(value)) {
    return { routing: "submitted", order: "processing", fulfillment: "processing" };
  }
  return { routing: "submitted", order: null, fulfillment: null };
}

export async function syncAmazonMcfOrders(limit = 50) {
  const admin = createAdminClient();
  const capped = Math.max(1, Math.min(100, Math.trunc(limit)));

  const { data: orders, error } = await admin
    .from("orders")
    .select(
      "id, order_number, status, fulfillment_status, fulfillment_provider_order_id, fulfillment_routing_status"
    )
    .eq("fulfillment_provider", "amazon_mcf")
    .in("fulfillment_routing_status", ["submitted", "queued"])
    .order("updated_on", { ascending: true })
    .limit(capped);

  if (error) throw new Error(error.message);

  let synced = 0;
  let failed = 0;

  for (const order of orders ?? []) {
    const providerOrderId = String(
      order.fulfillment_provider_order_id || order.order_number
    );

    try {
      const response = await fetchAmazonFulfillmentOrder(providerOrderId);
      const payload = response?.payload ?? {};
      const amazonStatus = String(payload.fulfillmentOrder?.fulfillmentOrderStatus || "");
      const normalized = normalizeAmazonOrderState(amazonStatus);

      const orderPatch: Record<string, unknown> = {
        fulfillment_routing_status: normalized.routing,
        fulfillment_error: null,
        updated_on: new Date().toISOString(),
      };

      if (normalized.order && !["delivered", "cancelled", "refunded"].includes(String(order.status))) {
        orderPatch.status = normalized.order;
      }
      if (
        normalized.fulfillment &&
        !["delivered", "cancelled"].includes(String(order.fulfillment_status))
      ) {
        orderPatch.fulfillment_status = normalized.fulfillment;
      }

      await admin.from("orders").update(orderPatch).eq("id", order.id);

      const shipments = payload.fulfillmentShipments ?? [];
      for (const shipment of shipments) {
        const amazonShipmentId = String(shipment.amazonShipmentId || "");
        const shipmentStatus = String(shipment.fulfillmentShipmentStatus || "");
        const packages = shipment.fulfillmentShipmentPackage ?? [];

        for (const pkg of packages) {
          const carrier = String(pkg.carrierCode || "Amazon MCF");
          const tracking = String(pkg.trackingNumber || "");
          if (!tracking) continue;

          const status =
            shipmentStatus.toLowerCase() === "shipped" ? "in_transit" : "label_created";

          const row = {
            order_id: order.id,
            carrier,
            tracking_number: tracking,
            tracking_url: null,
            status,
            estimated_delivery: shipment.estimatedArrivalDateTime || null,
            shipped_on:
              shipmentStatus.toLowerCase() === "shipped"
                ? shipment.shippingDateTime || new Date().toISOString()
                : null,
            external_shipment_id: amazonShipmentId
              ? `${amazonShipmentId}:${String(pkg.packageNumber ?? 1)}`
              : null,
            metadata: {
              provider: "amazon_mcf",
              amazon_shipment_id: amazonShipmentId || null,
              package_number: pkg.packageNumber ?? null,
              fulfillment_order_status: amazonStatus || null,
            },
            updated_on: new Date().toISOString(),
          };

          await admin.from("shipments").upsert(row, {
            onConflict: "carrier,tracking_number",
          });
        }
      }

      await admin.from("fulfillment_events").insert({
        order_id: order.id,
        provider: "amazon_mcf",
        event_type: "status_sync",
        detail: amazonStatus
          ? `Amazon MCF status synchronized: ${amazonStatus}.`
          : "Amazon MCF status synchronized.",
        payload: {
          fulfillment_order_status: amazonStatus || null,
          shipment_count: shipments.length,
        },
      });

      synced += 1;
    } catch (caught) {
      failed += 1;
      const message =
        caught instanceof Error ? caught.message : "Amazon MCF synchronization failed.";

      await admin
        .from("orders")
        .update({
          fulfillment_error: message.slice(0, 2000),
          updated_on: new Date().toISOString(),
        })
        .eq("id", order.id);
    }
  }

  return { processed: (orders ?? []).length, synced, failed };
}


type AmazonPackageTrackingDetails = {
  packageNumber?: number;
  trackingNumber?: string;
  customerTrackingLink?: string;
  carrierCode?: string;
  carrierURL?: string;
  shipDate?: string;
  estimatedArrivalDate?: string;
  currentStatus?: string;
  currentStatusDescription?: string;
  signedForBy?: string;
  additionalLocationInfo?: string;
  trackingEvents?: Array<{
    eventDate?: string;
    eventCode?: string;
    eventDescription?: string;
  }>;
};

async function fetchAmazonPackageTrackingDetails(packageNumber: number) {
  const token = await getAmazonAccessToken();
  const url = new URL(`${amazonEndpoint()}/fba/outbound/2020-07-01/tracking`);
  url.searchParams.set("packageNumber", String(packageNumber));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-amz-access-token": token,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 2000) };
  }

  if (!response.ok) {
    const message =
      json?.errors?.[0]?.message ||
      json?.message ||
      `Amazon package tracking request failed with status ${response.status}.`;
    throw new Error(String(message));
  }

  return (json?.payload ?? {}) as AmazonPackageTrackingDetails;
}

function normalizePackageStatus(value: string) {
  const status = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (status.includes("DELIVERED")) {
    return {
      shipment: "delivered",
      order: "delivered",
      fulfillment: "delivered",
    };
  }

  if (status.includes("OUT_FOR_DELIVERY")) {
    return {
      shipment: "out_for_delivery",
      order: "out_for_delivery",
      fulfillment: "out_for_delivery",
    };
  }

  if (
    status.includes("UNDELIVERABLE") ||
    status.includes("RETURNED") ||
    status.includes("RETURN_TO_SENDER")
  ) {
    return {
      shipment: "exception",
      order: "exception",
      fulfillment: "exception",
    };
  }

  if (status.includes("DELAY")) {
    return {
      shipment: "delayed",
      order: "shipped",
      fulfillment: "shipped",
    };
  }

  return {
    shipment: "in_transit",
    order: "shipped",
    fulfillment: "shipped",
  };
}

function latestTrackingEventDate(details: AmazonPackageTrackingDetails) {
  const dates = (details.trackingEvents ?? [])
    .map((event) => event.eventDate)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => Number.isFinite(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0]?.toISOString() ?? null;
}

export async function syncAmazonMcfPackageTracking(limit = 50) {
  const admin = createAdminClient();
  const capped = Math.max(1, Math.min(100, Math.trunc(limit)));

  const { data: orders, error } = await admin
    .from("orders")
    .select(
      "id, order_number, status, fulfillment_status, fulfillment_provider_order_id, delivered_on"
    )
    .eq("fulfillment_provider", "amazon_mcf")
    .in("fulfillment_status", ["shipped", "out_for_delivery", "exception"])
    .order("updated_on", { ascending: true })
    .limit(capped);

  if (error) throw new Error(error.message);

  let synced = 0;
  let delivered = 0;
  let failed = 0;

  for (const order of orders ?? []) {
    const providerOrderId = String(
      order.fulfillment_provider_order_id || order.order_number
    );

    try {
      const fulfillmentResponse = await fetchAmazonFulfillmentOrder(providerOrderId);
      const shipments = fulfillmentResponse?.payload?.fulfillmentShipments ?? [];
      const packageStates: Array<{
        status: string;
        deliveredOn: string | null;
      }> = [];

      for (const shipment of shipments) {
        const amazonShipmentId = String(shipment.amazonShipmentId || "");
        const packages = shipment.fulfillmentShipmentPackage ?? [];

        for (const pkg of packages) {
          const packageNumber = Number(pkg.packageNumber);
          if (!Number.isInteger(packageNumber) || packageNumber < 0) continue;

          const details = await fetchAmazonPackageTrackingDetails(packageNumber);
          const currentStatus = String(details.currentStatus || "");
          const normalized = normalizePackageStatus(currentStatus);
          const trackingNumber = String(
            details.trackingNumber || pkg.trackingNumber || ""
          ).trim();
          const carrier = String(
            details.carrierCode || pkg.carrierCode || "Amazon MCF"
          );

          const deliveredOn =
            normalized.shipment === "delivered"
              ? latestTrackingEventDate(details) || new Date().toISOString()
              : null;

          packageStates.push({
            status: normalized.shipment,
            deliveredOn,
          });

          if (!trackingNumber) continue;

          const { data: existing } = await admin
            .from("shipments")
            .select("id, metadata, tracking_url, delivered_on")
            .eq("order_id", order.id)
            .eq("tracking_number", trackingNumber)
            .maybeSingle();

          const metadata =
            existing?.metadata && typeof existing.metadata === "object"
              ? (existing.metadata as Record<string, unknown>)
              : {};

          const patch = {
            order_id: order.id,
            carrier,
            tracking_number: trackingNumber,
            tracking_url:
              details.customerTrackingLink ||
              existing?.tracking_url ||
              details.carrierURL ||
              null,
            status: normalized.shipment,
            estimated_delivery:
              details.estimatedArrivalDate ||
              shipment.estimatedArrivalDateTime ||
              null,
            shipped_on: details.shipDate || shipment.shippingDateTime || null,
            delivered_on: deliveredOn || existing?.delivered_on || null,
            external_shipment_id: amazonShipmentId
              ? `${amazonShipmentId}:${packageNumber}`
              : null,
            last_event_at: latestTrackingEventDate(details),
            metadata: {
              ...metadata,
              provider: "amazon_mcf",
              amazon_shipment_id: amazonShipmentId || null,
              package_number: packageNumber,
              amazon_tracking_status: currentStatus || null,
              amazon_tracking_description:
                details.currentStatusDescription || null,
              signed_for_by: details.signedForBy || null,
              additional_location_info:
                details.additionalLocationInfo || null,
              tracking_events: (details.trackingEvents ?? []).slice(-25),
              tracking_synced_at: new Date().toISOString(),
            },
            updated_on: new Date().toISOString(),
          };

          if (existing?.id) {
            await admin.from("shipments").update(patch).eq("id", existing.id);
          } else {
            await admin.from("shipments").insert(patch);
          }
        }
      }

      if (!packageStates.length) {
        synced += 1;
        continue;
      }

      const allDelivered = packageStates.every(
        (state) => state.status === "delivered"
      );
      const anyOutForDelivery = packageStates.some(
        (state) => state.status === "out_for_delivery"
      );
      const anyException = packageStates.some(
        (state) => state.status === "exception"
      );
      const anyDelayed = packageStates.some(
        (state) => state.status === "delayed"
      );

      let nextOrderStatus = "shipped";
      let nextFulfillmentStatus = "shipped";

      if (allDelivered) {
        nextOrderStatus = "delivered";
        nextFulfillmentStatus = "delivered";
      } else if (anyException) {
        nextOrderStatus = "exception";
        nextFulfillmentStatus = "exception";
      } else if (anyOutForDelivery) {
        nextOrderStatus = "out_for_delivery";
        nextFulfillmentStatus = "out_for_delivery";
      }

      const deliveredOn = allDelivered
        ? packageStates
            .map((state) => state.deliveredOn)
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1) || new Date().toISOString()
        : null;

      const previousStatus = String(order.status || "");
      const orderPatch: Record<string, unknown> = {
        status: nextOrderStatus,
        fulfillment_status: nextFulfillmentStatus,
        fulfillment_error: anyDelayed
          ? "Amazon reports a delivery delay."
          : anyException
            ? "Amazon reports a delivery exception."
            : null,
        updated_on: new Date().toISOString(),
      };

      if (allDelivered) {
        orderPatch.delivered_on = deliveredOn;
        orderPatch.fulfillment_routing_status = "completed";
      }

      await admin.from("orders").update(orderPatch).eq("id", order.id);

      if (previousStatus !== nextOrderStatus) {
        await admin.from("order_status_history").insert({
          order_id: order.id,
          from_status: previousStatus,
          to_status: nextOrderStatus,
          source: "amazon_mcf_tracking",
          reason: allDelivered
            ? "Amazon package tracking reports all packages delivered."
            : anyOutForDelivery
              ? "Amazon package tracking reports package out for delivery."
              : anyException
                ? "Amazon package tracking reports delivery exception."
                : anyDelayed
                  ? "Amazon package tracking reports delivery delay."
                  : "Amazon package tracking synchronized.",
        });
      }

      await admin.from("fulfillment_events").insert({
        order_id: order.id,
        provider: "amazon_mcf",
        event_type: "package_tracking_sync",
        detail: allDelivered
          ? "All Amazon MCF packages delivered."
          : anyOutForDelivery
            ? "Amazon MCF package out for delivery."
            : anyException
              ? "Amazon MCF delivery exception."
              : anyDelayed
                ? "Amazon MCF delivery delayed."
                : "Amazon MCF package tracking synchronized.",
        payload: {
          packages: packageStates,
          delivered_on: deliveredOn,
        },
      });

      if (allDelivered && previousStatus !== "delivered") delivered += 1;
      synced += 1;
    } catch (caught) {
      failed += 1;
      const message =
        caught instanceof Error
          ? caught.message
          : "Amazon MCF package tracking synchronization failed.";

      await admin
        .from("orders")
        .update({
          fulfillment_error: message.slice(0, 2000),
          updated_on: new Date().toISOString(),
        })
        .eq("id", order.id);
    }
  }

  return {
    processed: (orders ?? []).length,
    synced,
    delivered,
    failed,
  };
}
