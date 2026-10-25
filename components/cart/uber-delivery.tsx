"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bike, Truck } from "lucide-react";
import { quoteUberDelivery } from "@/app/cart/uber-actions";

export type DeliveryState = {
  method: "standard" | "uber";
  fields: { name: string; phone: string; street: string; city: string; state: string; zip: string };
  feeCents: number | null;
};

const CITIES = ["Vancouver", "Burnaby"] as const;
const FSA: Record<string, string[]> = {
  Vancouver: "V5K V5L V5M V5N V5P V5R V5S V5T V5V V5W V5X V5Y V5Z V6A V6B V6C V6E V6G V6H V6J V6K V6L V6M V6N V6P V6R V6S V6T V6Z".split(" "),
  Burnaby: "V3J V3N V5A V5B V5C V5E V5G V5H V5J".split(" "),
};

function formatPostal(raw: string) {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return c.length > 3 ? `${c.slice(0, 3)} ${c.slice(3)}` : c;
}

const field = "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-brand";

export function UberDelivery({ value, onChange, mcfOn = false }: { value: DeliveryState; onChange: (v: DeliveryState) => void; mcfOn?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const uber = value.method === "uber";
  type Suggestion = { street: string; city: string; zip: string; label: string };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const picked = useRef("");

  // Street suggestions: wait for a short pause in typing, then ask the server.
  const street = value.fields.street;
  useEffect(() => {
    if (!uber || street.trim().length < 3 || street === picked.current) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-suggest?q=${encodeURIComponent(street)}`);
        const json = await res.json();
        setSuggestions(json.suggestions ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [street, uber]);

  function pick(sg: Suggestion) {
    picked.current = sg.street;
    setOpen(false);
    setSuggestions([]);
    onChange({
      ...value,
      fields: { ...value.fields, street: sg.street, city: sg.city, state: "BC", zip: formatPostal(sg.zip) },
      feeCents: null,
    });
  }
  const fsa = value.fields.zip.replace(/\s/g, "").slice(0, 3);
  const zipMismatch = !!value.fields.city && fsa.length === 3 && !FSA[value.fields.city]?.includes(fsa);

  function set(key: keyof DeliveryState["fields"], v: string) {
    setError(null);
    onChange({ ...value, fields: { ...value.fields, [key]: v }, feeCents: null });
  }

  function getPrice() {
    setError(null);
    start(async () => {
      const r = await quoteUberDelivery(value.fields);
      if (r.ok) {
        setEta(r.etaMinutes);
        onChange({ ...value, feeCents: r.feeCents });
      } else {
        setError(r.message);
        onChange({ ...value, feeCents: null });
      }
    });
  }

  const choice = (m: "standard" | "uber", Icon: typeof Truck, title: string, sub: string) => (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
        value.method === m ? "border-brand bg-brand-tint/40" : "border-border hover:border-brand/40"
      }`}
    >
      <input
        type="radio"
        name="delivery_choice"
        checked={value.method === m}
        onChange={() => {
          setError(null);
          onChange({ ...value, method: m, feeCents: null });
        }}
        className="sr-only"
      />
      <Icon className="h-5 w-5 text-brand" />
      <span className="text-sm">
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </label>
  );

  return (
    <section aria-label="Delivery" className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)]">
      <h2 className="text-lg font-black text-ink">Delivery</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {choice("standard", Truck, mcfOn ? "Ship to an address" : "Standard shipping", "Address and shipping at checkout")}
        {choice("uber", Bike, "Uber same-day delivery", "Need it urgently? Delivered by a local courier")}
      </div>

      {uber && (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="Full name" value={value.fields.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
            <input className={field} placeholder="Phone (for the driver)" value={value.fields.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
          </div>
          <div className="relative">
            <input
              className={field}
              placeholder="Start typing your street address"
              value={value.fields.street}
              onChange={(e) => set("street", e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              autoComplete="off"
            />
            {open && suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                {suggestions.map((sg) => (
                  <li key={sg.label}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(sg)}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-brand-tint"
                    >
                      {sg.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className={field}
              value={value.fields.city}
              onChange={(e) => {
                setError(null);
                onChange({ ...value, fields: { ...value.fields, city: e.target.value, state: "BC" }, feeCents: null });
              }}
            >
              <option value="">City</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input className={`${field} bg-secondary`} value="British Columbia" readOnly aria-label="Province" tabIndex={-1} />
            <input
              className={field}
              placeholder="Postal code (V6Z 2E4)"
              value={value.fields.zip}
              onChange={(e) => set("zip", formatPostal(e.target.value))}
              autoComplete="postal-code"
              inputMode="text"
            />
          </div>
          {zipMismatch && (
            <p className="text-xs text-amber-700">
              That postal code doesn&apos;t look like {value.fields.city}. Please double-check it.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={getPrice}
              disabled={pending || !value.fields.street || !value.fields.city || !value.fields.state || !value.fields.zip}
              className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "Checking Uber..." : "Get delivery price"}
            </button>
            {value.feeCents != null && (
              <span className="text-sm font-bold text-emerald-700">
                Delivery ${(value.feeCents / 100).toFixed(2)}
                {eta ? ` · about ${eta} min` : ""}
              </span>
            )}
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>
      )}
    </section>
  );
}
