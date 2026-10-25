"use server";

import { isAmazonRedirectOn } from "@/lib/fulfillment-mode";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeCheckoutSession, createStripeCustomer, stripeTaxEnabled } from "@/lib/stripe";
import { imageUrl, isVideo } from "@/lib/product-images";
import { getUberQuote } from "@/lib/uber-direct";
import {
  quoteStandardForCart,
  isPostalCode,
  provinceMatchesPostal,
  PROVINCE_CODES,
  formatPostal,
  type ShippingQuote,
  type ShipTo,
} from "@/lib/standard-shipping";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export async function beginCheckout(formData: FormData) {
  if (await isAmazonRedirectOn()) {
    redirect(`/cart?checkout_error=${encodeURIComponent("Checkout is turned off. Please buy on Amazon.")}`);
  }
  if (formData.get("fit_confirmed") !== "yes") {
    redirect(
      `/cart?checkout_error=${encodeURIComponent("Please confirm that the parts fit your vehicle.")}`
    );
  }

  const wantsUber = formData.get("delivery_method") === "uber";
  const field = (k: string) => String(formData.get(`u_${k}`) ?? "").trim();
  const uberDropoff = {
    name: field("name"),
    phone: field("phone"),
    street: field("street"),
    city: field("city"),
    state: field("state"),
    zip: field("zip"),
  };
  let uberQuote: { id: string; feeCents: number } | null = null;

  if (wantsUber) {
    if (!uberDropoff.name || !uberDropoff.phone || !uberDropoff.street || !uberDropoff.city || !uberDropoff.state || !uberDropoff.zip) {
      redirect(`/cart?checkout_error=${encodeURIComponent("Please fill in the Uber delivery name, phone and address.")}`);
    }
    if (!["vancouver", "burnaby"].includes(uberDropoff.city.toLowerCase())) {
      redirect(`/cart?checkout_error=${encodeURIComponent("Uber same-day delivery is only available in Vancouver and Burnaby.")}`);
    }
    try {
      // Price is always re-checked on the server, never trusted from the browser.
      const q = await getUberQuote(uberDropoff);
      uberQuote = { id: q.id, feeCents: q.feeCents };
    } catch {
      redirect(
        `/cart?checkout_error=${encodeURIComponent("Uber same-day delivery isn't available for that address right now. Please choose standard shipping.")}`
      );
    }
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    redirect("/login");
  }

  if (wantsUber) {
    // Same rule as the cart: Uber is only for accounts with a Vancouver or Burnaby address.
    const { data: prof } = await supabase
      .from("users")
      .select("shipping_address")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();
    const acctCity = String((prof?.shipping_address as { city?: string } | null)?.city ?? "").trim().toLowerCase();
    if (!["vancouver", "burnaby"].includes(acctCity)) {
      redirect(`/cart?checkout_error=${encodeURIComponent("Uber same-day delivery is only available for Vancouver and Burnaby accounts.")}`);
    }
  }

  // Standard shipping: price comes from our own rate table, recomputed here from the real cart.
  let stdQuote: Extract<ShippingQuote, { ok: true }> | null = null;
  let shipTo: ShipTo | null = null;
  if (!wantsUber) {
    const fail = (m: string): never => redirect(`/cart?checkout_error=${encodeURIComponent(m)}`);
    const clean = (k: string, max = 120) => String(formData.get(k) ?? "").trim().slice(0, max);
    if (clean("s_mode") === "other") {
      const postal = clean("s_postal", 10);
      shipTo = {
        name: clean("s_name", 80),
        line1: clean("s_line1"),
        line2: clean("s_line2"),
        city: clean("s_city", 80),
        province: clean("s_province", 2).toUpperCase(),
        postal_code: formatPostal(postal),
        country: "CA",
      };
      if (!shipTo.name || !shipTo.line1 || !shipTo.city || !shipTo.province || !postal) {
        fail("Please fill in the name, street, city, province and postal code for the delivery address.");
      }
      if (!PROVINCE_CODES.includes(shipTo.province)) fail("Please choose a province for the delivery address.");
      if (!isPostalCode(postal)) fail("Postal code should look like M5V 2T6.");
      if (!provinceMatchesPostal(shipTo.province, postal)) fail("That postal code doesn't match the province you chose.");
    } else {
      // Saved account address, read on the server (never trusted from the browser).
      const { data: prof } = await supabase
        .from("users")
        .select("first_name, last_name, shipping_address")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      const a = (prof?.shipping_address ?? {}) as Record<string, string | null>;
      if (!a.line1 || !a.city || !a.province || !a.postal_code) {
        fail("Please add your delivery address in My Account, or choose a different location.");
      }
      shipTo = {
        name: String(a.name || [prof?.first_name, prof?.last_name].filter(Boolean).join(" ")),
        line1: String(a.line1),
        line2: String(a.line2 ?? ""),
        city: String(a.city),
        province: String(a.province),
        postal_code: formatPostal(String(a.postal_code)),
        country: "CA",
      };
    }
    const q = await quoteStandardForCart(supabase, authData.user.id, shipTo!.postal_code);
    if (!q.ok) fail(q.message);
    stdQuote = q as Extract<ShippingQuote, { ok: true }>;
  }

  const { data: prepared, error: prepareError } = await supabase.rpc(
    "prepare_checkout_order"
  );

  if (prepareError || !prepared?.[0]) {
    const message = prepareError?.message || "Unable to prepare checkout.";
    redirect(`/cart?checkout_error=${encodeURIComponent(message)}`);
  }

  const order = prepared[0] as {
    order_id: string;
    order_number: string;
  };

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, customer_email, total_amount, currency")
    .eq("id", order.order_id)
    .single();

  if (orderError || !orderRow) {
    redirect("/cart?checkout_error=Order%20could%20not%20be%20loaded");
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name, sku, unit_price, quantity")
    .eq("order_id", order.order_id)
    .order("id");

  if (itemsError || !items?.length) {
    redirect("/cart?checkout_error=Order%20items%20could%20not%20be%20loaded");
  }

  // First photo of each product, so Stripe can show it next to the item.
  const photoBySku = new Map<string, string>();
  const { data: photoRows } = await supabase
    .from("products")
    .select("sku, product_images(path, sort_order)")
    .in("sku", items.map((i) => i.sku));
  for (const p of photoRows ?? []) {
    const imgs = ((Array.isArray(p.product_images) ? p.product_images : []) as {
      path: string;
      sort_order: number | null;
    }[]).filter((i) => !isVideo(i.path));
    imgs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (imgs[0]) photoBySku.set(String(p.sku), imageUrl(imgs[0].path));
  }

  const admin = createAdminClient();
  let checkoutUrl: string | null = null;

  const shippingCents = uberQuote?.feeCents ?? stdQuote?.cents ?? 0;

  if (uberQuote) {
    const { error: uberSaveError } = await admin
      .from("orders")
      .update({
        delivery_method: "uber",
        delivery_fee: uberQuote.feeCents / 100,
        delivery_phone: uberDropoff.phone,
        uber_quote_id: uberQuote.id,
        uber_dropoff: uberDropoff,
      })
      .eq("id", orderRow.id);

    if (uberSaveError) {
      await admin.rpc("release_checkout_order", {
        p_order_id: orderRow.id,
        p_reason: "Uber delivery details could not be saved",
      });
      redirect(`/cart?checkout_error=${encodeURIComponent("Could not save the delivery details. Please try again.")}`);
    }
  }

  if (stdQuote) {
    const { error: stdSaveError } = await admin
      .from("orders")
      .update({
        delivery_method: "standard",
        delivery_fee: stdQuote.cents / 100,
        shipping_zone: stdQuote.zone,
        shipping_weight_kg: stdQuote.weightKg,
        shipping_quote_postal: stdQuote.postal,
        ship_to: shipTo,
      })
      .eq("id", orderRow.id);
    if (stdSaveError) {
      await admin.rpc("release_checkout_order", {
        p_order_id: orderRow.id,
        p_reason: "Shipping charge could not be saved",
      });
      redirect(`/cart?checkout_error=${encodeURIComponent("Could not save the shipping charge. Please try again.")}`);
    }
  }

  try {
    // Stripe Tax needs the delivery address, so it goes on a Stripe customer for this checkout.
    let customerId: string | null = null;
    if (stripeTaxEnabled()) {
      const to = shipTo
        ? { line1: shipTo.line1, line2: shipTo.line2, city: shipTo.city, state: shipTo.province, postal_code: shipTo.postal_code }
        : { line1: uberDropoff.street, line2: "", city: uberDropoff.city, state: uberDropoff.state || "BC", postal_code: uberDropoff.zip };
      customerId = await createStripeCustomer({
        email: orderRow.customer_email,
        name: shipTo?.name || uberDropoff.name,
        address: to,
      });
    }

    const session = await createStripeCheckoutSession({
      orderId: orderRow.id,
      orderNumber: orderRow.order_number,
      customerEmail: orderRow.customer_email,
      successUrl: `${getSiteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${getSiteUrl()}/cart?checkout_cancelled=1`,
      customerId,
      delivery: uberQuote
        ? { feeCents: uberQuote.feeCents, label: "Uber same-day delivery" }
        : stdQuote
          ? { feeCents: stdQuote.cents, label: "Shipping" }
          : null,
      items: items.map((item) => ({
        name: item.product_name,
        sku: item.sku,
        unitAmountCents: Math.round(Number(item.unit_price) * 100),
        quantity: item.quantity,
        imageUrl: photoBySku.get(item.sku) ?? null,
      })),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    const { error: paymentError } = await admin.from("payments").upsert(
      {
        order_id: orderRow.id,
        provider: "stripe",
        provider_checkout_session_id: session.id,
        provider_payment_intent_id: session.payment_intent ?? null,
        amount: Number(orderRow.total_amount) + shippingCents / 100,
        currency: orderRow.currency,
        status: "pending",
        updated_on: new Date().toISOString(),
      },
      { onConflict: "provider_checkout_session_id" }
    );

    if (paymentError) {
      throw new Error("Unable to record the pending payment.");
    }

    checkoutUrl = session.url;
  } catch (error) {
    await admin.rpc("release_checkout_order", {
      p_order_id: orderRow.id,
      p_reason: "Stripe checkout session could not be created",
    });

    const message =
      error instanceof Error ? error.message : "Unable to start checkout.";

    redirect(`/cart?checkout_error=${encodeURIComponent(message)}`);
  }

  if (!checkoutUrl) {
    redirect("/cart?checkout_error=Stripe%20checkout%20URL%20was%20not%20available");
  }

  redirect(checkoutUrl);
}
