"use client";

import { useState, useTransition } from "react";
import {
  importAmazonTrackingSheet,
  processAmazonMcfQueueNow,
  saveFulfillmentSettings,
} from "@/app/admin/fulfillment/actions";

type Provider = "amazon_mcf" | "delivery_partner";
type Speed = "Standard" | "Expedited" | "Priority";

export default function FulfillmentSettings({
  initialSettings,
  amazonConfigured,
}: {
  initialSettings: {
    amazonMcfEnabled: boolean;
    deliveryPartnerEnabled: boolean;
    preferredProvider: Provider;
    amazonShippingSpeed: Speed;
  };
  amazonConfigured: boolean;
  jobs: unknown[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function saveSettings() {
    start(async () => {
      try {
        await saveFulfillmentSettings(settings);
        setMessage("Fulfillment settings saved.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Unable to save settings.");
      }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-5 lg:grid-cols-2">
        <ProviderCard
          title="Amazon MCF"
          description="Route eligible paid orders to Amazon Multi-Channel Fulfillment."
          checked={settings.amazonMcfEnabled}
          onChange={(v) => setSettings((s) => ({ ...s, amazonMcfEnabled: v }))}
          detail={amazonConfigured ? "Amazon API configured" : "Amazon tracking can also be imported by spreadsheet"}
        />
        <ProviderCard
          title="Delivery Partner"
          description="Use the existing Canuck Motors shipment and tracking workflow."
          checked={settings.deliveryPartnerEnabled}
          onChange={(v) => setSettings((s) => ({ ...s, deliveryPartnerEnabled: v }))}
          detail="Existing shipment workflow"
        />
      </section>

      <section className="rounded-[26px] border bg-white p-6">
        <label className="text-sm font-bold">
          Preferred provider when both are ON
          <select
            value={settings.preferredProvider}
            onChange={(e) =>
              setSettings((s) => ({ ...s, preferredProvider: e.target.value as Provider }))
            }
            className="mt-2 w-full rounded-xl border px-3 py-2.5"
          >
            <option value="amazon_mcf">Amazon MCF first, Delivery Partner fallback</option>
            <option value="delivery_partner">Delivery Partner first, Amazon MCF fallback</option>
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold">
          Amazon shipping speed
          <select
            value={settings.amazonShippingSpeed}
            onChange={(e) =>
              setSettings((s) => ({ ...s, amazonShippingSpeed: e.target.value as Speed }))
            }
            className="mt-2 w-full rounded-xl border px-3 py-2.5"
          >
            <option value="Standard">Standard</option>
            <option value="Expedited">Expedited</option>
            <option value="Priority">Priority</option>
          </select>
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
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
                    const result = await processAmazonMcfQueueNow();
                    setMessage(
                      `MCF queue processed: ${result.succeeded} succeeded, ${result.failed} failed or retried.`
                    );
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Unable to process MCF queue.");
                  }
                })
              }
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Process MCF queue now
            </button>
          )}
        </div>
        {message && <p className="mt-3 text-sm">{message}</p>}
      </section>

      <section className="rounded-[26px] border bg-white p-6">
        <h2 className="text-lg font-black">Amazon MCF tracking import</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Upload the tracking file received from Amazon. We match each row to the Canuck Motors
          order number, save the carrier/tracking details and email the customer using the email
          already stored on their order.
        </p>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Required columns: Order Number and Tracking Number. Optional: Tracking URL, Carrier,
          Service Level and Estimated Delivery. Accepted formats: .xlsx and .csv.
        </p>
        <form
          action={(formData) =>
            start(async () => {
              try {
                const result = await importAmazonTrackingSheet(formData);
                const suffix = result.errors.length
                  ? ` ${result.errors.slice(0, 3).join(" | ")}`
                  : "";
                setMessage(
                  `Tracking import complete: ${result.imported} new shipment(s), ${result.emailed} customer email(s), ${result.skipped} skipped.${suffix}`
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Unable to import tracking spreadsheet.");
              }
            })
          }
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            name="file"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            required
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="cm-button-primary shrink-0 disabled:opacity-60"
          >
            {pending ? "Importing..." : "Upload tracking file"}
          </button>
        </form>
      </section>

    </div>
  );
}

function ProviderCard({
  title,
  description,
  checked,
  onChange,
  detail,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  detail: string;
}) {
  return (
    <div className="rounded-[26px] border bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <p className="mt-4 text-xs font-bold text-brand">{detail}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            checked ? "bg-brand text-white" : "bg-secondary text-ink"
          }`}
        >
          {checked ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
