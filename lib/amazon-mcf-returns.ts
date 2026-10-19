import { createAdminClient } from "@/lib/supabase/admin";

type AmazonReason = {
  returnReasonCode: string;
  description?: string;
  translatedDescription?: string;
};

type AmazonReturnItem = {
  sellerReturnItemId: string;
  sellerFulfillmentOrderItemId: string;
  amazonShipmentId: string;
  sellerReturnReasonCode: string;
  amazonReturnReasonCode?: string | null;
  status: string;
  statusChangedDate: string;
  returnAuthorizationId?: string | null;
  returnReceivedCondition?: string | null;
  fulfillmentCenterId?: string | null;
};

type AmazonAuthorization = {
  returnAuthorizationId: string;
  fulfillmentCenterId: string;
  returnToAddress: Record<string, unknown>;
  amazonRmaId: string;
  rmaPageURL: string;
};

async function getAmazonAccessToken() {
  const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Amazon SP-API credentials are not configured.");
  }

  const response = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || "Unable to obtain Amazon access token.");
  }

  return String(payload.access_token);
}

function endpoint() {
  return (process.env.AMAZON_SP_API_ENDPOINT || "https://sellingpartnerapi-na.amazon.com").replace(/\/$/, "");
}

function marketplaceId() {
  return process.env.AMAZON_SP_API_MARKETPLACE_ID || "A2EUQ1WTGCTBG2";
}

