import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return key;
}


// Canuck Motors look for Stripe Checkout. If the account's Stripe API version does not
// know "branding_settings", the request is retried without it so checkout never breaks.
let brandFiles: Promise<{ icon: string; logo: string } | null> | null = null;

// Uploads the logo files to Stripe once (so this also works from localhost,
// where Stripe cannot download images by URL). Returns null if anything fails.
function getBrandFiles() {
  if (!brandFiles) {
    brandFiles = (async () => {
      try {
        const [{ readFile }, path] = await Promise.all([
          import("node:fs/promises"),
          import("node:path"),
        ]);
        const upload = async (file: string, purpose: string) => {
          const data = await readFile(path.join(process.cwd(), "public", "logo", file));
          const form = new FormData();
          form.set("purpose", purpose);
          form.set("file", new Blob([new Uint8Array(data)], { type: "image/png" }), file);
          const res = await fetch("https://files.stripe.com/v1/files", {
            method: "POST",
            headers: { Authorization: `Bearer ${getStripeSecretKey()}` },
            body: form,
          });
          const json = await res.json();
          if (!res.ok || !json?.id) {
            throw new Error(json?.error?.message || "Stripe file upload failed.");
          }
          return json.id as string;
        };
        return {
          icon: await upload("stripe-icon-square.png", "business_icon"),
          logo: await upload("Canuck-Motors.png", "business_logo"),
        };
      } catch (error) {
        console.warn("[stripe] Could not upload brand images:", error);
        brandFiles = null; // try again next time
        return null;
      }
    })();
  }
  return brandFiles;
}

async function addBranding(body: URLSearchParams) {
  body.set("branding_settings[display_name]", "Canuck Motors");
  body.set("branding_settings[button_color]", "#D62828");
  body.set("branding_settings[background_color]", "#FFFFFF");
  body.set("branding_settings[border_style]", "rounded");
  body.set("branding_settings[font_family]", "inter");

  const files = await getBrandFiles();
  if (files) {
    body.set("branding_settings[icon][type]", "file");
    body.set("branding_settings[icon][file]", files.icon);
    body.set("branding_settings[logo][type]", "file");
    body.set("branding_settings[logo][file]", files.logo);
  }
}

async function postCheckoutSession(body: URLSearchParams) {
  const send = (b: URLSearchParams) =>
    fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: b,
      cache: "no-store",
    });

  const branded = new URLSearchParams(body);
  await addBranding(branded);
  const first = await send(branded);
  if (first.ok) return first;

  const text = await first.clone().text();
  if (/branding/i.test(text)) {
    console.warn("[stripe] Branding was rejected, retrying without it:", text.slice(0, 400));
    return send(body);
  }
  return first;
}

export async function createStripeCheckoutSession(input: {
  orderId: string;
  orderNumber: string;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
  items: Array<{
    name: string;
    sku: string;
    unitAmountCents: number;
    quantity: number;
    imageUrl?: string | null;
  }>;
}) {
  const body = new URLSearchParams();

  body.set("mode", "payment");
  body.set("custom_text[submit][message]", "Genuine auto parts from Canuck Motors. Questions about your order? Contact our support team.");
  body.set("billing_address_collection", "required");
  body.set("shipping_address_collection[allowed_countries][0]", "CA");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.orderId);
  body.set("metadata[order_id]", input.orderId);
  body.set("metadata[order_number]", input.orderNumber);

  if (input.customerEmail) {
    body.set("customer_email", input.customerEmail);
  }

  input.items.forEach((item, index) => {
    body.set(`line_items[${index}][quantity]`, String(item.quantity));
    body.set(`line_items[${index}][price_data][currency]`, "cad");
    body.set(
      `line_items[${index}][price_data][unit_amount]`,
      String(item.unitAmountCents)
    );
    body.set(
      `line_items[${index}][price_data][product_data][name]`,
      item.name
    );
    if (item.imageUrl) {
      body.set(`line_items[${index}][price_data][product_data][images][0]`, item.imageUrl);
    }
    body.set(
      `line_items[${index}][price_data][product_data][metadata][sku]`,
      item.sku
    );
  });

  const response = await postCheckoutSession(body);

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Stripe Checkout session creation failed."
    );
  }

  return payload as {
    id: string;
    url: string | null;
    payment_intent?: string | null;
  };
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",");
  const timestamp = parts
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampNumber = Number(timestamp);
  if (
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() / 1000 - timestampNumber) > 300
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    try {
      const actualBuffer = Buffer.from(signature, "hex");
      return (
        actualBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(actualBuffer, expectedBuffer)
      );
    } catch {
      return false;
    }
  });
}


