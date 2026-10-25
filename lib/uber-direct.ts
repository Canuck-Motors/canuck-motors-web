// Uber Direct (same-day courier). Server only. Keys come from .env.local; they are never sent to the browser.
const AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const API = "https://api.uber.com/v1/customers";

export type UberAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

let cached: { token: string; expires: number } | null = null;

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured.`);
  return v;
}

async function getToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("UBER_DIRECT_CLIENT_ID"),
      client_secret: env("UBER_DIRECT_CLIENT_SECRET"),
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || json?.message || "Uber sign-in failed. Check the Uber keys.");
  }
  cached = { token: json.access_token, expires: Date.now() + Number(json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

async function call(path: string, body: unknown) {
  const token = await getToken();
  const res = await fetch(`${API}/${env("UBER_DIRECT_CUSTOMER_ID")}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Uber request failed (${res.status}).`);
  return json;
}

// Uber wants the address as a JSON string.
const addr = (a: UberAddress) =>
  JSON.stringify({
    street_address: [a.street],
    city: a.city,
    state: a.state,
    zip_code: a.zip,
    country: a.country ?? "CA",
  });

export function pickup() {
  return {
    name: process.env.UBER_PICKUP_NAME || "Canuck Motors",
    phone: process.env.UBER_PICKUP_PHONE || "+16045550100",
    address: {
      street: process.env.UBER_PICKUP_STREET || "1055 W Georgia St",
      city: process.env.UBER_PICKUP_CITY || "Vancouver",
      state: process.env.UBER_PICKUP_STATE || "BC",
      zip: process.env.UBER_PICKUP_ZIP || "V6E 3P3",
    } satisfies UberAddress,
  };
}

export async function getUberQuote(dropoff: UberAddress) {
  const p = pickup();
  const q = await call("/delivery_quotes", {
    pickup_address: addr(p.address),
    dropoff_address: addr(dropoff),
  });
  return {
    id: q.id as string,
    feeCents: Number(q.fee ?? 0),
    currency: String(q.currency ?? "cad").toUpperCase(),
    etaMinutes: q.duration as number | undefined,
    dropoffEta: q.dropoff_eta as string | undefined,
  };
}

export async function createUberDelivery(input: {
  quoteId: string;
  dropoff: UberAddress;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  items: { name: string; quantity: number }[];
}) {
  const p = pickup();
  const d = await call("/deliveries", {
    quote_id: input.quoteId,
    pickup_name: p.name,
    pickup_address: addr(p.address),
    pickup_phone_number: p.phone,
    dropoff_name: input.customerName,
    dropoff_address: addr(input.dropoff),
    dropoff_phone_number: input.customerPhone,
    manifest_items: input.items.map((i) => ({ name: i.name, quantity: i.quantity, size: "small" })),
    external_id: input.orderNumber,
  });
  return { id: d.id as string, status: d.status as string, trackingUrl: d.tracking_url as string | undefined };
}
