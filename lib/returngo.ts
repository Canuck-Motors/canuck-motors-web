import "server-only";

type Json = Record<string, any>;

const BASE = () => (process.env.RETURNGO_API_BASE_URL || "https://api.returngo.ai").replace(/\/$/, "");
const API_KEY = () => process.env.RETURNGO_API_KEY?.trim() || "";
const SHOP = () => process.env.RETURNGO_SHOP_NAME?.trim() || "";

export function isReturnGoConfigured() {
  return Boolean(API_KEY() && SHOP());
}

function config() {
  const apiKey = API_KEY();
  const shop = SHOP();
  if (!apiKey || !shop) {
    throw new Error("ReturnGO is not configured. Add RETURNGO_API_KEY and RETURNGO_SHOP_NAME in Vercel.");
  }
  return { apiKey, shop };
}

async function request(path: string, init: RequestInit = {}) {
  const { apiKey, shop } = config();
  const response = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "x-shop-name": shop,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: Json = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      data?.error ||
      `ReturnGO request failed (${response.status}).`;
    throw new Error(String(message));
  }

  return data;
}

export const RETURNGO_REASONS: Record<string, string> = {
  changed_mind: "Changed my mind",
  defective: "Item is damaged or faulty",
  damaged: "Item is damaged or faulty",
  wrong_item: "Received wrong item",
  does_not_fit: "Does not fit",
  not_fit: "Does not fit",
  not_as_described: "Not as described",
  arrived_too_late: "Arrived too late",
  ordered_multiple: "Ordered multiple products / sizes",
  order_withdrawal: "Order withdrawal",
};

export function returnGoReason(reasonCode: string) {
  const normalized = reasonCode.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return RETURNGO_REASONS[normalized] || process.env.RETURNGO_DEFAULT_REASON || "";
}

function policyNames(data: Json): string[] {
  const direct = data?.eligiblePolicyNames || data?.policyNames;
  if (Array.isArray(direct)) return direct.map(String).filter(Boolean);

  const options = data?.returnOptions || data?.eligiblePolicies || data?.data?.returnOptions || [];
  const names = new Set<string>();
  if (Array.isArray(options)) {
    for (const option of options) {
      const list = option?.availablePolicyNames || option?.policyNames || [];
      if (Array.isArray(list)) for (const name of list) if (name) names.add(String(name));
    }
  }
  return [...names];
}

export async function getReturnGoEligiblePolicies(input: {
  orderId: string;
  lineItemId: string;
  quantity: number;
  reason: string;
}) {
  const data = await request("/rma/getEligiblePolicies", {
    method: "POST",
    body: JSON.stringify({
      orderId: input.orderId,
      returnedLineItems: [
        {
          shopLineItemId: input.lineItemId,
          quantity: input.quantity,
          returnReasonName: input.reason,
        },
      ],
    }),
  });
  return { data, policyNames: policyNames(data) };
}

function parseRma(data: Json) {
  const rma = data?.rma || data?.data?.rma || data?.data || data;
  const id = String(rma?.id || rma?.rmaId || data?.rmaId || "");
  const status = String(rma?.status || data?.rmaStatus || "");
  const shipments = rma?.shipments || data?.shipments || [];
  const labels: string[] = [];

  const addLabel = (value: unknown) => {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) labels.push(value);
  };

  addLabel(data?.labelUrl);
  addLabel(rma?.labelUrl);
  if (Array.isArray(data?.labelUrls)) data.labelUrls.forEach(addLabel);
  if (Array.isArray(shipments)) {
    for (const shipment of shipments) {
      addLabel(shipment?.labelUrl);
      addLabel(shipment?.label?.url);
      if (Array.isArray(shipment?.labels)) {
        for (const label of shipment.labels) addLabel(label?.url || label);
      }
    }
  }

  return { id, status, labelUrl: labels[0] || "", data };
}

export async function createReturnGoRmaByPolicy(input: {
  orderId: string;
  lineItemId: string;
  quantity: number;
  reason: string;
  policyName: string;
}) {
  const data = await request("/rma/createByPolicy", {
    method: "POST",
    body: JSON.stringify({
      orderId: input.orderId,
      status: "Approved",
      returnedLineItems: [
        {
          shopLineItemId: input.lineItemId,
          quantity: input.quantity,
          returnReasonName: input.reason,
          policyName: input.policyName,
        },
      ],
    }),
  });
  return parseRma(data);
}

export async function getReturnGoRma(rmaId: string) {
  return parseRma(
    await request(`/rma/${encodeURIComponent(rmaId)}`, {
      method: "GET",
    })
  );
}
