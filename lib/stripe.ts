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
