"use client";

import { DateRangeFilter, inRange, ALL_TIME, type DateRange } from "@/components/admin/DateRangeFilter";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Download, Printer, Search, X } from "lucide-react";
import {
  createShipment,
  setOrderNote,
  updateOrderStatus,
} from "@/app/admin/actions";
import { nextStatus, TO_SHIP_STATUSES } from "@/lib/order-flow";

export type OrderRow = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  payment: string;
  total: number;
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
  paid: ["New order", "bg-blue-100 text-blue-800"],
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
    a.name,
    a.line1,
    a.line2,
    [a.city, a.province, a.postal_code].filter(Boolean).join(", "),
    a.country,
  ].filter(Boolean) as string[];
}

function csvCell(v: string | number) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export default function OrdersManager({ initial }: { initial: OrderRow[] }) {
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
    const head = ["Order", "Date", "Customer", "Email", "Status", "Payment", "Total", "Currency", "Items", "Ship to", "Tracking"];
    const lines = list.map((o) =>
      [
        o.number,
        new Date(o.createdOn).toISOString().slice(0, 10),
        o.name,
        o.email,
        label(o.status),
        label(o.payment),
        o.total.toFixed(2),
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-3 py-4 font-semibold text-ink">Order</th>
                <th className="px-3 py-4 font-semibold text-ink">Customer</th>
                <th className="px-3 py-4 font-semibold text-ink">Items</th>
                <th className="px-3 py-4 font-semibold text-ink">Total</th>
                <th className="px-3 py-4 font-semibold text-ink">Status</th>
                <th className="px-3 py-4 font-semibold text-ink">Tracking</th>
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
                      className={`cursor-pointer hover:bg-black/[0.02] ${isOpen ? "bg-brand-tint/40" : ""}`}
                      onClick={() => setOpen(isOpen ? null : o.id)}
                    >
                      <td className="px-3 py-3">
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
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink">{o.name || "Customer"}</div>
                        <div className="text-xs text-muted-foreground">{o.email}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {qty} item{qty === 1 ? "" : "s"}
                        {o.note && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">note</span>}
                      </td>
                      <td className="px-3 py-3 font-bold text-ink">{money(o.total, o.currency)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusText(o.status)[1]}`}>
                          {statusText(o.status)[0]}
                        </span>
                        {o.payment !== "paid" && o.status !== "cancelled" && (
                          <span className="ml-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-ink/70">
                            Not paid
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
                    </tr>

                    {isOpen && (
                      <tr className="bg-secondary/40">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
                            <div>
                              <p className="font-bold text-ink">Items</p>
                              <ul className="mt-2 divide-y rounded-xl border bg-white text-sm">
                                {o.items.map((i, n) => (
                                  <li key={n} className="flex justify-between gap-3 px-3 py-2">
                                    <span>
                                      <span className="font-semibold text-ink">{i.sku}</span>{" "}
                                      <span className="text-muted-foreground">{i.product_name}</span>
                                    </span>
                                    <span className="shrink-0 font-semibold">
                                      {i.quantity} × {money(i.unit_price, o.currency)}
                                    </span>
                                  </li>
                                ))}
                              </ul>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {next && (
                                  <button
                                    type="button"
                                    disabled={pending}
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
                                <Link
                                  href={`/admin/orders/${o.id}/packing-slip`}
                                  target="_blank"
                                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
                                >
                                  <Printer className="h-4 w-4" aria-hidden="true" /> Packing slip
                                </Link>
                              </div>

                              {(o.cancelReason || o.cancelledItems.length > 0) && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                                  {o.cancelReason && (
                                    <>
                                      <p className="font-bold text-red-900">Customer cancellation reason</p>
                                      <p className="mt-1 whitespace-pre-wrap text-red-800">{o.cancelReason}</p>
                                    </>
                                  )}
                                  {o.cancelledItems.length > 0 && (
                                    <div className={o.cancelReason ? "mt-3" : ""}>
                                      <p className="font-bold text-red-900">Items the customer cancelled</p>
                                      {o.cancelledItems.map((c, n) => (
                                        <p key={n} className="mt-1 text-red-800">
                                          {c.sku} x{c.quantity}: {c.reason || "No reason given"}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-ink">Ship to</p>
                              {o.address ? (
                                <>
                                  <address className="mt-2 rounded-xl border bg-white p-3 text-sm not-italic leading-6">
                                    {addressLines(o.address).map((l, n) => (
                                      <div key={n}>{l}</div>
                                    ))}
                                  </address>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(addressLines(o.address).join("\n"));
                                      setMsg("Address copied.");
                                    }}
                                    className="mt-2 text-xs font-bold text-brand hover:underline"
                                  >
                                    Copy address
                                  </button>
                                </>
                              ) : (
                                <p className="mt-2 text-sm text-muted-foreground">No address saved.</p>
                              )}

                              <p className="mt-5 font-bold text-ink">Private note</p>
                              <form
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
                                  rows={3}
                                  defaultValue={o.note}
                                  placeholder="Only staff can see this"
                                  className={input}
                                />
                                <button className="mt-2 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-white hover:bg-brand">
                                  Save note
                                </button>
                              </form>
                            </div>

                            {closed ? (
                              <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-muted-foreground">
                                <p className="font-bold text-ink">No shipment needed</p>
                                <p className="mt-1">
                                  This order is {o.status.replaceAll("_", " ")}, so there is nothing to ship.
                                </p>
                              </div>
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
                              className="rounded-2xl border border-black/5 bg-white p-4"
                            >
                              <p className="font-bold text-ink">Create / update shipment</p>
                              <input name="carrier" defaultValue={o.shipment?.carrier ?? ""} placeholder="Carrier" required className={input} />
                              <input name="tracking_number" defaultValue={o.shipment?.tracking ?? ""} placeholder="Tracking number" required className={input} />
                              <input name="tracking_url" defaultValue={o.shipment?.url ?? ""} placeholder="Carrier tracking URL" className={input} />
                              <input name="service_level" placeholder="Service level, e.g. Ground" className={input} />
                              <input name="estimated_delivery" type="datetime-local" className={input} />
                              <button className="cm-button-primary mt-3 w-full">Save shipment</button>
                            </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
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
