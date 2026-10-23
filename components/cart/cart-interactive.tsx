"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { beginCheckout } from "@/app/checkout/actions";
import { removeCartItem, updateCartQuantity } from "@/app/cart/actions";

type CartLine = {
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
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function CartInteractive({
  initialLines,
}: {
  initialLines: CartLine[];
}) {
  const [lines, setLines] = useState(initialLines);
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  const [fitConfirmed, setFitConfirmed] = useState(false);
  const [shake, setShake] = useState(false);
  const fitRef = useRef<HTMLLabelElement>(null);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const versionsRef = useRef(new Map<number, number>());
  const chainsRef = useRef(new Map<number, Promise<void>>());
  const savedQuantitiesRef = useRef(
    new Map(initialLines.map((line) => [line.id, line.quantity]))
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + line.product.price * line.quantity,
        0,
      ),
    [lines],
  );

  const hasPendingChanges = Object.values(saveStates).some(
    (state) => state === "saving" || state === "idle",
  );

  function scheduleQuantitySave(itemId: number, quantity: number) {
    const existingTimer = timersRef.current.get(itemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const nextVersion = (versionsRef.current.get(itemId) ?? 0) + 1;
    versionsRef.current.set(itemId, nextVersion);

    setSaveStates((current) => ({ ...current, [itemId]: "idle" }));

    const timer = setTimeout(() => {
      setSaveStates((current) => ({ ...current, [itemId]: "saving" }));

      const previous = chainsRef.current.get(itemId) ?? Promise.resolve();

      const task = previous
        .catch(() => undefined)
        .then(() => updateCartQuantity(itemId, quantity));

      chainsRef.current.set(itemId, task);

      task
        .then(() => {
          if (versionsRef.current.get(itemId) === nextVersion) {
            savedQuantitiesRef.current.set(itemId, quantity);
            setSaveStates((current) => ({ ...current, [itemId]: "saved" }));
          }
        })
        .catch(() => {
          if (versionsRef.current.get(itemId) === nextVersion) {
            const savedQuantity = savedQuantitiesRef.current.get(itemId);
            if (savedQuantity != null) {
              setLines((current) =>
                current.map((line) =>
                  line.id === itemId
                    ? { ...line, quantity: savedQuantity }
                    : line
                )
              );
            }
            setSaveStates((current) => ({ ...current, [itemId]: "error" }));
          }
        });
    }, 400);

    timersRef.current.set(itemId, timer);
  }

  function changeQuantity(itemId: number, nextValue: number) {
    if (!Number.isFinite(nextValue)) return;

    const quantity = Math.max(1, Math.min(99, Math.trunc(nextValue)));

    setLines((current) =>
      current.map((line) =>
        line.id === itemId ? { ...line, quantity } : line,
      ),
    );

    scheduleQuantitySave(itemId, quantity);
  }

  async function removeItem(itemId: number) {
    const timer = timersRef.current.get(itemId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(itemId);
    }

    setRemovingIds((current) => [...current, itemId]);

    try {
      await removeCartItem(itemId);
      setLines((current) => current.filter((line) => line.id !== itemId));
      savedQuantitiesRef.current.delete(itemId);
      setSaveStates((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    } finally {
      setRemovingIds((current) => current.filter((id) => id !== itemId));
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border bg-white p-10 text-center">
        <h2 className="text-xl font-semibold text-ink">Your cart is empty</h2>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <section aria-label="Cart items" className="space-y-4">
        {lines.map((line) => {
          const saveState = saveStates[line.id] ?? "saved";

          return (
            <article
              key={line.id}
              className="group grid gap-4 rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_18px_46px_rgba(0,0,0,0.09)] sm:grid-cols-[112px_1fr_auto] sm:p-5"
            >
              {line.product.image_url ? (
                <Link
                  href={line.product.href}
                  className="relative block aspect-square overflow-hidden rounded-2xl bg-secondary"
                >
                  <Image
                    src={line.product.image_url}
                    alt={line.product.display_name}
                    fill
                    sizes="112px"
                    className="object-contain p-2 transition duration-300 group-hover:scale-105"
                  />
                </Link>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-brand-tint/60 text-center text-xs font-semibold text-brand">
                  Photo coming soon
                </div>
              )}

              <div className="min-w-0">
                <Link
                  href={line.product.href}
                  className="line-clamp-2 font-bold leading-snug text-ink transition hover:text-brand"
                >
                  {line.product.display_name}
                </Link>

                {line.product.sku && (
                  <p className="mt-1 inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {line.product.sku}
                  </p>
                )}

                <p className="mt-2 text-sm text-muted-foreground">
                  ${line.product.price.toFixed(2)} each
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div
                    role="group"
                    aria-label={`Quantity for ${line.product.display_name}`}
                    className="inline-flex items-center rounded-full border border-border bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.id, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label="Decrease quantity"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-brand-tint hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      id={`quantity-${line.id}`}
                      type="number"
                      min={1}
                      max={99}
                      value={line.quantity}
                      aria-label="Quantity"
                      onChange={(event) =>
                        changeQuantity(line.id, Number(event.target.value))
                      }
                      className="w-10 appearance-none bg-transparent text-center text-sm font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.id, line.quantity + 1)}
                      disabled={line.quantity >= 99}
                      aria-label="Increase quantity"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-brand-tint hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs ${
                      saveState === "error" ? "text-red-600" : "text-muted-foreground"
                    }`}
                    aria-live="polite"
                  >
                    {saveState === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    {saveState === "idle" && "Updating…"}
                    {saveState === "saving" && "Saving…"}
                    {saveState === "saved" && "Saved"}
                    {saveState === "error" && "Could not save"}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeItem(line.id)}
                    disabled={removingIds.includes(line.id)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:ml-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {removingIds.includes(line.id) ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>

              <div className="text-lg font-black text-ink sm:text-right" aria-live="polite">
                ${(line.product.price * line.quantity).toFixed(2)}
              </div>
            </article>
          );
        })}
      </section>

      <div className="h-fit space-y-4 lg:sticky lg:top-28">
        <aside className="overflow-hidden rounded-[28px] bg-ink p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.14)]">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-black tracking-[-0.02em]">Order summary</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Shipping</dt>
              <dd className="text-white/75">At checkout</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Taxes</dt>
              <dd className="text-white/75">At checkout</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
            <span className="text-sm font-semibold text-white/70">Subtotal</span>
            <span className="text-3xl font-black tracking-tight" aria-live="polite">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          <form action={beginCheckout}>
            <input type="hidden" name="fit_confirmed" value={fitConfirmed ? "yes" : "no"} />
            <button
              type="submit"
              disabled={hasPendingChanges}
              aria-disabled={!fitConfirmed}
              onClick={(e) => {
                if (!fitConfirmed) {
                  e.preventDefault();
                  setShake(true);
                  fitRef.current?.focus();
                  setTimeout(() => setShake(false), 500);
                }
              }}
              className={`cm-button-primary mt-6 w-full gap-2 py-3.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                fitConfirmed ? "" : "opacity-60 saturate-50"
              }`}
            >
              <Lock className="h-4 w-4" />
              {hasPendingChanges ? "Saving cart…" : "Secure Checkout"}
            </button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
            <ShieldCheck className="h-4 w-4" />
            Payment handled securely by Stripe
          </p>
        </aside>

        <label
          ref={fitRef}
          tabIndex={-1}
          className={`cm-fit flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition duration-300 ${
            fitConfirmed
              ? "border-emerald-300 bg-emerald-50"
              : "border-border bg-secondary hover:border-brand/40"
          } ${shake ? "cm-shake border-brand" : ""}`}
        >
          <input
            type="checkbox"
            checked={fitConfirmed}
            onChange={(e) => setFitConfirmed(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30 ${
              fitConfirmed ? "scale-110 border-emerald-600 bg-emerald-600 text-white" : "border-ink/30 bg-white"
            }`}
          >
            <Check className={`h-4 w-4 transition ${fitConfirmed ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} strokeWidth={3} />
          </span>
          <span className="text-sm leading-5">
            <span className="block font-bold text-ink">These parts fit my vehicle</span>
            <span className="block text-xs text-muted-foreground">
              I checked the year, make, model and engine.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
