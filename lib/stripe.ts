import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return key;
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
  }>;
}) {
  const body = new URLSearchParams();

  body.set("mode", "payment");
  body.set("payment_method_types[0]", "card");
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
    body.set(
      `line_items[${index}][price_data][product_data][metadata][sku]`,
      item.sku
    );
  });

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

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
