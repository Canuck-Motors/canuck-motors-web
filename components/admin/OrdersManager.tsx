"use client";

import { DateRangeFilter, inRange, ALL_TIME, type DateRange } from "@/components/admin/DateRangeFilter";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Download, Printer, Search, X } from "lucide-react";
import {
  createShipment,
  setOrderNote,
  testSetOrdersStatus,
  updateOrderStatus,
} from "@/app/admin/actions";
import { importAmazonTrackingSheet } from "@/app/admin/fulfillment/actions";
import { nextStatus, TO_SHIP_STATUSES } from "@/lib/order-flow";

export type OrderRow = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  payment: string;
  provider: string;
  routingStatus: string;
  fulfillmentError: string;
  total: number;
  shippingFee: number;
  salesTax: number;
  shippingZone: string;
  shippingWeight: number | null;
  shippingCost: number | null;
  deliveryMethod: string;
  currency: string;
  email: string;
  name: string;
  createdOn: string;
  address: {
    name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  note: string;
  cancelReason: string;
  cancelledItems: { product_name: string; sku: string; quantity: number; reason: string }[];
  items: { product_name: string; sku: string; quantity: number; unit_price: number }[];
  shipment: { carrier: string; tracking: string; url: string; status: string } | null;
};

type Filter = "all" | "toship" | "shipped" | "delivered" | "cancelled" | "unpaid";
const PAGE = 50;
const label = (s: string) => s.replaceAll("_", " ");

// Plain-words status for the shop owner
const STATUS_TEXT: Record<string, [string, string]> = {
  paid: ["New order", "bg-brand-tint text-brand"],
  processing: ["Being prepared", "bg-amber-100 text-amber-800"],
  packed: ["Packed", "bg-amber-100 text-amber-800"],
  ready_to_ship: ["Ready to ship", "bg-amber-100 text-amber-800"],
  shipped: ["Shipped", "bg-indigo-100 text-indigo-800"],
  out_for_delivery: ["Out for delivery", "bg-indigo-100 text-indigo-800"],
  delivered: ["Delivered", "bg-green-100 text-green-800"],
  cancelled: ["Cancelled", "bg-red-100 text-red-800"],
  cancellation_requested: ["Customer wants to cancel", "bg-red-100 text-red-800"],
  refund_pending: ["Refund in progress", "bg-red-100 text-red-800"],
  refunded: ["Refunded", "bg-red-100 text-red-800"],
  pending: ["Waiting for payment", "bg-secondary text-ink/70"],
  payment_pending: ["Waiting for payment", "bg-secondary text-ink/70"],
};
const statusText = (s: string): [string, string] =>
  STATUS_TEXT[s] ?? [label(s), "bg-secondary text-ink/70"];

const NEXT_BUTTON: Record<string, string> = {
  paid: "Start preparing this order",
  processing: "Mark as packed",
  packed: "Mark as ready to ship",
  ready_to_ship: "Mark as shipped",
  shipped: "Mark as out for delivery",
  out_for_delivery: "Mark as delivered",
  pending: "Cancel this order",
  payment_pending: "Cancel this order",
};
const money = (n: number, c = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: c }).format(n);

const isToShip = (o: OrderRow) => o.payment === "paid" && TO_SHIP_STATUSES.includes(o.status);
const isShipped = (o: OrderRow) => ["shipped", "out_for_delivery"].includes(o.status);
const isUnpaid = (o: OrderRow) => o.payment !== "paid" && o.status !== "cancelled";

function addressLines(a: OrderRow["address"]) {
  if (!a) return [];
  return [
    a.line1,
    a.line2 && a.line2 !== a.line1 ? a.line2 : null,
    [a.city, a.province, a.postal_code].filter(Boolean).join(", "),
    a.country,
  ].filter(Boolean) as string[];
}

