import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { removeCartItem, updateCartQuantity } from "./actions";
import { beginCheckout } from "@/app/checkout/actions";

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
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
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
          .select("id, product_name, sku, slug, price")
          .in("id", productIds)
          .eq("is_active", true)
          .eq("is_delete", false)
      : { data: [] };

  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  const cartLines = (items ?? [])
    .map((item) => {
      const product = productMap.get(item.product_id);
      return product ? { ...item, product } : null;
    })
    .filter(Boolean) as Array<{
      id: number;
      product_id: number;
      quantity: number;
      product: {
        id: number;
        product_name: string;
        sku: string | null;
        slug: string | null;
        price: number | null;
      };
    }>;

  const subtotal = cartLines.reduce(
    (sum, line) =>
      sum + (line.product.price === null ? 0 : Number(line.product.price) * line.quantity),
    0
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
      <div className="cm-container py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Shopping Cart
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-ink md:text-5xl">Your cart</h1>
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

        {cartLines.length === 0 ? (
          <div className="mt-8 rounded-3xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-ink">Your cart is empty</h2>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <section aria-label="Cart items" className="space-y-4">
              {cartLines.map((line) => {
                const productHref = line.product.slug
                  ? `/product/${line.product.slug}`
                  : `/product/${line.product.id}`;

                return (
                  <article
                    key={line.id}
                    className="grid gap-5 rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:border-brand/20 hover:shadow-[0_18px_46px_rgba(0,0,0,0.08)] sm:grid-cols-[120px_1fr_auto]"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-2xl border border-brand/10 bg-brand-tint/50 text-center text-xs font-semibold text-brand">
                      Product image
                    </div>

                    <div>
                      <Link href={productHref} className="font-semibold text-ink hover:text-brand">
                        {line.product.product_name}
                      </Link>
                      {line.product.sku && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Part number: {line.product.sku}
                        </p>
                      )}
                      <p className="mt-3 font-semibold text-ink">
                        {line.product.price === null
                          ? "Contact for price"
                          : `$${Number(line.product.price).toFixed(2)}`}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <form
                          action={async (formData) => {
                            "use server";
                            const value = Number(formData.get("quantity"));
                            await updateCartQuantity(line.id, value);
                          }}
                          className="flex items-center gap-2"
                        >
                          <label htmlFor={`quantity-${line.id}`} className="text-sm text-muted-foreground">
                            Qty
                          </label>
                          <input
                            id={`quantity-${line.id}`}
                            name="quantity"
                            type="number"
                            min={1}
                            max={99}
                            defaultValue={line.quantity}
                            className="w-20 rounded-lg border px-3 py-2 text-sm"
                          />
                          <button
                            type="submit"
                            className="text-sm font-semibold text-brand hover:underline"
                          >
                            Update
                          </button>
                        </form>

                        <form action={removeCartItem.bind(null, line.id)}>
                          <button
                            type="submit"
                            className="text-sm font-semibold text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="font-bold text-ink">
                      {line.product.price === null
                        ? "—"
                        : `$${(Number(line.product.price) * line.quantity).toFixed(2)}`}
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-[28px] border border-black/5 bg-ink p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.12)]">
              <h2 className="text-xl font-black tracking-[-0.02em] text-white">Order summary</h2>
              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">Subtotal</dt>
                  <dd className="font-semibold text-white">${subtotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">Shipping</dt>
                  <dd className="text-white/65">Calculated at checkout</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">Taxes</dt>
                  <dd className="text-white/65">Calculated at checkout</dd>
                </div>
              </dl>

              <div className="mt-6 border-t pt-5">
                <div className="flex justify-between gap-4 text-lg font-black text-white">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <form action={beginCheckout}>
                <button
                  type="submit"
                  className="cm-button-primary mt-6 w-full"
                >
                  Secure Checkout
                </button>
              </form>
              <p className="mt-3 text-xs leading-5 text-white/45">
                Pricing is revalidated on the server before payment. Checkout is blocked until inventory is configured for every item.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
