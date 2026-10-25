"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Phone } from "lucide-react";

type Live = {
  courier?: { name?: string | null; phone?: string | null; vehicle?: string | null; image?: string | null };
  dropoffEta?: string | null;
};
type Data = { status: string | null; live: Live; trackingUrl: string | null };

const STEPS = [
  { key: "assigned", label: "Driver assigned" },
  { key: "picked", label: "Order picked up" },
  { key: "delivered", label: "Delivered" },
];

function stepIndex(status: string | null) {
  switch (status) {
    case "pickup":
      return 0;
    case "pickup_complete":
    case "dropoff":
      return 1;
    case "delivered":
      return 2;
    default:
      return -1;
  }
}

function headline(status: string | null) {
  switch (status) {
    case "pickup":
      return "Your driver is heading to the shop";
    case "pickup_complete":
    case "dropoff":
      return "Your parts are on the way";
    case "delivered":
      return "Delivered. Thanks for choosing Canuck Motors";
    case "canceled":
    case "returned":
      return "This delivery was cancelled";
    default:
      return "Finding a driver near you";
  }
}

export default function UberTracking({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch(`/api/uber/tracking/${orderId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Data;
        if (!stop) {
          setData(json);
          setTick((t) => t + 1);
        }
      } catch {
        /* try again on the next tick */
      }
    }
    load();
    const id = setInterval(load, 10000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [orderId]);

  const status = data?.status ?? null;
  const idx = stepIndex(status);
  const c = data?.live?.courier;
  const eta = data?.live?.dropoffEta ? new Date(data.live.dropoffEta) : null;
  const done = status === "delivered";

  return (
    <section className="mt-8 overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
      <div className="p-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="uber-tracking-body"
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <span>
            <span className="cm-eyebrow block">Uber same-day delivery</span>
            <span className="mt-2 block text-2xl font-black text-ink">{headline(status)}</span>
            {eta && !done && (
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                Estimated arrival {eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </span>
          <ChevronDown
            className={`mt-1 h-6 w-6 shrink-0 text-ink transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        <div id="uber-tracking-body" hidden={!open}>

        <ol className="mt-5 grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key} className="text-center">
              <span
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  i <= idx ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {i <= idx ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`mt-1 block text-xs ${i <= idx ? "font-bold text-ink" : "text-muted-foreground"}`}>{s.label}</span>
            </li>
          ))}
        </ol>

        {c?.name && (
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-secondary p-4">
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-black text-white">
                {c.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{c.name}</p>
              {c.vehicle && <p className="text-sm text-muted-foreground">{c.vehicle}</p>}
            </div>
            {c.phone && (
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">
                <Phone className="h-4 w-4" /> Call
              </a>
            )}
          </div>
        )}
        </div>
      </div>

      {open && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/uber/map/${orderId}?t=${tick}`} alt="Delivery map" className="block w-full bg-secondary" />

          {data?.trackingUrl && (
            <div className="p-4 text-right">
              <a href={data.trackingUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand hover:underline">
                Open Uber tracking page
              </a>
            </div>
          )}
        </>
      )}
    </section>
  );
}
