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

  const productIds = items.map((item: any) => Number(item.product_id));
  const { data: mappings, error: mappingError } = await admin
    .from("product_fulfillment_settings")
    .select("product_id, amazon_sku, amazon_mcf_eligible")
    .in("product_id", productIds);

  if (mappingError) throw new Error(mappingError.message);

  const byProduct = new Map(
    (mappings ?? []).map((row: any) => [Number(row.product_id), row])
  );

  const amazonItems = items.map((item: any) => {
    const mapping = byProduct.get(Number(item.product_id));
    if (!mapping?.amazon_mcf_eligible || !mapping.amazon_sku) {
      throw new Error(`Product ${item.sku} is not configured for Amazon MCF.`);
    }

    return {
      sellerSku: String(mapping.amazon_sku),
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