async function amazonRequest(path: string, init: RequestInit = {}) {
  const token = await getAmazonAccessToken();
  const response = await fetch(`${endpoint()}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "x-amz-access-token": token,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
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
      `Amazon SP-API request failed with status ${response.status}.`;
    throw new Error(String(message));
  }

  return json;
}

export async function getAmazonReturnReasons(
  amazonSellerSku: string,
  sellerFulfillmentOrderId: string
): Promise<AmazonReason[]> {
  const query = new URLSearchParams({
    sellerSku: amazonSellerSku,
    marketplaceId: marketplaceId(),
    sellerFulfillmentOrderId,
    language: "en_CA",
  });

  const payload = await amazonRequest(
    `/fba/outbound/2020-07-01/returnReasonCodes?${query.toString()}`
  );

  return (payload?.payload?.reasonCodeDetails ?? []) as AmazonReason[];
}

function chooseReason(internalReason: string, reasons: AmazonReason[]) {
  if (!reasons.length) {
    throw new Error("Amazon did not return any valid return reason codes.");
  }

  const keywords: Record<string, string[]> = {
    damaged: ["damage", "damaged"],
    wrong_item: ["wrong", "incorrect", "different"],
    not_compatible: ["compatible", "fit", "fitment", "suitable"],
    defective: ["defect", "defective", "not work", "does not work", "fault"],
    changed_mind: ["no longer", "changed", "unwanted", "not needed"],
    other: ["other", "other reason"],
  };

  const words = keywords[internalReason] ?? keywords.other;
  const matched = reasons.find((reason) => {
    const text = `${reason.description ?? ""} ${reason.translatedDescription ?? ""}`.toLowerCase();
    return words.some((word) => text.includes(word));
  });

  return matched ?? reasons[0];
}

async function getAmazonFulfillmentOrder(sellerFulfillmentOrderId: string) {
  return amazonRequest(
    `/fba/outbound/2020-07-01/fulfillmentOrders/${encodeURIComponent(
      sellerFulfillmentOrderId
    )}`
  );
}

function findAmazonShipmentId(
  fulfillmentPayload: any,
  sellerFulfillmentOrderItemId: string
) {
  for (const shipment of fulfillmentPayload?.payload?.fulfillmentShipments ?? []) {
    const items = shipment?.fulfillmentShipmentItem ?? [];
    if (
      items.some(
        (item: any) =>
          String(item.sellerFulfillmentOrderItemId) === sellerFulfillmentOrderItemId
      )
    ) {
      return String(shipment.amazonShipmentId || "");
    }
  }
  return "";
}

export async function createAmazonMcfReturn(requestId: string) {
  const admin = createAdminClient();

  const { data: request, error } = await admin
    .from("return_requests")
    .select(
      "id, order_id, request_type, status, reason_code, reason_text, fulfillment_provider, amazon_return_status, orders!order_id(order_number, fulfillment_provider, fulfillment_provider_order_id), return_request_items(id, order_item_id, quantity, order_items!inner(id, product_id, sku))"
    )
    .eq("id", requestId)
    .single();

  if (error || !request) throw new Error("Return request could not be loaded.");

  const order = Array.isArray(request.orders) ? request.orders[0] : request.orders;
  if (!order || order.fulfillment_provider !== "amazon_mcf") {
    throw new Error("This order was not fulfilled by Amazon MCF.");
  }

  if (request.request_type !== "return") {
    throw new Error("Amazon MCF return authorization is currently available for returns, not exchange replacements.");
  }

  if (request.status !== "approved") {
    throw new Error("Approve the return request before creating the Amazon MCF return authorization.");
  }

  if (request.amazon_return_status && request.amazon_return_status !== "error") {
    throw new Error("An Amazon MCF return has already been created for this request.");
  }

  const sellerFulfillmentOrderId =
    String(order.fulfillment_provider_order_id || order.order_number || "").trim();
  if (!sellerFulfillmentOrderId) {
    throw new Error("Amazon fulfillment order ID is unavailable.");
  }

  const returnRows = (request.return_request_items ?? []) as any[];
  if (!returnRows.length) throw new Error("No items are present on this return request.");

  const productIds = returnRows
    .map((row) => {
      const oi = Array.isArray(row.order_items) ? row.order_items[0] : row.order_items;
      return Number(oi?.product_id);
    })
    .filter((id) => Number.isInteger(id) && id > 0);

  const { data: mappings, error: mappingError } = await admin
    .from("product_fulfillment_settings")
    .select("product_id, amazon_mcf_eligible")
    .in("product_id", productIds);

  if (mappingError) throw new Error(mappingError.message);

  const mappingByProduct = new Map(
    (mappings ?? []).map((mapping) => [Number(mapping.product_id), mapping])
  );

  const fulfillmentOrder = await getAmazonFulfillmentOrder(sellerFulfillmentOrderId);
  const createItems: any[] = [];
  const prepared: Array<{
    returnRequestItemId: number;
    amazonSku: string;
    reasonCode: string;
    amazonShipmentId: string;
    sellerReturnItemId: string;
  }> = [];

  for (const row of returnRows) {
    const oi = Array.isArray(row.order_items) ? row.order_items[0] : row.order_items;
    const productId = Number(oi?.product_id);
    const mapping = mappingByProduct.get(productId);

    if (!mapping?.amazon_mcf_eligible) {
      throw new Error(`Product ${oi?.sku || productId} is not enabled for Amazon MCF returns.`);
    }
    if (!String(oi?.sku || "").trim()) {
      throw new Error(`Product ${productId} has no SKU.`);
    }

    const sellerFulfillmentOrderItemId = String(row.order_item_id);
    const amazonShipmentId = findAmazonShipmentId(
      fulfillmentOrder,
      sellerFulfillmentOrderItemId
    );

    if (!amazonShipmentId) {
      throw new Error(
        `Amazon shipment ID could not be found for item ${oi?.sku || sellerFulfillmentOrderItemId}.`
      );
    }

    const reasons = await getAmazonReturnReasons(
      String(oi.sku).trim(),
      sellerFulfillmentOrderId
    );
    const chosen = chooseReason(String(request.reason_code), reasons);
    const sellerReturnItemId = `${String(request.id).replaceAll("-", "")}-${row.id}`.slice(
      0,
      80
    );

    createItems.push({
      sellerReturnItemId,
      sellerFulfillmentOrderItemId,
      amazonShipmentId,
      returnReasonCode: chosen.returnReasonCode,
      returnComment: String(request.reason_text || "").slice(0, 1000),
    });

    prepared.push({
      returnRequestItemId: Number(row.id),
      amazonSku: String(oi.sku).trim(),
      reasonCode: chosen.returnReasonCode,
      amazonShipmentId,
      sellerReturnItemId,
    });
  }

  const response = await amazonRequest(
    `/fba/outbound/2020-07-01/fulfillmentOrders/${encodeURIComponent(
      sellerFulfillmentOrderId
    )}/return`,
    {
      method: "PUT",
      body: JSON.stringify({ items: createItems }),
    }
  );

  const payload = response?.payload ?? {};
  const invalid = payload.invalidReturnItems ?? [];
  if (invalid.length) {
    const detail = invalid
      .map(
        (item: any) =>
          `${item.sellerReturnItemId}: ${item.invalidItemReason?.description || item.invalidItemReason?.invalidItemReasonCode || "invalid"}`
      )
      .join("; ");
    throw new Error(`Amazon rejected one or more return items: ${detail}`);
  }

  const returnItems = (payload.returnItems ?? []) as AmazonReturnItem[];
  const authorizations = (payload.returnAuthorizations ?? []) as AmazonAuthorization[];
  const firstAuthorization = authorizations[0];

  for (const item of returnItems) {
    await admin
      .from("return_request_items")
      .update({
        amazon_seller_sku:
          prepared.find((p) => p.sellerReturnItemId === item.sellerReturnItemId)
            ?.amazonSku ?? null,
        amazon_return_reason_code: item.sellerReturnReasonCode,
        amazon_shipment_id: item.amazonShipmentId,
        amazon_seller_return_item_id: item.sellerReturnItemId,
        amazon_return_item_status: item.status,
        amazon_return_condition: item.returnReceivedCondition ?? null,
        amazon_fulfillment_center_id: item.fulfillmentCenterId ?? null,
        amazon_status_changed_on: item.statusChangedDate ?? null,
      })
      .eq(
        "id",
        prepared.find((p) => p.sellerReturnItemId === item.sellerReturnItemId)
          ?.returnRequestItemId
      );
  }

  await admin
    .from("return_requests")
    .update({
      fulfillment_provider: "amazon_mcf",
      amazon_return_status: "authorized",
      amazon_rma_id: firstAuthorization?.amazonRmaId ?? null,
      amazon_rma_page_url: firstAuthorization?.rmaPageURL ?? null,
      amazon_return_authorization_id:
        firstAuthorization?.returnAuthorizationId ?? null,
      amazon_return_to_address: firstAuthorization?.returnToAddress ?? null,
      amazon_return_created_on: new Date().toISOString(),
      amazon_return_synced_on: new Date().toISOString(),
      amazon_return_error: null,
      status: "label_issued",
      resolution_notes:
        "Amazon MCF return authorization created. Use the Amazon RMA page for the return barcode and mailing label.",
      updated_on: new Date().toISOString(),
    })
    .eq("id", requestId);

  await admin.from("fulfillment_events").insert({
    order_id: request.order_id,
    provider: "amazon_mcf",
    event_type: "return_authorized",
    detail: "Amazon MCF return authorization created.",
    payload: {
      return_request_id: requestId,
      amazon_rma_id: firstAuthorization?.amazonRmaId ?? null,
      return_authorization_id:
        firstAuthorization?.returnAuthorizationId ?? null,
    },
  });

  return {
    amazonRmaId: firstAuthorization?.amazonRmaId ?? "",
    rmaPageUrl: firstAuthorization?.rmaPageURL ?? "",
  };
}

export async function syncAmazonMcfReturn(requestId: string) {
  const admin = createAdminClient();
  const { data: request, error } = await admin
    .from("return_requests")
    .select(
      "id, order_id, amazon_return_status, orders!order_id(order_number, fulfillment_provider, fulfillment_provider_order_id)"
    )
    .eq("id", requestId)
    .single();

  if (error || !request) throw new Error("Return request could not be loaded.");

  const order = Array.isArray(request.orders) ? request.orders[0] : request.orders;
  if (!order || order.fulfillment_provider !== "amazon_mcf") {
    throw new Error("This order was not fulfilled by Amazon MCF.");
  }

  const sellerFulfillmentOrderId = String(
    order.fulfillment_provider_order_id || order.order_number
  );
  const fulfillmentOrder = await getAmazonFulfillmentOrder(
    sellerFulfillmentOrderId
  );
  const returnItems = (fulfillmentOrder?.payload?.returnItems ?? []) as AmazonReturnItem[];
  const authorizations = (fulfillmentOrder?.payload?.returnAuthorizations ??
    []) as AmazonAuthorization[];

  const { data: rows } = await admin
    .from("return_request_items")
    .select("id, amazon_seller_return_item_id")
    .eq("return_request_id", requestId);

  const bySellerId = new Map(
    (rows ?? []).map((row) => [String(row.amazon_seller_return_item_id || ""), row])
  );

  for (const item of returnItems) {
    const local = bySellerId.get(item.sellerReturnItemId);
    if (!local) continue;

    await admin
      .from("return_request_items")
      .update({
        amazon_return_item_status: item.status,
        amazon_return_reason_code: item.sellerReturnReasonCode,
        amazon_return_condition: item.returnReceivedCondition ?? null,
        amazon_fulfillment_center_id: item.fulfillmentCenterId ?? null,
        amazon_status_changed_on: item.statusChangedDate ?? null,
      })
      .eq("id", local.id);
  }

  const matched = returnItems.filter((item) =>
    bySellerId.has(item.sellerReturnItemId)
  );
  const received = matched.length > 0 && matched.every((item) =>
    /received|processed|completed/i.test(item.status)
  );

  const firstAuthorization = authorizations.find((authorization) =>
    matched.some(
      (item) => item.returnAuthorizationId === authorization.returnAuthorizationId
    )
  );

  await admin
    .from("return_requests")
    .update({
      amazon_return_status: received ? "received" : "in_progress",
      amazon_rma_id: firstAuthorization?.amazonRmaId ?? undefined,
      amazon_rma_page_url: firstAuthorization?.rmaPageURL ?? undefined,
      amazon_return_authorization_id:
        firstAuthorization?.returnAuthorizationId ?? undefined,
      amazon_return_to_address: firstAuthorization?.returnToAddress ?? undefined,
      amazon_return_synced_on: new Date().toISOString(),
      amazon_return_error: null,
      ...(received
        ? {
            status: "received",
            received_on: new Date().toISOString(),
          }
        : {}),
      updated_on: new Date().toISOString(),
    })
    .eq("id", requestId);

  return { received, matchedItems: matched.length };
}
