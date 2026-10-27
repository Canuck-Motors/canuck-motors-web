"use client";

import { DateRangeFilter, inRange, ALL_TIME, type DateRange } from "@/components/admin/DateRangeFilter";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronRight, Copy, Download, Mail, Search, X } from "lucide-react";
import {
  createAmazonReturnAuthorization,
  createReturnGoAuthorization,
  createExchangeReplacement,
  getReturnPhotos,
  completeReturnInspection,
  handleReturnStock,
  issueReturnRefund,
  rejectAfterFailedInspection,
  sendReturnInstructions,
  syncAmazonReturnStatus,
  syncReturnGoStatus,
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
  returnGoRmaId: string;
  returnGoStatus: string;
  returnGoLabelUrl: string;
  returnGoError: string;
  returnGoSyncedOn: string;
  replacementOrderId: string | null;
  replacementPaymentUrl: string;
  replacementAmountDue: number;
  replacementRefundDue: number;
  deliveryCarrier: string;
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
type Filter = "action" | "review" | "waiting" | "refund" | "exchange" | "done" | "rejected" | "overdue" | "open" | "all";

const label = (s: string) => s.replaceAll("_", " ");
const money = (n: number, c = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: c }).format(n);
const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

// New return requests and exchange work that need admin review.
const NEEDS_ACTION = ["requested", "exchange_processing"];
const UNDER_REVIEW = ["under_review"];
const WAITING = ["approved", "label_issued", "in_transit"];
const CLOSED = ["completed", "rejected", "cancelled", "canceled", "refunded", "denied", "resolved"];
const REJECTED = ["rejected", "cancelled", "canceled", "denied"];
const needsAction = (r: ReturnRow) =>
  NEEDS_ACTION.includes(r.status) || (r.type === "exchange" && r.status === "received");
const isUnderReview = (r: ReturnRow) => UNDER_REVIEW.includes(r.status);
const isRefundDue = (r: ReturnRow) =>
  r.type === "return" && ["received", "refund_pending", "inspection_failed"].includes(r.status);
const isOpen = (r: ReturnRow) => !CLOSED.includes(r.status);
const OVERDUE_DAYS = 5;

const STATUS_COLOR = (s: string) =>
  REJECTED.includes(s) ? "bg-red-100 text-red-700" : CLOSED.includes(s) ? "bg-green-100 text-green-800" : NEEDS_ACTION.includes(s) ? "bg-brand-tint text-brand" : "bg-amber-100 text-amber-800";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm hover:text-brand"
    >
      {done ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Field({ label: title, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">{title}</dt>
      <dd className="mt-1 text-sm leading-6 text-ink">{children}</dd>
    </div>
  );
}

// Long customer messages are cut to 3 lines, with a toggle to read all of it.
function ReasonText({ text }: { text: string }) {
  const [all, setAll] = useState(false);
  const long = text.length > 160;
  return (
    <div>
      <p className={`border-l-4 border-brand/30 pl-3 italic text-ink ${long && !all ? "line-clamp-3" : ""}`}>&ldquo;{text}&rdquo;</p>
      {long && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 pl-4 text-xs font-bold text-brand hover:underline">
          {all ? "Show less" : "Read the full message"}
        </button>
      )}
    </div>
  );
}