function csvCell(v: string | number) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export default function OrdersManager({
  initial,
  amazonMcfEnabled,
  deliveryPartnerEnabled,
}: {
  initial: OrderRow[];
  amazonMcfEnabled: boolean;
  deliveryPartnerEnabled: boolean;
}) {
  const router = useRouter();
  // Live updates: re-read the orders every 10 seconds while this tab is open
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);

  const [q, setQ] = useState("");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [filter, setFilter] = useState<Filter>("toship");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isDev = process.env.NODE_ENV !== "production"; // test-only controls, never in production
  const cols = 6 + (isDev ? 2 : 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState("");
  const applyStatus = (ids: string[], status: string) => {
    if (!status || !ids.length) return;
    run(async () => {
      await testSetOrdersStatus(ids, status);
      setSelected(new Set());
      setBulk("");
      router.refresh();
      return `${ids.length} order${ids.length === 1 ? "" : "s"} set to ${status}.`;
    });
  };
  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 9000);
    return () => clearTimeout(t);
  }, [msg]);
  const [pending, start] = useTransition();

  const scoped = useMemo(() => rows.filter((o) => inRange(o.createdOn, range)), [rows, range]);

  const counts = useMemo(
    () => ({
      all: scoped.length,
      toship: scoped.filter(isToShip).length,
      shipped: scoped.filter(isShipped).length,
      delivered: scoped.filter((o) => o.status === "delivered").length,
      cancelled: scoped.filter((o) => o.status === "cancelled").length,
      unpaid: scoped.filter(isUnpaid).length,
    }),
    [scoped]
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return scoped.filter((o) => {
      if (filter === "toship" && !isToShip(o)) return false;
      if (filter === "shipped" && !isShipped(o)) return false;
      if (filter === "delivered" && o.status !== "delivered") return false;
      if (filter === "cancelled" && o.status !== "cancelled") return false;
      if (filter === "unpaid" && !isUnpaid(o)) return false;
      if (!term) return true;
      return `${o.number} ${o.name} ${o.email} ${o.shipment?.tracking ?? ""} ${o.items
        .map((i) => i.sku)
        .join(" ")}`
        .toLowerCase()
        .includes(term);
    });
  }, [scoped, q, filter]);

  const run = (fn: () => Promise<string | void>) =>
    start(async () => {
      try {
        const m = await fn();
        setMsg(m ?? null);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  const downloadCsv = (list: OrderRow[]) => {
    const head = ["Order", "Date", "Customer", "Email", "Status", "Payment", "Total (incl. shipping and tax)", "Sales tax", "Shipping paid", "Parcel kg", "Label cost", "Method", "Currency", "Items", "Ship to", "Tracking"];
    const lines = list.map((o) =>
      [
        o.number,
        new Date(o.createdOn).toISOString().slice(0, 10),
        o.name,
        o.email,
        label(o.status),
        label(o.payment),
        (o.total + o.shippingFee + o.salesTax).toFixed(2),
        o.salesTax.toFixed(2),
        o.shippingFee.toFixed(2),
        o.shippingWeight == null ? "" : o.shippingWeight.toFixed(2),
        o.shippingCost == null ? "" : o.shippingCost.toFixed(2),
        o.deliveryMethod,
        o.currency,
        o.items.map((i) => `${i.quantity}x ${i.sku}`).join("; "),
        addressLines(o.address).join(", "),
        o.shipment?.tracking ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tabs: [Filter, string][] = [
    ["toship", "New orders (to ship)"],
    ["shipped", "Shipped"],
    ["delivered", "Delivered"],
    ["cancelled", "Cancelled"],
    ["unpaid", "Not paid yet"],
    ["all", "All orders"],
  ];

  const input = "mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm";

  return (
    <div className="mt-8">
      {amazonMcfEnabled && (
        <section className="mb-6 rounded-[24px] border border-orange-200 bg-orange-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-black text-ink">Amazon MCF tracking import</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Upload the Amazon tracking spreadsheet here. The system matches each row using
                the Canuck Motors order number, saves the tracking details and emails the customer.
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Required: Order Number and Tracking Number. Optional: Tracking URL, Carrier,
                Service Level and Estimated Delivery. Supports .xlsx and .csv.
              </p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-900">
              Amazon MCF ON
            </span>
          </div>

          <form
            action={(formData) =>
              run(async () => {
                const result = await importAmazonTrackingSheet(formData);
                const extra = result.errors.length
                  ? ` ${result.errors.slice(0, 3).join(" | ")}`
                  : "";
                router.refresh();
                return `Amazon tracking imported: ${result.imported} new shipment(s), ${result.emailed} customer email(s), ${result.skipped} skipped.${extra}`;
              })
            }
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              name="file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              required
              className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="cm-button-primary shrink-0 disabled:opacity-60"
            >
              {pending ? "Importing..." : "Upload Amazon tracking"}
            </button>
          </form>
        </section>
      )}

      {!deliveryPartnerEnabled && (
        <div className="mb-6 rounded-2xl border border-black/10 bg-white p-4 text-sm text-muted-foreground">
          <span className="font-bold text-ink">Delivery Partner is OFF.</span>{" "}
          Manual carrier, tracking and shipment controls are hidden.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[260px] flex-1 items-center rounded-full border border-black/10 bg-white px-4 shadow-sm focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search order number, name, email, part number, tracking..."
            aria-label="Search orders"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <DateRangeFilter
          dates={rows.map((o) => o.createdOn)}
          value={range}
          onChange={(r) => {
            setRange(r);
            setLimit(PAGE);
          }}
        />
        <button
          type="button"
          onClick={() => downloadCsv(shown)}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
        </button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        A paid order shows up as <b>New order</b>. Click an order to open it, then use the big button to move it
        forward one step at a time. Cancelled orders appear under <b>Cancelled</b>.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {tabs.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setLimit(PAGE);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === key
                ? "bg-ink text-white"
                : "border border-black/10 bg-white text-ink hover:border-brand hover:text-brand"
            }`}
          >
            {text} <span className="opacity-60">{counts[key]}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div
          role="status"
          aria-live="polite"
          className={`cm-toast fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_50px_rgba(0,0,0,0.25)] ${
            /could not|not set up|no customer|went wrong|failed|error/i.test(msg)
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-900"
          }`}
        >
          <span className="flex-1">{msg}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Close message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={`mt-4 overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_16px_46px_rgba(0,0,0,0.06)] ${
          pending ? "opacity-70" : ""
        }`}
      >
        {isDev && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {selected.size} selected (test only)
            <select
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm"
            >
              <option value="">Set status...</option>
              <option value="shipped">Shipped</option>
              <option value="out_for_delivery">Out for delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancel</option>
            </select>
            <button
              type="button"
              disabled={pending || !bulk}
              onClick={() => applyStatus([...selected], bulk)}
              className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Apply to selected
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs underline">
              Clear
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-secondary">
              <tr>
                {isDev && (
                  <th className="w-10 px-3 py-4">
                    <input
                      type="checkbox"
                      aria-label="Select all orders"
                      checked={shown.slice(0, limit).length > 0 && shown.slice(0, limit).every((r) => selected.has(r.id))}
                      onChange={(e) => setSelected(e.target.checked ? new Set(shown.slice(0, limit).map((r) => r.id)) : new Set())}
                    />
                  </th>
                )}
                <th className="px-3 py-4 font-semibold text-ink">Order</th>
                <th className="px-3 py-4 font-semibold text-ink">Customer</th>
                <th className="px-3 py-4 font-semibold text-ink">Items</th>
                <th className="px-3 py-4 font-semibold text-ink">Total</th>
                <th className="px-3 py-4 font-semibold text-ink">Status</th>
                <th className="px-3 py-4 font-semibold text-ink">Tracking</th>
                {isDev && <th className="px-3 py-4 font-semibold text-ink">Set status</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.slice(0, limit).map((o) => {
                const isOpen = open === o.id;
                const next = nextStatus(o.status);
                const closed =
                  ["cancelled", "refunded", "cancellation_requested", "refund_pending"].includes(o.status) ||
                  o.fulfillment === "cancelled";
                const qty = o.items.reduce((t, i) => t + i.quantity, 0);
                return (
                  <Fragment key={o.id}>
                    <tr
                      className={`cursor-pointer ${isOpen ? "bg-brand-tint" : "hover:bg-black/[0.02]"}`}
                      onClick={() => setOpen(isOpen ? null : o.id)}
                    >
                      {isDev && (
                        <td
                          className={`border-l-4 px-3 py-3 ${isOpen ? "border-brand" : "border-transparent"}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select ${o.number}`}
                            checked={selected.has(o.id)}
                            onChange={() => toggle(o.id)}
                          />
                        </td>
                      )}
                      <td className={`${isDev ? "" : "border-l-4"} px-3 py-3 ${
                        !isDev && isOpen ? "border-brand" : !isDev ? "border-transparent" : ""
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-ink">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          )}
                          {o.number}
                        </div>
                        <div className="pl-6 text-xs text-muted-foreground">
                          {new Date(o.createdOn).toLocaleString("en-CA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                        {isToShip(o) && (() => {
                          const days = Math.floor((Date.now() - new Date(o.createdOn).getTime()) / 86400000);
                          return days >= 1 ? (
                            <div className={`pl-6 text-xs font-bold ${days >= 3 ? "text-red-700" : "text-amber-700"}`}>
                              Waiting {days} day{days === 1 ? "" : "s"}
                            </div>
                          ) : null;
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-ink">{o.name || "Customer"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{o.email}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {qty} item{qty === 1 ? "" : "s"}
                        {o.note && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">note</span>}
                      </td>
                      <td className="px-3 py-3 font-bold text-ink">
                        {money(o.total + o.shippingFee + o.salesTax, o.currency)}
                        {o.shippingFee > 0 && (
                          <div className="text-[11px] font-normal text-muted-foreground">
                            incl. {money(o.shippingFee, o.currency)} shipping{o.salesTax > 0 ? ` + ${money(o.salesTax, o.currency)} tax` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusText(o.status)[1]}`}>
                          {statusText(o.status)[0]}
                        </span>
                        {o.payment !== "paid" && o.status !== "cancelled" && (
                          <span className="ml-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-ink/70">
                            Not paid
                          </span>
                        )}
                        {next && !closed && (
                          <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">
                            Next: {NEXT_BUTTON[o.status] ?? `Mark ${label(next)}`}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        {o.shipment?.tracking ? (
                          o.shipment.url ? (
                            <a
                              href={o.shipment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-brand hover:underline"
                            >
                              {o.shipment.tracking}
                            </a>
                          ) : (
                            o.shipment.tracking
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {isDev && (
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex min-w-[168px] items-center">
                            <select
                              aria-label={`Set status for ${o.number}`}
                              disabled={pending}
                              value=""
                              onChange={(e) => applyStatus([o.id], e.target.value)}
                              className="w-full appearance-none rounded-full border border-black/10 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-ink shadow-sm outline-none transition hover:border-brand/50 hover:shadow-md focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Update status</option>
                              <option value="shipped">Mark as shipped</option>
                              <option value="out_for_delivery">Out for delivery</option>
                              <option value="delivered">Mark as delivered</option>
                              <option value="cancelled">Cancel order</option>
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        </td>
                      )}
                    </tr>

                    {isOpen && (
                      <tr className="bg-brand-tint/40">
                        <td colSpan={cols} className="border-l-4 border-brand px-5 py-5">
                          <section className="rounded-[24px] border border-black/5 bg-white shadow-[0_12px_34px_rgba(0,0,0,0.06)]">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Order details</p>
                                <p className="mt-1 font-black text-ink">{o.number}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusText(o.status)[1]}`}>
                                  {statusText(o.status)[0]}
                                </span>
                                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold capitalize text-ink/70">
                                  {label(o.deliveryMethod)}
                                </span>
                              </div>
                            </div>

                            <div className="px-6 py-6">
                              <div className="grid gap-x-10 gap-y-7 md:grid-cols-3">
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Items</p>
                                  <div className="mt-3 space-y-2">
                                    {o.items.slice(0, 3).map((item, n) => (
                                      <div key={n}>
                                        <p className="font-black text-ink">{item.product_name}</p>
                                        <p className="mt-0.5 text-sm text-muted-foreground">
                                          {item.sku} · Qty {item.quantity}
                                        </p>
                                      </div>
                                    ))}
                                    {o.items.length > 3 && (
                                      <p className="text-sm font-semibold text-brand">+{o.items.length - 3} more item{o.items.length - 3 === 1 ? "" : "s"}</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Total</p>
                                  <p className="mt-3 text-3xl font-black text-ink">
                                    {money(o.total + o.shippingFee + o.salesTax, o.currency)}
                                  </p>
                                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                                    Payment: {label(o.payment)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Ordered on</p>
                                  <p className="mt-3 text-lg font-black text-ink">
                                    {new Date(o.createdOn).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {new Date(o.createdOn).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
                                  </p>
                                </div>

                                <div className="md:col-span-1">
                                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Customer</p>
                                  <p className="mt-3 font-black text-ink">{o.name || "Customer"}</p>
                                  {o.email && (
                                    <a href={`mailto:${o.email}`} className="mt-2 block text-sm text-muted-foreground hover:text-brand">
                                      {o.email}
                                    </a>
                                  )}
                                </div>

                                <div className="md:col-span-2">
                                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Customer address</p>
                                  {o.address ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                      <address className="text-sm not-italic leading-6 text-ink">
                                        {addressLines(o.address).join(" · ")}
                                      </address>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard?.writeText(addressLines(o.address).join("\n"));
                                          setMsg("Address copied.");
                                        }}
                                        className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm hover:border-brand hover:text-brand"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="mt-3 text-sm text-muted-foreground">No shipping address saved.</p>
                                  )}
                                </div>
                              </div>

                              {(o.cancelReason || o.cancelledItems.length > 0) && (
                                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                  {o.cancelReason && <p><b>Cancellation:</b> {o.cancelReason}</p>}
                                  {o.cancelledItems.map((item, n) => (
                                    <p key={n} className="mt-1">
                                      {item.sku} × {item.quantity}: {item.reason || "No reason given"}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="border-t border-black/5 bg-secondary/20 px-6 py-5">
                              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Fulfillment</p>
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusText(o.status)[1]}`}>
                                      {statusText(o.status)[0]}
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-ink/70 ring-1 ring-black/5">
                                      {label(o.deliveryMethod)}
                                    </span>
                                  </div>

                                  {closed ? (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                      No shipment is needed because this order is {label(o.status)}.
                                    </p>
                                  ) : o.provider === "amazon_mcf" ? (
                                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
                                      <p className="font-bold text-ink">Amazon MCF</p>
                                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Amazon handles packing and delivery. Upload tracking from the Orders page when available.
                                      </p>
                                      {o.shipment?.tracking && (
                                        <p className="mt-2 text-sm font-bold text-ink">Tracking: {o.shipment.tracking}</p>
                                      )}
                                    </div>
                                  ) : !deliveryPartnerEnabled ? (
                                    <p className="mt-3 text-sm text-muted-foreground">Delivery Partner is switched off.</p>
                                  ) : (
                                    <form
                                      action={(fd) =>
                                        run(async () => {
                                          const emailNote = await createShipment(
                                            o.id,
                                            String(fd.get("carrier") || ""),
                                            String(fd.get("tracking_number") || ""),
                                            String(fd.get("tracking_url") || ""),
                                            String(fd.get("service_level") || ""),
                                            String(fd.get("estimated_delivery") || "")
                                          );
                                          return `Shipment saved for ${o.number}. ${emailNote ?? ""}`.trim();
                                        })
                                      }
                                      className="mt-3 grid gap-2 sm:grid-cols-2"
                                    >
                                      <input name="carrier" list="carrier-list" defaultValue={o.shipment?.carrier ?? (o.deliveryMethod === "standard" ? "Chit Chats" : "")} placeholder="Carrier" required className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" />
                                      <datalist id="carrier-list">
                                        <option value="Chit Chats" />
                                        <option value="Canada Post" />
                                        <option value="Purolator" />
                                        <option value="UPS" />
                                        <option value="FedEx" />
                                        <option value="Canpar" />
                                      </datalist>
                                      <input name="tracking_number" defaultValue={o.shipment?.tracking ?? ""} placeholder="Tracking number" required className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" />
                                      <input name="tracking_url" defaultValue={o.shipment?.url ?? ""} placeholder="Tracking link" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm sm:col-span-2" />
                                      <button className="cm-button-primary sm:col-span-2">Save shipment</button>
                                    </form>
                                  )}

                                  {o.fulfillmentError && (
                                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                                      {o.fulfillmentError}
                                    </p>
                                  )}
                                </div>

                                <div className="lg:border-l lg:border-black/5 lg:pl-5">
                                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Actions & note</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {next && deliveryPartnerEnabled && o.provider !== "amazon_mcf" && (
                                      <button
                                        type="button"
                                        disabled={pending || (next === "shipped" && o.deliveryMethod !== "uber" && !o.shipment?.tracking)}
                                        title={next === "shipped" && o.deliveryMethod !== "uber" && !o.shipment?.tracking ? "Add tracking first" : undefined}
                                        onClick={() =>
                                          run(async () => {
                                            await updateOrderStatus(o.id, next);
                                            return `${o.number}: ${statusText(next)[0]}.`;
                                          })
                                        }
                                        className="cm-button-dark disabled:opacity-60"
                                      >
                                        {NEXT_BUTTON[o.status] ?? `Mark ${label(next)}`}
                                      </button>
                                    )}
                                    {deliveryPartnerEnabled && o.provider !== "amazon_mcf" && (
                                      <Link
                                        href={`/admin/orders/${o.id}/packing-slip`}
                                        target="_blank"
                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
                                      >
                                        <Printer className="h-4 w-4" aria-hidden="true" /> Packing slip
                                      </Link>
                                    )}
                                  </div>

                                  <form
                                    className="mt-4"
                                    action={(fd) =>
                                      run(async () => {
                                        const note = String(fd.get("note") || "");
                                        await setOrderNote(o.id, note);
                                        setRows((rs) => rs.map((r) => (r.id === o.id ? { ...r, note } : r)));
                                        return "Note saved.";
                                      })
                                    }
                                  >
                                    <textarea
                                      name="note"
                                      rows={2}
                                      defaultValue={o.note}
                                      placeholder="Private staff note"
                                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                                    />
                                    <button className="mt-2 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-white hover:bg-brand">
                                      Save note
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          </section>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={cols} className="px-5 py-10 text-center text-muted-foreground">
                    No orders match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {shown.length > limit && (
          <div className="border-t p-4 text-center">
            <button
              type="button"
              onClick={() => setLimit(Infinity)}
              className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              Show all ({shown.length - limit} more)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