export async function createStripeRefund(input: {
  paymentIntentId: string;
  amountCents: number;
  idempotencyKey: string;
  refundId?: string;
  orderId?: string;
}) {
  const body = new URLSearchParams();
  body.set("payment_intent", input.paymentIntentId);
  body.set("amount", String(input.amountCents));
  body.set("reason", "requested_by_customer");

  if (input.refundId) {
    body.set("metadata[refund_id]", input.refundId);
  }

  if (input.orderId) {
    body.set("metadata[order_id]", input.orderId);
  }

  const response = await fetch(`${STRIPE_API_BASE}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": input.idempotencyKey,
    },
    body,
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Stripe refund creation failed."
    );
  }

  return payload as {
    id: string;
    status?: string | null;
  };
}


async function stripeGet<T>(path: string): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
    },
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Stripe API request failed.");
  }

  return payload as T;
}

export function retrieveStripePaymentIntent(id: string) {
  return stripeGet<{
    id: string;
    status: string;
    amount: number;
    amount_received: number;
    currency: string;
    metadata?: Record<string, string>;
  }>(`/payment_intents/${encodeURIComponent(id)}`);
}

export function retrieveStripeCheckoutSession(id: string) {
  return stripeGet<{
    id: string;
    payment_status: string;
    status: string;
    payment_intent: string | null;
    client_reference_id?: string | null;
    metadata?: Record<string, string>;
    customer_details?: {
      name?: string | null;
      email?: string | null;
      address?: Record<string, string | null> | null;
    } | null;
    shipping_details?: {
      name?: string | null;
      address?: Record<string, string | null> | null;
    } | null;
    collected_information?: {
      shipping_details?: {
        name?: string | null;
        address?: Record<string, string | null> | null;
      } | null;
    } | null;
  }>(`/checkout/sessions/${encodeURIComponent(id)}`);
}

export function retrieveStripeRefund(id: string) {
  return stripeGet<{
    id: string;
    status: string | null;
    amount: number;
    currency: string;
    payment_intent?: string | null;
    metadata?: Record<string, string>;
  }>(`/refunds/${encodeURIComponent(id)}`);
}

export function retrieveStripeDispute(id: string) {
  return stripeGet<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    charge?: string | null;
    payment_intent?: string | null;
    reason?: string | null;
    is_charge_refundable?: boolean | null;
    evidence_details?: { due_by?: number | null };
    metadata?: Record<string, string>;
  }>(`/disputes/${encodeURIComponent(id)}`);
}


export async function createStripeAmountCheckoutSession(input: {
  orderId: string;
  orderNumber: string;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
  label: string;
  amountCents: number;
  metadata?: Record<string, string>;
}) {
  const body = new URLSearchParams();

  body.set("mode", "payment");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.orderId);
  body.set("metadata[order_id]", input.orderId);
  body.set("metadata[order_number]", input.orderNumber);
  body.set("metadata[checkout_type]", "exchange_difference");

  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    body.set(`metadata[${key}]`, value);
  }

  if (input.customerEmail) {
    body.set("customer_email", input.customerEmail);
  }

  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "cad");
  body.set(
    "line_items[0][price_data][unit_amount]",
    String(input.amountCents)
  );
  body.set(
    "line_items[0][price_data][product_data][name]",
    input.label
  );

  const response = await postCheckoutSession(body);

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Stripe Checkout session creation failed."
    );
  }

  return payload as {
    id: string;
    url: string | null;
    payment_intent?: string | null;
  };
}
