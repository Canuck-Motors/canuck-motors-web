"use client";

import { DateRangeFilter, inRange, ALL_TIME, type DateRange } from "@/components/admin/DateRangeFilter";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, Download, Mail, Search, X } from "lucide-react";
import {
  createAmazonReturnAuthorization,
  createExchangeReplacement,
  getReturnPhotos,
  handleReturnStock,
  issueReturnRefund,
  sendReturnInstructions,
  syncAmazonReturnStatus,
  updateReturnRequest,
} from "@/app/admin/returns/actions";

export type ReturnRow = {
  id: string;
  orderId: string;
  type: string;
  status: string;
  reasonCode: string;
  reasonText: string;
  notes: string;
  requestedOn: string;
  carrier: string;
  tracking: string;
  fulfillmentProvider: string;
  amazonReturnStatus: string;
  amazonRmaId: string;
  amazonRmaPageUrl: string;
  amazonReturnError: string;
  amazonReturnSyncedOn: string;
  replacementOrderId: string | null;
  replacementPaymentUrl: string;
  replacementAmountDue: number;
  replacementRefundDue: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  address: {
    name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  currency: string;
  items: {
    id: number;
    quantity: number;
    received: number;
    productId: number | null;
    name: string;
    sku: string;
    unitPrice: number;
    amazonSellerSku: string;
    amazonReturnReasonCode: string;
    amazonReturnItemStatus: string;
    amazonReturnCondition: string;
    amazonFulfillmentCenterId: string;
  }[];
  subtotal: number;
  stock: "restocked" | "damaged" | null;
  activity: { action: string; detail: string; at: string; by: string }[];
};

type Product = { id: number; sku: string; name: string; price: number };
type Filter = "action" | "waiting" | "refund" | "exchange" | "done" | "all";

const label = (s: string) => s.replaceAll("_", " ");
const money = (n: number, c = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: c }).format(n);
const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

const NEEDS_ACTION = ["requested", "under_review", "received", "refund_pending", "inspection_failed", "exchange_processing"];
const WAITING = ["approved", "label_issued", "in_transit"];
const CLOSED = ["completed", "rejected", "cancelled", "canceled", "refunded", "denied", "resolved"];
const isRefundDue = (r: ReturnRow) => r.type === "return" && ["received", "refund_pending"].includes(r.status);
const isOpen = (r: ReturnRow) => !CLOSED.includes(r.status);
const OVERDUE_DAYS = 5;

const STATUS_COLOR = (s: string) =>
  CLOSED.includes(s) ? "bg-secondary text-ink/70" : NEEDS_ACTION.includes(s) ? "bg-brand-tint text-brand" : "bg-amber-100 text-amber-800";