export default function ReturnsManager({
  initial,
  products,
  needsSql,
  returnGoEnabled,
  returnGoConfigured,
}: {
  initial: ReturnRow[];
  products: Product[];
  needsSql: boolean;
  returnGoEnabled: boolean;
  returnGoConfigured: boolean;
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
  const [inspectionConfirm, setInspectionConfirm] = useState<{
    requestId: string;
    outcome: "restock" | "damaged" | "fail";
  } | null>(null);
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
    setInspectionConfirm(null);
    setOpen(next);
    if (next && !photos[next]) {
      setPhotos((p) => ({ ...p, [next]: "loading" }));
      getReturnPhotos(next)
        .then((urls) => setPhotos((p) => ({ ...p, [next]: urls })))
        .catch(() => setPhotos((p) => ({ ...p, [next]: [] })));
    }
  };

  const scoped = useMemo(() => rows.filter((r) => inRange(r.requestedOn, range)), [rows, range]);

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      action: scoped.filter((r) => needsAction(r) || isUnderReview(r)).length,
      review: scoped.filter(isUnderReview).length,
      waiting: scoped.filter((r) => WAITING.includes(r.status)).length,
      refund: scoped.filter(isRefundDue).length,
      exchange: scoped.filter((r) => r.type === "exchange").length,
      done: scoped.filter((r) => CLOSED.includes(r.status) && !REJECTED.includes(r.status)).length,
      rejected: scoped.filter((r) => REJECTED.includes(r.status)).length,
      overdue: scoped.filter((r) => isOpen(r) && days(r.requestedOn) > OVERDUE_DAYS).length,
      open: scoped.filter(isOpen).length,
      all: scoped.length,
    }),
    [scoped]
  );

  const summary = useMemo(() => {
    const openRows = scoped.filter(isOpen);
    const refundRows = scoped.filter(isRefundDue);
    return {
      open: openRows.length,
      refundCount: refundRows.length,
      refundAmount: refundRows.reduce((t, r) => t + r.subtotal, 0),
      overdue: openRows.filter((r) => days(r.requestedOn) > OVERDUE_DAYS).length,
      all: scoped.length,
    };
  }, [scoped]);

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
      if (filter === "open" && !isOpen(r)) return false;
      if (filter === "overdue" && !(isOpen(r) && days(r.requestedOn) > OVERDUE_DAYS)) return false;
      if (filter === "action" && !(needsAction(r) || isUnderReview(r))) return false;
      if (filter === "review" && !isUnderReview(r)) return false;
      if (filter === "waiting" && !WAITING.includes(r.status)) return false;
      if (filter === "refund" && !isRefundDue(r)) return false;
      if (filter === "exchange" && r.type !== "exchange") return false;
      if (filter === "done" && !(CLOSED.includes(r.status) && !REJECTED.includes(r.status))) return false;
      if (filter === "rejected" && !REJECTED.includes(r.status)) return false;
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
    ["action", "Needs review"],
    ["waiting", "Waiting for item"],
    ["refund", "Refund due"],
    ["done", "Completed"],
    ["rejected", "Rejected / cancelled"],
    ["all", "All"],
  ];

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
          { key: "open" as Filter, title: "Open requests", value: String(summary.open), sub: "" },
          { key: "refund" as Filter, title: "Refunds to pay", value: String(summary.refundCount), sub: money(summary.refundAmount) },
          {
            key: "overdue" as Filter,
            title: `Overdue (> ${OVERDUE_DAYS} days)`,
            value: String(summary.overdue),
            sub: summary.overdue ? "Needs attention" : "",
          },
          { key: "all" as Filter, title: "All requests", value: String(summary.all), sub: "" },
        ].map((card) => {
          const activeCard = filter === card.key;
          const overdueAlert = card.key === "overdue" && summary.overdue > 0;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => {
                setFilter(card.key);
                setLimit(50);
                setOpen(null);
              }}
              aria-pressed={activeCard}
              className={`group rounded-[22px] border p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/10 ${
                activeCard
                  ? "border-brand bg-brand-tint/55"
                  : overdueAlert
                    ? "border-brand/40 bg-white hover:border-brand"
                    : "border-black/5 bg-white hover:border-brand/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm font-semibold ${activeCard ? "text-brand" : "text-muted-foreground"}`}>
                  {card.title}
                </p>
                <span className={`text-xs font-black transition ${activeCard ? "text-brand" : "text-black/25 group-hover:text-brand"}`}>
                  View →
                </span>
              </div>
              <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-ink">{card.value}</p>
              {card.sub && <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>}
            </button>
          );
        })}
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
                const inspected = r.stock !== null || r.items.some((i) => i.amazonReturnCondition);
                const rejectedLike = ["rejected", "cancelled", "canceled", "denied"].includes(r.status);
                const stage: "review" | "receive" | "inspect" | "refund" | "closed" = CLOSED.includes(r.status)
                  ? "closed"
                  : ["requested", "under_review"].includes(r.status)
                    ? "review"
                    : WAITING.includes(r.status)
                      ? "receive"
                      : inspected
                        ? "refund"
                        : "inspect";
                const steps = ["Request", "Review", "Receive", "Inspect", r.type === "exchange" ? "Replace" : "Refund"];
                const stepIdx = stage === "closed" && rejectedLike ? 1 : { review: 1, receive: 2, inspect: 3, refund: 4, closed: 4 }[stage];
                const inPanelTools = stage === "inspect" || stage === "refund";
                // Who/when/why a return was rejected, for the closed card
                const rejectEntry = rejectedLike
                  ? [...r.activity]
                      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
                      .find((a) => /reject|cancel|denied/i.test(`${a.action} ${a.detail}`))
                  : undefined;
                const stepState = (n: number): "done" | "current" | "bad" | "todo" => {
                  if (stage === "closed" && rejectedLike) return n === 0 ? "done" : n === 1 ? "bad" : "todo";
                  if (stage === "closed") return "done";
                  return n < stepIdx ? "done" : n === stepIdx ? "current" : "todo";
                };
                const stageInfo = {
                  review: {
                    title: "Review this request",
                    text: "Read the customer's reason and photos below. Approve it to let them send the part back, or reject it with a reason.",
                  },
                  receive: {
                    title: "Wait for the part to come back",
                    text:
                      r.fulfillmentProvider === "amazon_mcf"
                        ? "Create the Amazon return authorization below. When the part has arrived, mark it received."
                        : "Email the customer the return instructions and label if needed. When the part arrives at your shop, mark it received.",
                  },
                  inspect: {
                    title: "Inspect the returned part",
                    text: "Check the part, then record the result: restock it, mark it damaged, or fail the inspection. After that, issue the refund.",
                  },
                  refund: {
                    title: r.type === "exchange" ? "Send the replacement" : "Issue the refund",
                    text:
                      r.type === "exchange"
                        ? "Create the replacement order below. Any price difference is handled automatically."
                        : "The part is back and checked. Review the amount below and refund the customer through Stripe.",
                  },
                  closed: {
                    title: rejectedLike
                      ? r.status === "rejected" || r.status === "denied"
                        ? "You rejected this return"
                        : "This return was cancelled"
                      : "This return is complete",
                    text: rejectedLike
                      ? "No refund was issued and the customer was told by email."
                      : "The part came back and everything is finished. History is on the right.",
                  },
                }[stage];
                const returnGoBlock = returnGoEnabled && r.type === "return" && (
                                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold text-ink">ReturnGO return</p>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                                      returnGoConfigured
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-900"
                                    }`}>
                                      {returnGoConfigured ? "Connected" : "Setup required"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    ReturnGO can create the return authorization, generate the label and track the RMA while Canuck Motors keeps the customer-facing experience.
                                  </p>

                                  {r.returnGoRmaId ? (
                                    <div className="mt-3 space-y-2 text-sm">
                                      <p>
                                        <span className="font-semibold">RMA:</span> {r.returnGoRmaId}
                                      </p>
                                      <p>
                                        <span className="font-semibold">ReturnGO status:</span>{" "}
                                        {r.returnGoStatus ? label(r.returnGoStatus) : "created"}
                                      </p>
                                      {r.returnGoLabelUrl && (
                                        <a
                                          href={r.returnGoLabelUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex font-bold text-brand hover:underline"
                                        >
                                          Open ReturnGO label
                                        </a>
                                      )}
                                      {r.returnGoSyncedOn && (
                                        <p className="text-xs text-muted-foreground">
                                          Last synced {new Date(r.returnGoSyncedOn).toLocaleString("en-CA")}
                                        </p>
                                      )}
                                      <button
                                        type="button"
                                        disabled={pending || !returnGoConfigured}
                                        onClick={() =>
                                          run(async () => {
                                            const result = await syncReturnGoStatus(r.id);
                                            setRows((rs) =>
                                              rs.map((x) =>
                                                x.id === r.id
                                                  ? {
                                                      ...x,
                                                      returnGoStatus: result.status || x.returnGoStatus,
                                                      returnGoLabelUrl: result.labelUrl || x.returnGoLabelUrl,
                                                      returnGoError: "",
                                                      returnGoSyncedOn: new Date().toISOString(),
                                                    }
                                                  : x
                                              )
                                            );
                                          }, "ReturnGO status synchronized.")
                                        }
                                        className="mt-2 w-full rounded-full border border-violet-300 px-4 py-2 text-sm font-bold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                                      >
                                        Sync ReturnGO status
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={pending || r.status !== "approved" || !returnGoConfigured}
                                      onClick={() =>
                                        run(async () => {
                                          const result = await createReturnGoAuthorization(r.id);
                                          setRows((rs) =>
                                            rs.map((x) =>
                                              x.id === r.id
                                                ? {
                                                    ...x,
                                                    returnGoRmaId: result.rmaId,
                                                    returnGoStatus: result.status || "Approved",
                                                    returnGoLabelUrl: result.labelUrl || "",
                                                    returnGoError: "",
                                                    returnGoSyncedOn: new Date().toISOString(),
                                                  }
                                                : x
                                            )
                                          );
                                        }, "ReturnGO RMA created.")
                                      }
                                      className="cm-button-primary mt-3 w-full disabled:opacity-50"
                                    >
                                      {!returnGoConfigured
                                        ? "Configure ReturnGO API first"
                                        : r.status === "approved"
                                          ? "Create ReturnGO RMA"
                                          : "Approve request before creating ReturnGO RMA"}
                                    </button>
                                  )}

                                  {r.returnGoError && (
                                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">
                                      {r.returnGoError}
                                    </p>
                                  )}
                                </div>
                              );
                const amazonBlock = r.fulfillmentProvider === "amazon_mcf" && r.type === "return" && (
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
                              );
                const stockBlock = r.fulfillmentProvider !== "amazon_mcf" &&
                                ["completed"].includes(r.status) && (
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
                              );
                const exchBlock = r.type === "exchange" && ["received", "exchange_processing"].includes(r.status) && (
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
                              );
                const refundBlock = isRefundDue(r) && (
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
                              );
                // ReturnGO takes priority when enabled. Amazon/manual tooling remains the fallback when it is off.
                const showReturnGo =
                  Boolean(returnGoBlock) && stage !== "review" && !(rejectedLike && !r.returnGoRmaId);
                const showAmazon =
                  !returnGoEnabled &&
                  Boolean(amazonBlock) &&
                  stage !== "review" &&
                  !(rejectedLike && !r.amazonRmaId);
                const tools = [
                  showReturnGo ? returnGoBlock : null,
                  showAmazon ? amazonBlock : null,
                  stockBlock || null,
                  exchBlock || null,
                  inPanelTools ? refundBlock || null : null,
                ].filter(Boolean);
                const addressLines = r.address
                  ? [
                      r.address.line1,
                      r.address.line2 && r.address.line2 !== r.address.line1 ? r.address.line2 : null,
                      [r.address.city, r.address.province, r.address.postal_code].filter(Boolean).join(", "),
                      r.address.country,
                    ].filter(Boolean)
                  : [];
                const when = new Date(r.requestedOn);
                const detailsBlock = (
                  <div className="space-y-3">
                    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Item to return">
                          <ul className="space-y-1.5">
                            {r.items.map((i) => (
                              <li key={i.id}>
                                <span className="font-bold">{i.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {i.sku} · Return {i.quantity} · Arrived {i.received}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Field>
                        <Field label="Price">
                          <span className="text-xl font-black">{money(r.subtotal, r.currency)}</span>
                          {r.items.length === 1 && r.items[0].quantity > 1 && (
                            <span className="block text-xs text-muted-foreground">
                              {r.items[0].quantity} × {money(r.items[0].unitPrice, r.currency)}
                            </span>
                          )}
                        </Field>
                        <Field label="Requested on">
                          <span className="font-bold">{when.toLocaleDateString("en-CA", { dateStyle: "medium" })}</span>
                          <span className="block text-xs text-muted-foreground">
                            {when.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </Field>
                        <Field label="Delivery carrier">
                          <span className="font-bold">{r.deliveryCarrier || "Standard shipping"}</span>
                          <span className="block text-xs text-muted-foreground">How the order was delivered</span>
                        </Field>
                        <Field label="Reason" className="sm:col-span-2 xl:col-span-4">
                          <span className="inline-flex rounded-full bg-brand-tint px-3 py-0.5 text-sm font-bold capitalize text-brand">
                            {label(r.reasonCode)}
                          </span>
                          <div className="mt-2">
                            {r.reasonText ? (
                              <ReasonText text={r.reasonText} />
                            ) : (
                              <span className="text-muted-foreground">The customer did not add a note.</span>
                            )}
                          </div>
                          {Array.isArray(photos[r.id]) && (photos[r.id] as string[]).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(photos[r.id] as string[]).map((u, n) => (
                                <a key={n} href={u} target="_blank" rel="noopener noreferrer">
                                  <Image
                                    src={u}
                                    alt={`Customer photo ${n + 1}`}
                                    width={72}
                                    height={72}
                                    unoptimized
                                    className="h-[72px] w-[72px] rounded-lg border object-cover transition hover:scale-105"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </Field>
                        <Field label="Customer">
                          <span className="font-bold">{r.customerName || "No name saved"}</span>
                          {r.customerEmail && (
                            <span className="mt-0.5 flex items-center gap-2">
                              <a href={`mailto:${r.customerEmail}`} className="min-w-0 truncate text-muted-foreground hover:text-brand">
                                {r.customerEmail}
                              </a>
                              <CopyButton text={r.customerEmail} />
                            </span>
                          )}
                        </Field>
                        <Field label="Customer address" className="sm:col-span-1 xl:col-span-2">
                          {addressLines.length ? (
                            <address className="not-italic">{addressLines.join(" · ")}</address>
                          ) : (
                            <span className="text-muted-foreground">No address saved</span>
                          )}
                        </Field>
                      </dl>
                    </section>
                  </div>
                );
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={`cursor-pointer ${isOpenRow ? "bg-brand-tint" : "hover:bg-black/[0.02]"}`}
                      onClick={() => toggleRow(r.id)}
                    >
                      <td className={`border-l-4 px-5 py-3 ${isOpenRow ? "border-brand" : "border-transparent"}`}>
                        <div className="flex items-center gap-2 font-bold text-ink">
                          {isOpenRow ? (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          )}
                          {r.orderNumber}
                        </div>
                        <div className="mt-0.5 pl-6 text-xs font-semibold text-muted-foreground">
                          {r.items[0]?.name ?? ""}
                          {r.items.length > 1 ? ` +${r.items.length - 1} more` : ""}
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
                        <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">
                          {stage === "closed" ? (rejectedLike ? "Closed, no refund" : "Done") : `Next: ${{ review: "review & approve", receive: "wait for the part", inspect: "inspect the part", refund: r.type === "exchange" ? "send replacement" : "refund" }[stage]}`}
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
                      <tr className="bg-brand-tint/40">
                        <td colSpan={7} className="border-l-4 border-brand px-6 py-5">
                          {/* Step-by-step workflow */}
                          <ol
                            className="mb-6 grid grid-cols-5 px-1 pt-2"
                            aria-label="Return progress"
                          >
                            {steps.map((st, n) => {
                              const me = stepState(n);
                              const next = n < steps.length - 1 ? stepState(n + 1) : "todo";
                              const prev = n > 0 ? stepState(n - 1) : "todo";
                              const stepLabel =
                                me === "bad"
                                  ? r.status === "cancelled" || r.status === "canceled"
                                    ? "Cancelled"
                                    : "Rejected"
                                  : st;

                              return (
                                <li key={st} className="relative text-center">
                                  <div className="flex items-center">
                                    <span
                                      className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${
                                        n === 0
                                          ? "bg-transparent"
                                          : me !== "todo" && prev === "done"
                                            ? "bg-emerald-500"
                                            : "bg-black/10"
                                      }`}
                                    />
                                    <span
                                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white transition-all duration-300 ${
                                        me === "bad"
                                          ? "bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.10)]"
                                          : me === "done"
                                            ? "bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.20)]"
                                            : me === "current"
                                              ? "bg-brand shadow-[0_0_0_6px_rgba(220,38,38,0.10),0_8px_18px_rgba(220,38,38,0.18)] animate-[pulse_1.8s_ease-in-out_infinite]"
                                              : "bg-black/15"
                                      }`}
                                    >
                                      {me === "done" ? (
                                        <Check className="h-5 w-5" strokeWidth={3} />
                                      ) : me === "bad" ? (
                                        <X className="h-5 w-5" strokeWidth={3} />
                                      ) : (
                                        n + 1
                                      )}
                                    </span>
                                    <span
                                      className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${
                                        n === steps.length - 1
                                          ? "bg-transparent"
                                          : me === "done" && next !== "todo"
                                            ? "bg-emerald-500"
                                            : "bg-black/10"
                                      }`}
                                    />
                                  </div>

                                  <p
                                    className={`mt-2 text-[11px] font-black transition-colors ${
                                      me === "bad"
                                        ? "text-red-600"
                                        : me === "current"
                                          ? "text-brand"
                                          : me === "done"
                                            ? "text-emerald-800"
                                            : "text-muted-foreground"
                                    }`}
                                  >
                                    {stepLabel}
                                  </p>

                                  {me === "current" && (
                                    <span
                                      aria-hidden="true"
                                      className="mx-auto mt-1 block h-1 w-6 rounded-full bg-brand/70"
                                    />
                                  )}
                                </li>
                              );
                            })}
                          </ol>

                          <div
                            className={`rounded-2xl border-2 bg-white p-5 ${
                              stage === "closed" ? (rejectedLike ? "border-red-300" : "border-green-300") : "border-brand/30"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-[0.14em] text-brand">
                                {stage === "closed" ? (rejectedLike ? "Closed" : "Finished") : `Step ${stepIdx + 1} of 5`}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_COLOR(r.status)}`}>
                                Status: {label(r.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-lg font-black text-ink">{stageInfo.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{stageInfo.text}</p>

                            {stage === "review" && (
                              <form className="mt-4">
                                <textarea
                                  name="reason"
                                  placeholder="Note for the customer (optional when approving, required when rejecting). It is included in the email."
                                  className="w-full min-h-16 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                                />
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={(e) => {
                                      const note = String(new FormData(e.currentTarget.form as HTMLFormElement).get("reason") || "").trim();
                                      run(async () => {
                                        await updateReturnRequest(r.id, "approved", note, r.carrier, r.tracking, { notify: true, message: note });
                                        setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "approved", notes: note || x.notes } : x)));
                                      }, `${r.orderNumber} approved. The customer was emailed${note ? " with your note" : ""}.`);
                                    }}
                                    className="cm-button-primary disabled:opacity-60"
                                  >
                                    Approve return
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={(e) => {
                                      const reason = String(new FormData(e.currentTarget.form as HTMLFormElement).get("reason") || "").trim();
                                      run(async () => {
                                        if (!reason) throw new Error("Please enter a reason before rejecting this return.");
                                        await updateReturnRequest(r.id, "rejected", reason, r.carrier, r.tracking, { notify: true, message: reason });
                                        setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "rejected", notes: reason } : x)));
                                      }, `${r.orderNumber} rejected. The customer was emailed.`);
                                    }}
                                    className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-bold text-ink hover:border-brand disabled:opacity-60"
                                  >
                                    Reject return
                                  </button>

                                </div>
                              </form>
                            )}

                            {stage === "receive" && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {(
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() =>
                                      run(async () => {
                                        await sendReturnInstructions(r.id);
                                      }, "Return instructions emailed to the customer.")
                                    }
                                    className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
                                  >
                                    <Mail className="h-4 w-4" aria-hidden="true" />
                                    Email return instructions
                                  </button>
                                )}
                                {(
                                  <a
                                    href={`/account/returns/${r.id}/label`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand"
                                  >
                                    View / print the return label
                                  </a>
                                )}
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() =>
                                    run(async () => {
                                      await updateReturnRequest(r.id, "received", "", r.carrier, r.tracking, { notify: false, message: "" });
                                      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "received" } : x)));
                                    }, `${r.orderNumber} marked as received.`)
                                  }
                                  className="cm-button-primary disabled:opacity-60"
                                >
                                  The part arrived: mark received
                                </button>
                              </div>
                            )}

                            {stage === "inspect" && (
                              <div className="mt-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-ink">
                                    Choose the inspection result.
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    Hover or focus the ⓘ for guidance.
                                  </span>
                                </div>

                                <div className="grid gap-2 lg:grid-cols-3">
                                  <div className="group relative">
                                    <button
                                      type="button"
                                      disabled={pending || Boolean(r.stock)}
                                      onClick={() =>
                                        setInspectionConfirm({ requestId: r.id, outcome: "restock" })
                                      }
                                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left font-black text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                      <span>Pass · Restock</span>
                                      <span
                                        tabIndex={0}
                                        aria-label="When to use Pass and Restock"
                                        className="cursor-help rounded-full border border-emerald-300 px-1.5 text-xs"
                                      >
                                        ⓘ
                                      </span>
                                    </button>
                                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
                                      Use when the returned part is correct and sellable. Inventory increases, then the {r.type === "exchange" ? "replacement" : "refund"} can continue.
                                    </div>
                                  </div>

                                  <div className="group relative">
                                    <button
                                      type="button"
                                      disabled={pending || Boolean(r.stock)}
                                      onClick={() =>
                                        setInspectionConfirm({ requestId: r.id, outcome: "damaged" })
                                      }
                                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left font-black text-amber-900 transition hover:border-amber-400 hover:bg-amber-100 disabled:opacity-50"
                                    >
                                      <span>Pass · Don&apos;t restock</span>
                                      <span
                                        tabIndex={0}
                                        aria-label="When to use Pass and Don't restock"
                                        className="cursor-help rounded-full border border-amber-300 px-1.5 text-xs"
                                      >
                                        ⓘ
                                      </span>
                                    </button>
                                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
                                      Use when the return is valid, but the part is damaged or not sellable. Inventory does not increase, but the {r.type === "exchange" ? "replacement" : "refund"} can still continue.
                                    </div>
                                  </div>

                                  <div className="group relative">
                                    <button
                                      type="button"
                                      disabled={pending}
                                      onClick={() =>
                                        setInspectionConfirm({ requestId: r.id, outcome: "fail" })
                                      }
                                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left font-black text-red-800 transition hover:border-red-400 hover:bg-red-100 disabled:opacity-50"
                                    >
                                      <span>Fail inspection</span>
                                      <span
                                        tabIndex={0}
                                        aria-label="When to use Fail inspection"
                                        className="cursor-help rounded-full border border-red-300 px-1.5 text-xs"
                                      >
                                        ⓘ
                                      </span>
                                    </button>
                                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
                                      Use only when the return itself is ineligible, such as the wrong item being sent back, incorrect quantity, or a policy violation. No refund or replacement is issued automatically.
                                    </div>
                                  </div>
                                </div>

                                {inspectionConfirm?.requestId === r.id && (
                                  <form
                                    className={`mt-3 rounded-xl border p-3 ${
                                      inspectionConfirm.outcome === "restock"
                                        ? "border-emerald-200 bg-emerald-50/70"
                                        : inspectionConfirm.outcome === "damaged"
                                          ? "border-amber-200 bg-amber-50/70"
                                          : "border-red-200 bg-red-50/70"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                              <div className="mb-3 rounded-2xl border border-black/5 bg-white p-4 text-sm">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Return details</p>
                                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                                  <div className="col-span-2">
                                    <dt className="text-xs font-semibold text-muted-foreground">Items to return</dt>
                                    <dd className="mt-0.5 space-y-0.5 font-semibold text-ink">
                                      {r.items.map((i) => (
                                        <p key={i.id}>
                                          {i.quantity} × {i.name} <span className="text-muted-foreground">({i.sku})</span>
                                          <span className="float-right">{money(i.unitPrice * i.quantity, r.currency)}</span>
                                        </p>
                                      ))}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-semibold text-muted-foreground">Price to refund (items)</dt>
                                    <dd className="font-black text-ink">{money(r.subtotal, r.currency)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-semibold text-muted-foreground">Requested on</dt>
                                    <dd className="font-semibold text-ink">
                                      {new Date(r.requestedOn).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                                    </dd>
                                  </div>
                                  <div className="col-span-2">
                                    <dt className="text-xs font-semibold text-muted-foreground">Originally delivered by</dt>
                                    <dd className="font-semibold text-ink">{r.deliveryCarrier || "Standard shipping"}</dd>
                                  </div>
                                </dl>
                              </div>
                                        <p className="text-sm font-black text-ink">
                                          {inspectionConfirm.outcome === "restock"
                                            ? "Confirm: Pass inspection and restock?"
                                            : inspectionConfirm.outcome === "damaged"
                                              ? "Confirm: Pass inspection without restocking?"
                                              : "Confirm: Fail inspection?"}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                          No changes are saved until you confirm.
                                        </p>
                                      </div>
                                    </div>

                                    {inspectionConfirm.outcome === "fail" && (
                                      <div className="mt-3">
                                        <label className="text-xs font-bold text-red-800">
                                          Failure reason
                                        </label>
                                        <textarea
                                          name="why"
                                          placeholder="Required. This reason is emailed to the customer."
                                          className="mt-1 w-full min-h-14 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
                                        />
                                      </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={pending}
                                        onClick={(e) => {
                                          const outcome = inspectionConfirm.outcome;
                                          const why =
                                            outcome === "fail"
                                              ? String(
                                                  new FormData(e.currentTarget.form as HTMLFormElement).get("why") || ""
                                                ).trim()
                                              : "";

                                          run(async () => {
                                            if (outcome === "fail") {
                                              if (!why) throw new Error("Please describe what failed inspection.");
                                              await updateReturnRequest(
                                                r.id,
                                                "inspection_failed",
                                                why,
                                                r.carrier,
                                                r.tracking,
                                                { notify: true, message: why }
                                              );
                                              setRows((rs) =>
                                                rs.map((x) =>
                                                  x.id === r.id
                                                    ? { ...x, status: "inspection_failed", notes: why }
                                                    : x
                                                )
                                              );
                                            } else {
                                              await completeReturnInspection(r.id, outcome, r.type);
                                              setRows((rs) =>
                                                rs.map((x) =>
                                                  x.id === r.id
                                                    ? {
                                                        ...x,
                                                        stock: outcome === "restock" ? "restocked" : "damaged",
                                                        status:
                                                          r.type === "exchange"
                                                            ? "exchange_processing"
                                                            : "refund_pending",
                                                      }
                                                    : x
                                                )
                                              );
                                            }
                                            setInspectionConfirm(null);
                                          },
                                          outcome === "restock"
                                            ? "Inspection passed. Item restocked and workflow advanced."
                                            : outcome === "damaged"
                                              ? "Inspection passed. Item accepted without restocking and workflow advanced."
                                              : `${r.orderNumber} marked as failed inspection. The customer was emailed.`
                                          );
                                        }}
                                        className={`rounded-full px-5 py-2 text-sm font-bold text-white disabled:opacity-60 ${
                                          inspectionConfirm.outcome === "restock"
                                            ? "bg-emerald-700"
                                            : inspectionConfirm.outcome === "damaged"
                                              ? "bg-amber-700"
                                              : "bg-red-700"
                                        }`}
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => setInspectionConfirm(null)}
                                        className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}

                            {r.status === "inspection_failed" && (
                              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                                <p className="font-black text-red-800">Resolve failed inspection</p>
                                <p className="mt-1 text-sm leading-6 text-red-800/80">
                                  A failed inspection does not automatically mean refund or replacement. If the return is ineligible, reject it and arrange to send the original part back to the customer. If you decide to accept it after review, use one of the inspection-pass options above instead.
                                </p>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() =>
                                    run(async () => {
                                      await rejectAfterFailedInspection(r.id, r.notes || "Returned item failed inspection.");
                                      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "rejected" } : x)));
                                    }, "Return rejected after failed inspection. The customer was emailed.")
                                  }
                                  className="mt-3 rounded-full bg-red-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                                >
                                  Reject return · No refund
                                </button>
                              </div>
                            )}

                            {stage === "closed" && rejectedLike && (
                              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">
                                  Reason the customer was given
                                </p>
                                {r.notes?.trim() ? (
                                  <p className="mt-2 text-base font-semibold leading-6 text-ink">&ldquo;{r.notes.trim()}&rdquo;</p>
                                ) : (
                                  <p className="mt-2 text-sm text-muted-foreground">No reason was saved for this return.</p>
                                )}
                                {rejectEntry && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    {new Date(rejectEntry.at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                                    {rejectEntry.by && ` · by ${rejectEntry.by}`}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action tools (only the ones that apply to this step), side by side */}
                          {tools.length > 0 && (
                            <div className={`mt-5 grid gap-4 ${tools.length > 1 ? "lg:grid-cols-2" : ""} [&>*]:h-full`}>
                              {tools.map((t, n) => (
                                <div key={n}>{t}</div>
                              ))}
                            </div>
                          )}

                          <div className="mt-5">{detailsBlock}</div>
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
