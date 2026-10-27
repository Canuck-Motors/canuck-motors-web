"use client";

import { useState, useTransition } from "react";
import {
  runAmazonMcfSyncNow,
  saveFulfillmentSettings,
  setUberEnabled,
} from "@/app/admin/fulfillment/actions";

type Provider = "amazon_mcf" | "delivery_partner";
type Speed = "Standard" | "Expedited" | "Priority";
type Mode = "redirect" | "mcf" | "standard";

const MODES: { id: Mode; title: string; text: string }[] = [
  {
    id: "redirect",
    title: "Amazon redirect",
    text: "Product pages show a Buy on Amazon button. No cart, no checkout, no Uber.",
  },
  {
    id: "mcf",
    title: "Amazon MCF",
    text: "Customers pay on our site; Amazon packs and ships the order. Uber is skipped.",
  },
  {
    id: "standard",
    title: "Standard shipping",
    text: "Customers pay on our site; we ship with our own workflow. Uber same-day stays available.",
  },
];

export default function FulfillmentSettings({
  initialSettings,
  amazonConfigured,
}: {
  initialSettings: {
    amazonRedirectEnabled: boolean;
    uberEnabled: boolean;
    amazonMcfEnabled: boolean;
    deliveryPartnerEnabled: boolean;
    preferredProvider: Provider;
    amazonShippingSpeed: Speed;
  };
  amazonConfigured: boolean;
  jobs: unknown[];
}) {
  const [settings] = useState(initialSettings);
  const [mode, setMode] = useState<Mode>(
    initialSettings.amazonRedirectEnabled
      ? "redirect"
      : initialSettings.amazonMcfEnabled && !initialSettings.deliveryPartnerEnabled
        ? "mcf"
        : "standard",
  );
  const [uberOn, setUberOn] = useState(initialSettings.uberEnabled);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function saveSettings() {
    start(async () => {
      try {
        await saveFulfillmentSettings({
          ...settings,
          amazonRedirectEnabled: mode === "redirect",
          amazonMcfEnabled: mode === "mcf",
          // Redirect mode keeps a valid underlying state (partner on); the redirect flag overrides it.
          deliveryPartnerEnabled: mode !== "mcf",
          preferredProvider: mode === "mcf" ? "amazon_mcf" : "delivery_partner",
        });
        setMessage("Fulfillment settings saved.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Unable to save settings.");
      }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-[26px] border bg-white p-6">
        <h2 className="text-lg font-black">How customers buy (only one at a time)</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {MODES.map((m) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={on}
                className={`rounded-2xl border-2 p-5 text-left transition ${
                  on ? "border-brand bg-brand-tint/50" : "border-input hover:border-brand/50"
                }`}
              >
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${on ? "bg-brand text-white" : "bg-secondary text-muted-foreground"}`}>
                  {on ? "ON" : "OFF"}
                </span>
                <p className="mt-3 text-base font-black">{m.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{m.text}</p>
                {m.id === "mcf" && (
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {amazonConfigured ? "Amazon API configured" : "Tracking can also be imported by spreadsheet"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[26px] border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black">Uber same-day delivery</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Offered to customers in Vancouver and Burnaby. Turn it off and the Uber option disappears from the cart. Works with any option above.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={uberOn}
            disabled={pending}
            onClick={() => {
              const next = !uberOn;
              setUberOn(next);
              start(async () => {
                try {
                  const saved = await setUberEnabled(next);
                  setUberOn(saved);
                  setMessage(saved ? "Uber delivery is ON." : "Uber delivery is OFF.");
                } catch (e) {
                  setUberOn(!next);
                  setMessage(e instanceof Error ? e.message : "Unable to change Uber setting.");
                }
              });
            }}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${uberOn ? "bg-brand" : "bg-black/20"}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${uberOn ? "left-7" : "left-1"}`} />
            <span className="sr-only">{uberOn ? "Uber on" : "Uber off"}</span>
          </button>
        </div>
        <p className="mt-2 text-xs font-bold">{uberOn ? "ON" : "OFF"}: changes apply instantly.</p>
        {message && /uber/i.test(message) && (
          <p className={`mt-2 rounded-xl p-3 text-sm font-semibold ${/unable|error|column|run /i.test(message) ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message}</p>
        )}
      </section>

      <section className="rounded-[26px] border bg-white p-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={saveSettings}
            className="cm-button-primary disabled:opacity-60"
          >
            Save settings
          </button>
          {amazonConfigured && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    setMessage("MCF sync result: " + (await runAmazonMcfSyncNow()));
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Unable to run MCF sync.");
                  }
                })
              }
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Run MCF sync now (test)
            </button>
          )}
        </div>
        {message && <p className="mt-3 text-sm">{message}</p>}
      </section>
    </div>
  );
}
