"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { beginCheckout } from "@/app/checkout/actions";
import { removeCartItem, updateCartQuantity } from "@/app/cart/actions";
import { quoteStandardShipping } from "@/app/cart/shipping-actions";
import { UberDelivery, type DeliveryState } from "@/components/cart/uber-delivery";

type CartLine = {
  id: number;
  product_id: number;
  quantity: number;
  available?: number | null;
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
  uberEligible = false,
  mcfOn = false,
  uberDefaults,
  shipPostalDefault = "",
  shipAccountLabel = "",
}: {
  initialLines: CartLine[];
  uberEligible?: boolean;
  mcfOn?: boolean;
  uberDefaults?: DeliveryState["fields"];
  shipPostalDefault?: string;
  shipAccountLabel?: string;
}) {
  const [lines, setLines] = useState(initialLines);
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  const [fitConfirmed, setFitConfirmed] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryState>({
    method: "standard",
    fields: uberDefaults ?? { name: "", phone: "", street: "", city: "", state: "", zip: "" },
    feeCents: null,
  });
  const hasAccountAddr = shipPostalDefault.replace(/[^A-Za-z0-9]/g, "").length >= 6;
  const [shipTo, setShipTo] = useState<"account" | "other">(hasAccountAddr ? "account" : "other");
  const [other, setOther] = useState({ name: uberDefaults?.name ?? "", line1: "", line2: "", city: "", province: "", postal: "" });
  const setO = (k: keyof typeof other, v: string) => setOther((o) => ({ ...o, [k]: v }));
  type AddrSug = { street: string; city: string; zip: string; province: string; label: string };
  const [sugs, setSugs] = useState<AddrSug[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const pickedStreet = useRef("");
  const streetQ = other.line1;
  useEffect(() => {
    if (shipTo !== "other" || streetQ.trim().length < 3 || streetQ === pickedStreet.current) {
      setSugs([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-suggest?scope=canada&q=${encodeURIComponent(streetQ)}`);
        const json = await res.json();
        setSugs(json.suggestions ?? []);
        setSugOpen(true);
      } catch {
        setSugs([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [streetQ, shipTo]);
  function pickSug(sg: AddrSug) {
    pickedStreet.current = sg.street;
    setSugOpen(false);
    setSugs([]);
    setOther((o) => ({ ...o, line1: sg.street, city: sg.city, province: sg.province || o.province, postal: sg.zip }));
  }
  const otherComplete = !!(other.name.trim() && other.line1.trim() && other.city.trim() && other.province && other.postal.replace(/\s/g, "").length >= 6);
  const stdPostal = shipTo === "account" ? shipPostalDefault : other.postal;
  const [stdFeeCents, setStdFeeCents] = useState<number | null>(null);
  const [stdMsg, setStdMsg] = useState<string | null>(null);
  const qtySig = lines.map((l) => `${l.id}:${l.quantity}`).join(",");
  useEffect(() => {
    if (delivery.method !== "standard") return;
    const clean = stdPostal.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setStdFeeCents(null);
    if (clean.length < 6) {
      setStdMsg(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await quoteStandardShipping(clean);
      if (cancelled) return;
      if (r.ok) {
        setStdFeeCents(r.feeCents);
        setStdMsg(null);
      } else {
        setStdMsg(r.message);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [stdPostal, delivery.method, qtySig]);
  const uberReady = (delivery.method === "standard" && stdFeeCents != null && (shipTo === "account" || otherComplete)) || (delivery.feeCents != null && !!delivery.fields.name.trim() && delivery.fields.phone.replace(/\D/g, "").length >= 10);
  const deliveryFee =
    delivery.method === "uber"
      ? delivery.feeCents != null ? delivery.feeCents / 100 : 0
      : stdFeeCents != null ? stdFeeCents / 100 : 0;
  const [shake, setShake] = useState(false);
  const fitRef = useRef<HTMLDivElement>(null);
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

  const stockProblem = lines.some((l) => l.available != null && l.quantity > l.available);
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
            window.dispatchEvent(new Event("cm-cart-changed"));
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
    const line = lines.find((item) => item.id === itemId);
    const overStock = line?.available != null && quantity > line.available;

    setLines((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, quantity } : item,
      ),
    );

    // Keep an over-stock quantity visible locally so the warning stays on screen.
    // Do not send an invalid quantity to the server.
    if (overStock) {
      const timer = timersRef.current.get(itemId);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(itemId);
      }
      setSaveStates((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      return;
    }

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
      window.dispatchEvent(new Event("cm-cart-changed"));
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
                {line.available != null && line.quantity > line.available && (
                  <p role="alert" className="mt-1 text-sm font-semibold text-red-700">
                    {line.available > 0
                      ? `Only ${line.available} left in stock. Lower the quantity to continue.`
                      : "Out of stock. Remove it to continue."}
                  </p>
                )}

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
                      title={
                        line.available != null && line.quantity >= line.available
                          ? `Only ${line.available} left in stock`
                          : undefined
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-brand-tint hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

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

        {uberEligible && <UberDelivery value={delivery} onChange={setDelivery} mcfOn={mcfOn} />}

        {delivery.method === "standard" && (
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm font-bold text-ink">{mcfOn ? "Shipping address: where should we send it?" : "Standard shipping: where should we send it?"}</p>
            {hasAccountAddr && (
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                <input type="radio" name="ship-to" checked={shipTo === "account"} onChange={() => setShipTo("account")} className="mt-1 accent-[var(--brand,#d62828)]" />
                <span>
                  <span className="font-semibold text-ink">Ship to my account address</span>
                  <span className="block text-xs text-muted-foreground">{shipAccountLabel}</span>
                </span>
              </label>
            )}
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
              <input type="radio" name="ship-to" checked={shipTo === "other"} onChange={() => setShipTo("other")} className="mt-1 accent-[var(--brand,#d62828)]" />
              <span className="font-semibold text-ink">Ship to a different location</span>
            </label>
            {shipTo === "other" && (
              <div className="mt-4 grid gap-3 pl-7 sm:grid-cols-2">
                {([
                  ["name", "Full name", "sm:col-span-2", "name"],
                  ["line1", "Street address", "sm:col-span-2", "address-line1"],
                  ["line2", "Apartment, suite, unit (optional)", "sm:col-span-2", "address-line2"],
                  ["city", "City", "", "address-level2"],
                ] as const).map(([k, lbl, span, ac]) => (
                  <div key={k} className={span}>
                    <label htmlFor={`ship-${k}`} className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60">{lbl}</label>
                    <div className="relative">
                      <input
                        id={`ship-${k}`}
                        value={other[k]}
                        onChange={(e) => setO(k, e.target.value)}
                        onFocus={k === "line1" ? () => setSugOpen(true) : undefined}
                        onBlur={k === "line1" ? () => setTimeout(() => setSugOpen(false), 150) : undefined}
                        autoComplete={k === "line1" ? "off" : ac}
                        placeholder={k === "line1" ? "Start typing your street address" : undefined}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm"
                      />
                      {k === "line1" && sugOpen && sugs.length > 0 && (
                        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                          {sugs.map((sg) => (
                            <li key={sg.label}>
                              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickSug(sg)} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-secondary">
                                {sg.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
                <div>
                  <label htmlFor="ship-province" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60">Province</label>
                  <select id="ship-province" value={other.province} onChange={(e) => setO("province", e.target.value)} autoComplete="address-level1" className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm">
                    <option value="">Select province</option>
                    {[["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],["SK","Saskatchewan"],["YT","Yukon"]].map(([c, n]) => (
                      <option key={c} value={c}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ship-postal" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60">Postal code</label>
                  <input id="ship-postal" value={other.postal} onChange={(e) => setO("postal", e.target.value.toUpperCase())} placeholder="M5V 2T6" maxLength={7} autoComplete="postal-code" className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base uppercase outline-none focus:border-brand sm:text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60">Country</label>
                  <input value="Canada" disabled readOnly className="w-full cursor-not-allowed rounded-xl border border-border bg-secondary px-3 py-2.5 text-base text-ink/50 sm:text-sm" />
                </div>
              </div>
            )}
            {stdFeeCents != null && (
              <p className="mt-2 text-sm font-semibold text-ink">
                Shipping: ${(stdFeeCents / 100).toFixed(2)}
                <span className="ml-2 font-normal text-muted-foreground">Usually arrives in 2 to 5 business days after we ship</span>
              </p>
            )}
            {stdMsg && <p className="mt-2 text-sm text-red-700">{stdMsg}</p>}
          </div>
        )}
      </section>

      <div className="h-fit space-y-4 lg:sticky lg:top-28">
        <aside className="overflow-hidden rounded-[28px] bg-ink p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.14)]">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-black tracking-[-0.02em]">Order summary</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>

          <ul className="mt-5 space-y-2 border-b border-white/10 pb-4 text-sm">
            {lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-white/80">
                  <span className="line-clamp-2">{line.product.display_name}</span>
                  <span className="text-xs text-white/45">
                    {line.quantity} × ${line.product.price.toFixed(2)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold">${(line.product.price * line.quantity).toFixed(2)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 pt-2 text-white/70">
              <span>Subtotal</span>
              <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
            </li>
          </ul>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">{delivery.method === "uber" ? "Uber same-day delivery" : "Shipping"}</dt>
              <dd className="text-white/75">
                {delivery.method === "uber"
                  ? delivery.feeCents != null
                    ? `$${deliveryFee.toFixed(2)}`
                    : "Get price above"
                  : stdFeeCents != null
                    ? `$${deliveryFee.toFixed(2)}`
                    : "Enter postal code"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Taxes</dt>
              <dd className="text-white/75">Calculated at payment</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
            <span className="text-sm font-semibold text-white/70">{deliveryFee > 0 ? "Total" : "Subtotal"}</span>
            <span className="text-3xl font-black tracking-tight" aria-live="polite">
              ${(subtotal + deliveryFee).toFixed(2)}
            </span>
          </div>

          <div
            ref={fitRef}
            tabIndex={-1}
            className={`mt-5 rounded-2xl border px-4 py-3.5 transition duration-300 ${
              fitConfirmed ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/15 bg-white/[0.06]"
            } ${shake ? "cm-shake border-brand" : ""}`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={fitConfirmed}
                onChange={(e) => setFitConfirmed(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30 ${
                  fitConfirmed ? "border-emerald-400 bg-emerald-500 text-white" : "border-white/40 bg-transparent"
                }`}
              >
                <Check
                  className={`h-3.5 w-3.5 transition ${fitConfirmed ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
                  strokeWidth={3}
                />
              </span>
              <span className="text-sm leading-5">
                <span className="block font-semibold text-white">I confirm these parts fit my vehicle</span>
                <span className="mt-0.5 block text-xs text-white/55">I checked the year, make, model and engine.</span>
              </span>
            </label>
          </div>

          <form action={beginCheckout}>
            <input type="hidden" name="fit_confirmed" value={fitConfirmed ? "yes" : "no"} />
            <input type="hidden" name="delivery_method" value={delivery.method} />
            <input type="hidden" name="s_mode" value={shipTo} />
            {shipTo === "other" && (
              <>
                <input type="hidden" name="s_name" value={other.name} />
                <input type="hidden" name="s_line1" value={other.line1} />
                <input type="hidden" name="s_line2" value={other.line2} />
                <input type="hidden" name="s_city" value={other.city} />
                <input type="hidden" name="s_province" value={other.province} />
                <input type="hidden" name="s_postal" value={other.postal} />
              </>
            )}
            {delivery.method === "uber" &&
              Object.entries(delivery.fields).map(([k, v]) => <input key={k} type="hidden" name={`u_${k}`} value={v} />)}
            <button
              type="submit"
              disabled={hasPendingChanges || !uberReady || stockProblem || !fitConfirmed}
              aria-disabled={hasPendingChanges || !uberReady || stockProblem || !fitConfirmed}
              className="cm-button-primary mt-3.5 w-full gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Lock className="h-4 w-4" />
              {hasPendingChanges
                ? "Saving cart…"
                : !fitConfirmed
                  ? "Confirm vehicle fit to checkout"
                  : "Secure Checkout"}
            </button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
            <ShieldCheck className="h-4 w-4" />
            Payment handled securely by Stripe
          </p>
        </aside>


      </div>
    </div>
  );
}
