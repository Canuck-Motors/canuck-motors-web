import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { imageUrl, isVideo } from "@/lib/product-images";
import { withMaterial } from "@/lib/material";
import CartInteractive from "@/components/cart/cart-interactive";

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
    .select("id")
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

        {checkoutCancelled && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
          >
            Checkout was cancelled. Your items are still reserved temporarily until the checkout session expires.
          </div>
        )}

        <CartInteractive initialLines={initialLines} />
      </div>
    </main>
  );
}