export default function ReturnsManager({
  initial,
  products,
  needsSql,
}: {
  initial: ReturnRow[];
  products: Product[];
  needsSql: boolean;
}) {
  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [filter, setFilter] = useState<Filter>("action");
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);
  const [photos, setPhotos] = useState<Record<string, string[] | "loading">>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        setMsg({ ok: true, text: ok });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
      }
    });

  const toggleRow = (id: string) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next && !photos[next]) {
      setPhotos((p) => ({ ...p, [next]: "loading" }));
      getReturnPhotos(next)
        .then((urls) => setPhotos((p) => ({ ...p, [next]: urls })))
        .catch(() => setPhotos((p) => ({ ...p, [next]: [] })));
    }
  };

  const scoped = useMemo(() => rows.filter((r) => inRange(r.requestedOn, range)), [rows, range]);

  const counts = useMemo(
    () => ({
      action: scoped.filter((r) => NEEDS_ACTION.includes(r.status)).length,
      waiting: scoped.filter((r) => WAITING.includes(r.status)).length,
      refund: scoped.filter(isRefundDue).length,
      exchange: 0,
      done: scoped.filter((r) => CLOSED.includes(r.status)).length,
      all: scoped.length,
    }),
    [scoped]
  );

  const summary = useMemo(() => {
    const openRows = rows.filter(isOpen);
    return {
      open: openRows.length,
      refundCount: rows.filter(isRefundDue).length,
      refundAmount: rows.filter(isRefundDue).reduce((t, r) => t + r.subtotal, 0),
      overdue: openRows.filter((r) => days(r.requestedOn) > OVERDUE_DAYS).length,
    };
  }, [rows]);

  const report = useMemo(() => {
    const top = (keyOf: (r: ReturnRow) => string[]) => {
      const m = new Map<string, number>();
      for (const r of rows) for (const k of keyOf(r)) if (k) m.set(k, (m.get(k) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    return {
      reasons: top((r) => [label(r.reasonCode)]),
      parts: top((r) => r.items.map((i) => i.sku)),
    };
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return scoped.filter((r) => {
      if (filter === "action" && !NEEDS_ACTION.includes(r.status)) return false;
      if (filter === "waiting" && !WAITING.includes(r.status)) return false;
      if (filter === "refund" && !isRefundDue(r)) return false;
      if (filter === "exchange" && r.type !== "exchange") return false;
      if (filter === "done" && !CLOSED.includes(r.status)) return false;
      if (!term) return true;
      return `${r.orderNumber} ${r.customerName} ${r.customerEmail} ${r.tracking} ${r.items
        .map((i) => i.sku)
        .join(" ")}`
        .toLowerCase()
        .includes(term);
    });
  }, [scoped, q, filter]);

  const downloadCsv = () => {
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    };
    const lines = shown.map((r) =>
      [
        r.orderNumber,
        new Date(r.requestedOn).toISOString().slice(0, 10),
        r.type,
        label(r.status),
        label(r.reasonCode),
        r.customerName,
        r.customerEmail,
        r.items.map((i) => `${i.quantity}x ${i.sku}`).join("; "),
        r.subtotal.toFixed(2),
        r.tracking,
      ]
        .map(esc)
        .join(",")
    );
    const blob = new Blob(
      [["Order,Requested,Type,Status,Reason,Customer,Email,Items,Item value,Return tracking", ...lines].join("\n")],
      { type: "text/csv" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tabs: [Filter, string][] = [
    ["action", "Needs action"],
    ["waiting", "Waiting for item"],
    ["refund", "Refund due"],
    ["done", "Completed"],
    ["all", "All"],
  ];
  const input = "mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm";

  return (
    <div className="mt-8">
      {needsSql && (
        <p className="mb-4 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
          Optional setup: run <code>database/admin_returns_extras.sql</code> in the Supabase SQL editor to turn on
          the history timeline and the restock buttons.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Open requests", String(summary.open), ""],
          ["Refunds to pay", String(summary.refundCount), money(summary.refundAmount)],
          [`Overdue (> ${OVERDUE_DAYS} days)`, String(summary.overdue), summary.overdue ? "needs attention" : ""],
          ["All requests", String(rows.length), ""],
        ].map(([title, value, sub]) => (
          <div
            key={title}
            className={`rounded-[22px] border bg-white p-5 shadow-sm ${
              title.startsWith("Overdue") && summary.overdue ? "border-brand/40" : "border-black/5"
            }`}
          >
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-ink">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          ["Top return reasons", report.reasons],
          ["Parts returned most", report.parts],
        ].map(([title, list]) => (
          <div key={String(title)} className="rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-ink">{String(title)}</p>
            {(list as [string, number][]).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {(list as [string, number][]).map(([k, n]) => (
                  <li key={k} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate capitalize text-ink">{k}</span>
                    <span
                      className="h-2 rounded-full bg-brand/70"
                      style={{ width: `${(n / (list as [string, number][])[0][1]) * 100}%`, maxWidth: "55%" }}
                    />
                    <span className="font-bold text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[260px] flex-1 items-center rounded-full border border-black/10 bg-white px-4 shadow-sm focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(50);
            }}
            placeholder="Search order, customer, email, part number, tracking..."
            aria-label="Search returns"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <DateRangeFilter
          dates={rows.map((r) => r.requestedOn)}
          value={range}
          onChange={(r) => {
            setRange(r);
            setLimit(50);
          }}
        />
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tabs.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setLimit(50);
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
        <p
          role="status"
          className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-semibold ${
            msg.ok ? "bg-black/5 text-ink" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
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
                <th className="px-5 py-4 font-semibold text-ink">Order</th>
                <th className="px-3 py-4 font-semibold text-ink">Customer</th>
                <th className="px-3 py-4 font-semibold text-ink">Type</th>
                <th className="px-3 py-4 font-semibold text-ink">Reason</th>
                <th className="px-3 py-4 font-semibold text-ink">Item value</th>
                <th className="px-3 py-4 font-semibold text-ink">Status</th>
                <th className="px-3 py-4 font-semibold text-ink">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.slice(0, limit).map((r) => {
                const isOpenRow = open === r.id;
                const age = days(r.requestedOn);
                const first = r.items[0];
                const maxQty = first ? (first.received || first.quantity || 1) : 1;
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={`cursor-pointer hover:bg-black/[0.02] ${isOpenRow ? "bg-brand-tint/40" : ""}`}
                      onClick={() => toggleRow(r.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 font-bold text-ink">
                          {isOpenRow ? (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          )}
                          {r.orderNumber}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink">{r.customerName || "Customer"}</div>
                        <div className="text-xs text-muted-foreground">{r.customerEmail}</div>
                      </td>
                      <td className="px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-brand">{r.type}</td>
                      <td className="px-3 py-3 capitalize text-muted-foreground">{label(r.reasonCode)}</td>
                      <td className="px-3 py-3 font-bold text-ink">{money(r.subtotal, r.currency)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_COLOR(r.status)}`}>
                          {label(r.status)}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-3 text-xs font-semibold ${
                          isOpen(r) && age > OVERDUE_DAYS ? "text-brand" : "text-muted-foreground"
                        }`}
                      >
                        {age === 0 ? "today" : `${age} d`}
                      </td>
                    </tr>

                    {isOpenRow && (
                      <tr className="bg-secondary/40">
                        <td colSpan={7} className="px-6 py-5">
                          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">
                            {/* Details */}
                            <div>
                              <div className="mb-3 rounded-2xl bg-white p-4 text-sm leading-6">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Customer</p>
                                <p className="mt-1 font-bold text-ink">{r.customerName || "No name saved"}</p>
                                <p className="text-muted-foreground">{r.customerEmail || "No email saved"}</p>
                                {r.address ? (
                                  <address className="mt-2 not-italic text-muted-foreground">
                                    {[
                                      r.address.name,
                                      r.address.line1,
                                      r.address.line2,
                                      [r.address.city, r.address.province, r.address.postal_code].filter(Boolean).join(", "),
                                      r.address.country,
                                    ]
                                      .filter(Boolean)
                                      .map((l, n) => (
                                        <div key={n}>{l}</div>
                                      ))}
                                  </address>
                                ) : (
                                  <p className="mt-2 text-muted-foreground">No address saved.</p>
                                )}
                              </div>
                              <div className="rounded-2xl bg-white p-4">
                                <p className="font-bold capitalize text-ink">{label(r.reasonCode)}</p>
                                {r.reasonText && (
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{r.reasonText}</p>
                                )}
                              </div>
                              {Array.isArray(photos[r.id]) && (photos[r.id] as string[]).length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-bold text-ink">Customer photos</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(photos[r.id] as string[]).map((u, n) => (
                                      <a key={n} href={u} target="_blank" rel="noopener noreferrer">
                                        <Image
                                          src={u}
                                          alt={`Customer photo ${n + 1}`}
                                          width={96}
                                          height={96}
                                          unoptimized
                                          className="h-24 w-24 rounded-xl border object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <ul className="mt-3 space-y-2">
                                {r.items.map((i) => (
                                  <li
                                    key={i.id}
                                    className="flex flex-wrap justify-between gap-2 rounded-2xl border bg-white p-3 text-sm"
                                  >
                                    <span>
                                      <span className="font-bold text-ink">{i.name}</span>
                                      <span className="block text-xs text-muted-foreground">
                                        {i.sku} · Requested {i.quantity} · Received {i.received}
                                      </span>
                                    </span>
                                    <span className="font-bold">{money(i.unitPrice, r.currency)}</span>
                                  </li>
                                ))}
                              </ul>

                              <p className="mt-5 text-sm font-bold text-ink">History</p>
                              {r.activity.length === 0 ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  No changes recorded yet. Requested {new Date(r.requestedOn).toLocaleDateString("en-CA")}.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2 border-l-2 border-black/10 pl-4">
                                  {r.activity.map((a, n) => (
                                    <li key={n} className="text-xs">
                                      <span className="font-semibold text-ink">{a.detail}</span>
                                      <span className="block text-muted-foreground">
                                        {new Date(a.at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                                        {a.by && ` · ${a.by}`}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Update */}
                            <form
                              action={(fd) =>
                                run(async () => {
                                  const status = String(fd.get("status") || "under_review");
                                  const notes = String(fd.get("notes") || "").trim();

                                  if (status === "rejected" && !notes) {
                                    throw new Error("Please enter a reason before rejecting this return.");
                                  }

                                  await updateReturnRequest(
                                    r.id,
                                    status,
                                    notes,
                                    String(fd.get("carrier") || ""),
                                    String(fd.get("tracking") || ""),
                                    { notify: true, message: notes }
                                  );
                                  setRows((rs) =>
                                    rs.map((x) =>
                                      x.id === r.id
                                        ? {
                                            ...x,
                                            status,
                                            notes,
                                            carrier: String(fd.get("carrier") || ""),
                                            tracking: String(fd.get("tracking") || ""),
                                          }
                                        : x
                                    )
                                  );
                                }, `${r.orderNumber} updated and the customer was emailed.`)
                              }
                              className="rounded-2xl border border-black/5 bg-white p-4"
                            >
                              <p className="font-bold text-ink">Update request</p>
                              <select name="status" defaultValue={r.status} className={input}>
                                <option value="under_review">Under review</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="label_issued">Return label issued</option>
                                <option value="in_transit">Return in transit</option>
                                <option value="received">Received</option>
                                <option value="inspection_failed">Inspection failed</option>
                                <option value="completed">Completed</option>
                              </select>
                              {r.fulfillmentProvider === "amazon_mcf" && r.type === "return" ? (
                                <>
                                  <input type="hidden" name="carrier" defaultValue={r.carrier} />
                                  <input type="hidden" name="tracking" defaultValue={r.tracking} />
                                </>
                              ) : (
                                <>
                                  <input name="carrier" defaultValue={r.carrier} placeholder="Return carrier" className={input} />
                                  <input name="tracking" defaultValue={r.tracking} placeholder="Return tracking number" className={input} />
                                </>
                              )}
                              <textarea
                                name="notes"
                                defaultValue={r.notes}
                                placeholder="Reason / resolution notes"
                                className={`${input} min-h-24`}
                              />
                              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                                If you select Rejected, a reason is required. Saving sends the updated status and reason to the customer by email.
                              </p>
                              <button className="cm-button-dark mt-3 w-full">Save update</button>
                            </form>

                            {/* Actions */}
                            <div className="space-y-4">
                              {/* Simple next-step panel */}
                              <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint/30 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-brand">Next step</p>
                                {["requested", "under_review"].includes(r.status) && (
                                  <div className="mt-2">
                                    <p className="text-sm font-bold text-ink">1. Review the customer&apos;s return request</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                      Check the reason, returned item and any photos. Then choose the appropriate status in
                                      <span className="font-semibold text-ink"> Update request</span> on the left and click
                                      <span className="font-semibold text-ink"> Save update</span>. If you reject the request,
                                      a reason is required. The customer will automatically receive the updated status and reason by email.
                                    </p>
                                  </div>
                                )}
                                {["approved", "label_issued", "in_transit"].includes(r.status) && (
                                  <div className="mt-2">
                                    <p className="text-sm font-bold text-ink">2. Waiting for the customer to send the part back</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {r.fulfillmentProvider === "amazon_mcf"
                                        ? "Create or manage the Amazon RMA below. When the returned part is confirmed received, continue with the refund."
                                        : "Send the customer one email containing the return instructions and printable PDF label. When the part arrives, mark it received."}
                                    </p>
                                    <button
                                      type="button"
                                      disabled={pending}
                                      onClick={() =>
                                        run(async () => {
                                          await sendReturnInstructions(r.id);
                                        }, "Return instructions emailed to the customer.")
                                      }
                                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
                                    >
                                      <Mail className="h-4 w-4" aria-hidden="true" />
                                      Email return instructions
                                    </button>
                                    <button
                                      type="button"
                                      disabled={pending}
                                      onClick={() =>
                                        run(async () => {
                                          await updateReturnRequest(r.id, "received", "", r.carrier, r.tracking, { notify: false, message: "" });
                                          setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "received" } : x)));
                                        }, `${r.orderNumber} marked as received.`)
                                      }
                                      className="cm-button-primary mt-3 w-full disabled:opacity-60"
                                    >
                                      The part arrived: mark received
                                    </button>
                                  </div>
                                )}
                                {["received", "refund_pending", "inspection_failed"].includes(r.status) && (
                                  <div className="mt-2">
                                    <p className="text-sm font-bold text-ink">3. Inspect the returned part and complete the refund</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                      The customer&apos;s item has been returned. Check the part and its condition first, then issue the
                                      appropriate refund. After that, use the returned-stock section below to restock a sellable item
                                      or mark it damaged.
                                    </p>
                                  </div>
                                )}
                                {r.status === "rejected" && (
                                  <div className="mt-2">
                                    <p className="text-sm font-bold text-ink">Request rejected</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                      The customer has been notified by email. No further action is required unless you change the status again.
                                    </p>
                                  </div>
                                )}
                                {["completed", "cancelled"].includes(r.status) && (
                                  <div className="mt-2">
                                    <p className="text-sm font-bold text-ink">Return closed</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                      This return is {r.status}. No further action is required.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {r.fulfillmentProvider === "amazon_mcf" && r.type === "return" && (
                                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                                  <p className="font-bold text-ink">Amazon MCF return</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    For Canadian MCF orders this uses Amazon&apos;s RMA return flow. Amazon provides the return-center address and authorization slip; return postage is not included.
                                  </p>

                                  {r.amazonRmaId ? (
                                    <div className="mt-3 space-y-2 text-sm">
                                      <p>
                                        <span className="font-semibold">RMA:</span> {r.amazonRmaId}
                                      </p>
                                      <p>
                                        <span className="font-semibold">Amazon status:</span>{" "}
                                        {r.amazonReturnStatus ? label(r.amazonReturnStatus) : "authorized"}
                                      </p>
                                      {r.amazonRmaPageUrl && (
                                        <a
                                          href={r.amazonRmaPageUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex font-bold text-brand hover:underline"
                                        >
                                          Open Amazon RMA document
                                        </a>
                                      )}
                                      {r.amazonReturnSyncedOn && (
                                        <p className="text-xs text-muted-foreground">
                                          Last synced {new Date(r.amazonReturnSyncedOn).toLocaleString("en-CA")}
                                        </p>
                                      )}
                                      <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() =>
                                          run(async () => {
                                            await syncAmazonReturnStatus(r.id);
                                          }, "Amazon MCF return status synchronized.")
                                        }
                                        className="mt-2 w-full rounded-full border border-orange-300 px-4 py-2 text-sm font-bold text-orange-900 hover:bg-orange-100 disabled:opacity-60"
                                      >
                                        Sync Amazon return status
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={pending || r.status !== "approved"}
                                      onClick={() =>
                                        run(async () => {
                                          await createAmazonReturnAuthorization(r.id);
                                        }, "Amazon MCF return authorization created.")
                                      }
                                      className="cm-button-primary mt-3 w-full disabled:opacity-50"
                                    >
                                      {r.status === "approved"
                                        ? "Create Amazon RMA"
                                        : "Approve request before creating Amazon RMA"}
                                    </button>
                                  )}

                                  {r.amazonReturnError && (
                                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                                      {r.amazonReturnError}
                                    </p>
                                  )}

                                  {r.items.some((item) => item.amazonReturnItemStatus) && (
                                    <div className="mt-4 space-y-2">
                                      {r.items.map((item) => (
                                        <div key={item.id} className="rounded-xl bg-white p-3 text-xs">
                                          <p className="font-bold text-ink">{item.sku}</p>
                                          <p className="mt-1 text-muted-foreground">
                                            {item.amazonReturnItemStatus
                                              ? `Amazon: ${label(item.amazonReturnItemStatus)}`
                                              : "Awaiting Amazon status"}
                                            {item.amazonReturnCondition
                                              ? ` · Condition: ${label(item.amazonReturnCondition)}`
                                              : ""}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {r.fulfillmentProvider !== "amazon_mcf" &&
                                ["received", "completed", "inspection_failed"].includes(r.status) && (
                                <div className="rounded-2xl border border-black/5 bg-white p-4">
                                  <p className="font-bold text-ink">Returned stock</p>
                                  {r.stock ? (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {r.stock === "restocked"
                                        ? "Items were added back to stock."
                                        : "Marked damaged - not restocked."}
                                    </p>
                                  ) : (
                                    <>
                                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        Add the received items back to inventory, or mark them damaged. Check the
                                        product&apos;s stock first if it may already have increased.
                                      </p>
                                      <div className="mt-3 flex gap-2">
                                        <button
                                          type="button"
                                          disabled={pending}
                                          onClick={() =>
                                            run(async () => {
                                              await handleReturnStock(r.id, true);
                                              setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, stock: "restocked" } : x)));
                                            }, "Items added back to stock.")
                                          }
                                          className="cm-button-primary flex-1 disabled:opacity-60"
                                        >
                                          Restock
                                        </button>
                                        <button
                                          type="button"
                                          disabled={pending}
                                          onClick={() =>
                                            run(async () => {
                                              await handleReturnStock(r.id, false);
                                              setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, stock: "damaged" } : x)));
                                            }, "Marked damaged - not restocked.")
                                          }
                                          className="flex-1 rounded-full border border-black/15 px-4 py-2 text-sm font-bold hover:border-brand hover:text-brand disabled:opacity-60"
                                        >
                                          Damaged
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              {r.type === "exchange" && ["received", "exchange_processing"].includes(r.status) && (
                                <div className="rounded-2xl bg-ink p-4 text-white">
                                  <p className="font-bold">Replacement order</p>
                                  {r.replacementOrderId ? (
                                    <div className="mt-3 space-y-2 text-sm text-white/65">
                                      <p>Replacement order created.</p>
                                      {r.replacementAmountDue > 0 && (
                                        <p>Customer payment due: {money(r.replacementAmountDue, r.currency)}</p>
                                      )}
                                      {r.replacementRefundDue > 0 && (
                                        <p>Customer refund: {money(r.replacementRefundDue, r.currency)}</p>
                                      )}
                                      {r.replacementPaymentUrl && (
                                        <a
                                          href={r.replacementPaymentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex font-bold text-brand hover:underline"
                                        >
                                          Open payment link
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <form
                                      action={(fd) =>
                                        run(async () => {
                                          await createExchangeReplacement({
                                            requestId: r.id,
                                            replacementProductId: Number(fd.get("replacement_product_id")),
                                            quantity: Number(fd.get("quantity")),
                                          });
                                        }, "Replacement order created.")
                                      }
                                      className="mt-3 space-y-3"
                                    >
                                      <select
                                        name="replacement_product_id"
                                        defaultValue={String(first?.productId ?? "")}
                                        required
                                        className="w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                                      >
                                        <option value="">Choose replacement product</option>
                                        {products.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.sku} · {p.name} · {money(p.price)}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        name="quantity"
                                        type="number"
                                        min={1}
                                        max={maxQty}
                                        defaultValue={maxQty}
                                        required
                                        className="w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                                      />
                                      <p className="text-xs leading-5 text-white/50">
                                        Equal price: replacement proceeds automatically. Higher price: customer
                                        receives a Stripe payment link. Lower price: admin-only difference refund is
                                        issued before fulfillment.
                                      </p>
                                      <button className="cm-button-primary w-full">Create replacement</button>
                                    </form>
                                  )}
                                </div>
                              )}

                              {isRefundDue(r) && (
                                <form
                                  action={(fd) =>
                                    run(async () => {
                                      await issueReturnRefund(
                                        r.id,
                                        r.orderId,
                                        Number(fd.get("amount")),
                                        String(fd.get("reason") || "Approved customer return")
                                      );
                                    }, "Refund issued.")
                                  }
                                  className="rounded-2xl bg-ink p-4 text-white"
                                >
                                  <p className="font-bold">Issue Stripe refund</p>
                                  <p className="mt-1 text-xs leading-5 text-white/55">
                                    Suggested item refund excludes tax and shipping. Review the amount before submitting.
                                  </p>
                                  <input
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    defaultValue={r.subtotal.toFixed(2)}
                                    required
                                    className="mt-3 w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                                  />
                                  <input
                                    name="reason"
                                    defaultValue="Approved customer return"
                                    className="mt-3 w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm text-ink"
                                  />
                                  <button
                                    onClick={(e) => {
                                      if (!window.confirm("Issue this refund through Stripe? This cannot be undone.")) {
                                        e.preventDefault();
                                      }
                                    }}
                                    className="cm-button-primary mt-3 w-full"
                                  >
                                    Refund customer
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No return requests here.
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
