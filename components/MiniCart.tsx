"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { getMiniCart, type MiniCart as MiniCartData } from "@/app/cart/mini-actions";
import { removeCartItem, updateCartQuantity } from "@/app/cart/actions";

export const CART_ADDED_EVENT = "cm-cart-added";

// Slide-in cart. Opens after "Add to Cart" so the customer keeps browsing instead of jumping to /cart.
export default function MiniCart() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<MiniCartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setCart(await getMiniCart());
    } catch {
      setError("Could not load your cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onAdded = () => {
      setError(null);
      setOpen(true);
      setLoading(true);
      load();
    };
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(CART_ADDED_EVENT, onAdded);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const change = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update your cart.");
        await load();
      }
    });

  const count = cart?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="cm-qv-bg absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="cm-drawer-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-ink">
            <ShoppingBag className="h-5 w-5 text-brand" aria-hidden="true" />
            Added to your cart{count ? ` (${count})` : ""}
          </h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close cart" className="rounded-full bg-secondary p-2 text-ink transition hover:bg-brand hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && !cart && (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-20 w-20 animate-pulse rounded-xl bg-secondary" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                    <div className="h-8 w-28 animate-pulse rounded-full bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart && cart.lines.length === 0 && !loading && (
            <p className="py-10 text-center text-sm font-semibold text-muted-foreground">{cart.signedIn ? "Your cart is empty." : "Please sign in to see your cart."}</p>
          )}

          {error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{error}</p>}

          {cart && cart.lines.length > 0 && (
            <ul className={`space-y-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
              {cart.lines.map((l) => (
                <li key={l.id} className="flex gap-3">
                  <Link href={l.href} onClick={() => setOpen(false)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-white">
                    {l.image ? <Image src={l.image} alt="" fill sizes="80px" className="object-contain p-1.5" /> : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={l.href} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-bold leading-snug text-ink hover:text-brand">
                      {l.name}
                    </Link>
                    {l.sku && <p className="text-xs text-muted-foreground">Part · {l.sku}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-full border border-black/10">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={pending || l.quantity <= 1}
                          onClick={() => change(() => updateCartQuantity(l.id, l.quantity - 1))}
                          className="p-1.5 text-ink transition hover:text-brand disabled:opacity-30"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-bold tabular-nums">{l.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={pending || l.quantity >= l.available}
                          onClick={() => change(() => updateCartQuantity(l.id, l.quantity + 1))}
                          className="p-1.5 text-ink transition hover:text-brand disabled:opacity-30"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-ink">${(l.price * l.quantity).toFixed(2)}</span>
                      <button type="button" aria-label="Remove item" disabled={pending} onClick={() => change(() => removeCartItem(l.id))} className="p-1.5 text-muted-foreground transition hover:text-brand">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

        </div>

        {cart && cart.lines.length > 0 && (
          <div className="border-t border-black/5 px-5 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Subtotal</span>
              <span className="text-2xl font-black tracking-[-0.03em] text-ink">${cart.subtotal.toFixed(2)}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Shipping and tax are calculated at checkout.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-3 text-sm font-bold text-ink transition hover:border-brand hover:text-brand">
                Keep shopping
              </button>
              <Link href="/cart" onClick={() => setOpen(false)} className="cm-button-primary text-center">
                View cart &amp; checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
