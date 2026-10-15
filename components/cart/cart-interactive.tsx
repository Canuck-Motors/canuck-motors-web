"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
              className="grid gap-5 rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:border-brand/20 hover:shadow-[0_18px_46px_rgba(0,0,0,0.08)] sm:grid-cols-[120px_1fr_auto]"
            >
              {line.product.image_url ? (
                <Link
                  href={line.product.href}
                  className="relative block aspect-square overflow-hidden rounded-2xl border border-black/5 bg-white"
                >
                  <Image
                    src={line.product.image_url}
                    alt={line.product.display_name}
                    fill
                    sizes="120px"
                    className="object-contain p-2"
                  />
                </Link>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-2xl border border-brand/10 bg-brand-tint/50 text-center text-xs font-semibold text-brand">
                  Photo coming soon
                </div>
              )}

              <div>
                <Link
                  href={line.product.href}
                  className="font-semibold text-ink hover:text-brand"
                >
                  {line.product.display_name}
                </Link>

                {line.product.sku && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Part number: {line.product.sku}
                  </p>
                )}

                <p className="mt-3 font-semibold text-ink">
                  ${line.product.price.toFixed(2)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`quantity-${line.id}`}
                      className="text-sm text-muted-foreground"
                    >
                      Qty
                    </label>
                    <input
                      id={`quantity-${line.id}`}
                      type="number"
                      min={1}
                      max={99}
                      value={line.quantity}
                      onChange={(event) =>
                        changeQuantity(line.id, Number(event.target.value))
                      }
                      className="w-20 rounded-lg border px-3 py-2 text-sm"
                    />

                    <span
                      className={`text-xs ${
                        saveState === "error"
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                      aria-live="polite"
                    >
                      {saveState === "idle" && "Updating…"}
                      {saveState === "saving" && "Saving…"}
                      {saveState === "saved" && "Saved"}
                      {saveState === "error" && "Could not save"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(line.id)}
                    disabled={removingIds.includes(line.id)}
                    className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    {removingIds.includes(line.id) ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>

              <div className="font-bold text-ink" aria-live="polite">
                ${(line.product.price * line.quantity).toFixed(2)}
              </div>
            </article>
          );
        })}
      </section>

      <aside className="h-fit rounded-[28px] border border-black/5 bg-ink p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.12)]">
        <h2 className="text-xl font-black tracking-[-0.02em] text-white">
          Order summary
        </h2>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-white/50">Subtotal</dt>
            <dd className="font-semibold text-white" aria-live="polite">
              ${subtotal.toFixed(2)}
            </dd>
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

        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex justify-between gap-4 text-lg font-black text-white">
            <span>Subtotal</span>
            <span aria-live="polite">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <form action={beginCheckout}>
          <button
            type="submit"
            disabled={hasPendingChanges}
            className="cm-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasPendingChanges ? "Saving cart…" : "Secure Checkout"}
          </button>
        </form>

        <p className="mt-3 text-xs leading-5 text-white/45">
          Quantity and subtotal update automatically. Pricing is revalidated on
          the server before payment.
        </p>
      </aside>
    </div>
  );
}
