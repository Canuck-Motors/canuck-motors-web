import { isAmazonRedirectOn } from "@/lib/fulfillment-mode";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { imageUrl, isVideo } from "@/lib/product-images";
import { withMaterial } from "@/lib/material";
import CartInteractive from "@/components/cart/cart-interactive";
import CartRefresh from "@/components/cart/CartRefresh";

export const instant = false;

export const metadata: Metadata = {
  title: "Your Cart",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams: Promise<{
    checkout_error?: string;
    checkout_cancelled?: string;
  }>;
};

export default async function CartPage({ searchParams }: PageProps) {
  const { checkout_error: checkoutError, checkout_cancelled: checkoutCancelled } =
    await searchParams;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, first_name, last_name, phone_number, shipping_address")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error("Customer profile is unavailable.");
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h1 className="text-4xl font-bold text-ink">Your cart</h1>
          <div className="mt-8 rounded-3xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-ink">Your cart is empty</h2>
            <p className="mt-2 text-muted-foreground">
              Find the right part for your vehicle and add it here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select("id, product_id, quantity")
    .eq("cart_id", cart.id)
    .order("created_on");

  if (itemsError) {
    throw new Error("Unable to load your cart.");
  }

  const productIds = [...new Set((items ?? []).map((item) => item.product_id))];

  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, product_name, sku, slug, price, product_images ( path, sort_order )")
          .in("id", productIds)
          .eq("is_active", true)
          .eq("is_delete", false)
      : { data: [] };

  const productMap = new Map((products ?? []).map((product) => [product.id, product]));

  // Parts that were hidden, deleted or lost their price are removed from the cart with a notice,
  // instead of silently disappearing from the page while still sitting in the cart.
  const goneItems = (items ?? []).filter((item) => {
    const p = productMap.get(item.product_id);
    return !p || p.price === null;
  });
  if (goneItems.length) {
    await supabase.from("cart_items").delete().in("id", goneItems.map((i) => i.id));
  }

  const { data: stockRows } =
    productIds.length > 0
      ? await supabase.from("inventory").select("product_id, quantity, reserved_quantity, is_active").in("product_id", productIds)
      : { data: [] };
  const availableBy = new Map(
    (stockRows ?? []).map((r) => [
      r.product_id as number,
      r.is_active ? Math.max(0, Number(r.quantity ?? 0) - Number(r.reserved_quantity ?? 0)) : 0,
    ])
  );

  const initialLines = (items ?? [])
    .map((item) => {
      const product = productMap.get(item.product_id);

      if (!product || product.price === null) {
        return null;
      }

      const mainImage = (product.product_images ?? []).filter((i) => !isVideo(i.path)).sort(
        (a, b) => a.sort_order - b.sort_order,
      )[0];

      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        available: availableBy.has(item.product_id) ? (availableBy.get(item.product_id) as number) : null,
        product: {
          id: product.id,
          product_name: product.product_name,
          display_name: withMaterial(product.product_name, product.sku),
          sku: product.sku,
          href: product.slug ? `/product/${product.slug}` : `/product/${product.id}`,
          price: Number(product.price),
          image_url: mainImage ? imageUrl(mainImage.path) : null,
        },
      };
    })
    .filter(Boolean) as Array<{
      id: number;
      product_id: number;
      quantity: number;
      available: number | null;
      product: {
        id: number;
        product_name: string;
        display_name: string;
        sku: string | null;
        href: string;
        price: number;
        image_url: string | null;
      };
    }>;

  // Uber same-day is only offered to customers whose account address is in Vancouver or Burnaby.
  const saved = (profile.shipping_address ?? {}) as Record<string, string | null>;
  const savedCity = String(saved.city ?? "").trim();
  let mcfOn = false;
  try {
    const { data: fs } = await createAdminClient().from("fulfillment_settings").select("amazon_mcf_enabled").eq("id", 1).maybeSingle();
    mcfOn = Boolean(fs?.amazon_mcf_enabled);
  } catch {}
  const uberEligible = !(await isAmazonRedirectOn()) && ["vancouver", "burnaby"].includes(savedCity.toLowerCase());
  // Fall back to the phone used on the customer's last Uber delivery if the profile has none.
  let lastUberPhone = "";
  if (!profile.phone_number) {
    try {
      const { data: lastOrder } = await createAdminClient()
        .from("orders")
        .select("delivery_phone")
        .eq("user_id", profile.id)
        .not("delivery_phone", "is", null)
        .order("created_on", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastUberPhone = String(lastOrder?.delivery_phone ?? "");
    } catch {}
  }
  const uberDefaults = {
    name: String(saved.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || ""),
    phone: String(profile.phone_number || lastUberPhone || authData.user.phone || (authData.user.user_metadata as Record<string, unknown> | null)?.phone || ""),
    street: String(saved.line1 ?? ""),
    city: uberEligible ? (savedCity.toLowerCase() === "burnaby" ? "Burnaby" : "Vancouver") : "",
    state: "BC",
    zip: String(saved.postal_code ?? ""),
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="cm-container py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-ink md:text-5xl">
              Your cart
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review your parts, then head to secure checkout.
            </p>
          </div>
          <Link href="/" className="text-sm font-semibold text-brand hover:underline">
            Continue shopping
          </Link>
        </div>

        {checkoutError && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            Checkout could not start: {checkoutError}
          </div>
        )}

        {goneItems.length > 0 && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
          >
            {goneItems.length === 1
              ? "One part in your cart is no longer available, so we removed it."
              : `${goneItems.length} parts in your cart are no longer available, so we removed them.`}
          </div>
        )}

        {checkoutCancelled && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
          >
            Checkout was cancelled. Your items are still reserved temporarily until the checkout session expires.
          </div>
        )}

        <CartRefresh />
        <CartInteractive
          key={initialLines.map((l) => `${l.id}:${l.quantity}`).join(",")}
          initialLines={initialLines} uberEligible={uberEligible} mcfOn={mcfOn} uberDefaults={uberDefaults} shipPostalDefault={String(saved.postal_code ?? "")}
          shipAccountLabel={[saved.line1, saved.city, saved.province, saved.postal_code].filter(Boolean).join(", ")}
        />
      </div>
    </main>
  );
}
