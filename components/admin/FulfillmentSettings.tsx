"use client";

import { useState, useTransition } from "react";
import {
  saveFulfillmentSettings,
  saveProductFulfillment,
} from "@/app/admin/fulfillment/actions";

type Provider = "amazon_mcf" | "delivery_partner";
type Speed = "Standard" | "Expedited" | "Priority";

type Product = {
  id: number;
  sku: string;
  name: string;
  amazonSku: string;
  amazonMcfEligible: boolean;
};

export default function FulfillmentSettings({
  initialSettings,
  amazonConfigured,
  products: initialProducts,
}: {
  initialSettings: {
    amazonMcfEnabled: boolean;
    deliveryPartnerEnabled: boolean;
    preferredProvider: Provider;
    amazonShippingSpeed: Speed;
  };
  amazonConfigured: boolean;
  products: Product[];
  jobs: unknown[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [products, setProducts] = useState(initialProducts);
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
          detail={amazonConfigured ? "Amazon API configured" : "Amazon API credentials required"}
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

        <button
          type="button"
          disabled={pending}
          onClick={saveSettings}
          className="cm-button-primary mt-5 disabled:opacity-60"
        >
          Save settings
        </button>
        {message && <p className="mt-3 text-sm">{message}</p>}
      </section>

      <section className="rounded-[26px] border bg-white p-6">
        <h2 className="text-lg font-black">Amazon SKU mapping</h2>
        <div className="mt-4 space-y-3">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              disabled={pending}
              onChange={(next) =>
                setProducts((rows) => rows.map((p) => (p.id === next.id ? next : p)))
              }
              onSaved={(text) => setMessage(text)}
            />
          ))}
        </div>
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

function ProductRow({
  product,
  disabled,
  onChange,
  onSaved,
}: {
  product: Product;
  disabled: boolean;
  onChange: (value: Product) => void;
  onSaved: (message: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[160px_1fr_1fr_auto_auto] md:items-center">
      <strong>{product.sku}</strong>
      <span className="text-sm">{product.name}</span>
      <input
        value={product.amazonSku}
        onChange={(e) => onChange({ ...product, amazonSku: e.target.value })}
        placeholder="Amazon Seller SKU"
        className="rounded-xl border px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={product.amazonMcfEligible}
          onChange={(e) => onChange({ ...product, amazonMcfEligible: e.target.checked })}
        />
        MCF
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          try {
            await saveProductFulfillment({
              productId: product.id,
              amazonSku: product.amazonSku,
              amazonMcfEligible: product.amazonMcfEligible,
            });
            onSaved(`${product.sku} saved.`);
          } catch (e) {
            onSaved(e instanceof Error ? e.message : "Unable to save product.");
          }
        }}
        className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        Save
      </button>
    </div>
  );
}
