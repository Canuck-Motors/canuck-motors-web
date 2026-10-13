"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Search } from "lucide-react";

export type PaymentRow = {
  id: string;
  date: string;
  orderId: string;
  orderNumber: string;
  customer: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  stripeUrl: string;
  refunded: number;
  disputed: boolean;
};

export type RefundRow = {
  id: string;
  date: string;
  orderNumber: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
};

export type DisputeRow = {
  id: string;
  date: string;
  orderNumber: string;
  customer: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  dueBy: string;
  stripeUrl: string;
};

export type WebhookHealth = {
  lastReceived: string;
  failed: { type: string; message: string; date: string }[];
  stuck: number;
};

type Tab = "all" | "paid" | "failed" | "refunded" | "disputed";

const money = (n: number, c = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: c || "CAD" }).format(n);

const fmt = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString("en-CA", {
        timeZone: "America/Vancouver",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function countdown(iso: string) {
  if (!iso) return { text: "No deadline", late: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return { text: "Deadline passed", late: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return { text: days > 0 ? `${days}d ${hours}h left` : `${hours}h left`, late: days < 2 };
}

const FAIL = ["failed", "canceled", "cancelled", "expired", "abandoned"];
const OPEN_DISPUTE = ["needs_response", "warning_needs_response", "under_review", "warning_under_review"];

function badge(status: string) {
  const s = status.toLowerCase();
  const cls =
    s === "succeeded" || s === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : FAIL.includes(s)
        ? "bg-red-100 text-red-800"
        : s.includes("refund")
          ? "bg-sky-100 text-sky-800"
          : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function csv(name: string, rows: (string | number)[][]) {
  const body = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function StripeManager({
  payments,
  refunds,
  disputes,
  health,
  testMode,
}: {
  payments: PaymentRow[];
  refunds: RefundRow[];
  disputes: DisputeRow[];
  health: WebhookHealth;
  testMode: boolean;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"payments" | "refunds">("payments");

  const stats = useMemo(() => {
    const tz = "America/Vancouver";
    const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
    const now = new Date();
    const today = day(now);
    const monthKey = today.slice(0, 7);
    const weekAgo = now.getTime() - 7 * 86400000;
    const paid = payments.filter((p) => p.status === "succeeded" || p.status === "paid");
    const sum = (rows: PaymentRow[]) => rows.reduce((s, p) => s + p.amount, 0);
    const refSum = (f: (r: RefundRow) => boolean) =>
      refunds.filter((r) => r.status === "succeeded" && f(r)).reduce((s, r) => s + r.amount, 0);
    const inDay = (iso: string) => iso && day(new Date(iso)) === today;
    const inWeek = (iso: string) => iso && new Date(iso).getTime() >= weekAgo;
    const inMonth = (iso: string) => iso && day(new Date(iso)).startsWith(monthKey);
    return {
      today: sum(paid.filter((p) => inDay(p.date))),
      week: sum(paid.filter((p) => inWeek(p.date))),
      month: sum(paid.filter((p) => inMonth(p.date))),
      monthCount: paid.filter((p) => inMonth(p.date)).length,
      refMonth: refSum((r) => !!inMonth(r.date)),
      refWeek: refSum((r) => !!inWeek(r.date)),
      refToday: refSum((r) => !!inDay(r.date)),
    };
  }, [payments, refunds]);

  const counts = useMemo(
    () => ({
      all: payments.length,
      paid: payments.filter((p) => p.status === "succeeded" || p.status === "paid").length,
      failed: payments.filter((p) => FAIL.includes(p.status)).length,
      refunded: payments.filter((p) => p.refunded > 0).length,
      disputed: payments.filter((p) => p.disputed).length,
    }),
    [payments]
  );

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return payments.filter((p) => {
      if (tab === "paid" && !(p.status === "succeeded" || p.status === "paid")) return false;
      if (tab === "failed" && !FAIL.includes(p.status)) return false;
      if (tab === "refunded" && !(p.refunded > 0)) return false;
      if (tab === "disputed" && !p.disputed) return false;
      if (!s) return true;
      return [p.orderNumber, p.customer, p.email, String(p.amount)].some((v) =>
        v.toLowerCase().includes(s)
      );
    });
  }, [payments, tab, q]);

  const shownRefunds = useMemo(() => {
    const s = q.trim().toLowerCase();
    return refunds.filter(
      (r) => !s || [r.orderNumber, r.reason, String(r.amount)].some((v) => v.toLowerCase().includes(s))
    );
  }, [refunds, q]);

  const openDisputes = disputes
    .filter((d) => OPEN_DISPUTE.includes(d.status))
    .sort((a, b) => (a.dueBy || "9").localeCompare(b.dueBy || "9"));
  const failedPayments = payments.filter((p) => FAIL.includes(p.status) && p.email);

  const card = "rounded-2xl border border-black/5 bg-white p-4 shadow-sm";

  return (
    <div className="mt-8 space-y-8">
      {testMode && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          TEST MODE — Stripe is using test keys. Real customers cannot pay and no real money moves.
          Switch to live keys before launch.
        </div>
      )}

      {openDisputes.length > 0 && (
        <section className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-900">
            Disputes needing action ({openDisputes.length})
          </h2>
          <div className="mt-3 space-y-2">
            {openDisputes.map((d) => {
              const c = countdown(d.dueBy);
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-ink">
                      {d.orderNumber ? `#${d.orderNumber}` : "Order"} · {d.customer || "Customer"} ·{" "}
                      {money(d.amount, d.currency)}
                    </p>
                    <p className="text-muted-foreground">
                      {d.reason.replace(/_/g, " ") || "No reason"} · {d.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-black ${c.late ? "text-red-700" : "text-amber-700"}`}>
                      Respond by {fmt(d.dueBy)} · {c.text}
                    </span>
                    <a
                      href={d.stripeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Respond in Stripe <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={card}>
          <p className="text-xs font-bold uppercase text-muted-foreground">Kept today</p>
          <p className="mt-1 text-2xl font-black text-ink">{money(stats.today - stats.refToday)}</p>
          <p className="text-xs text-muted-foreground">
            Paid {money(stats.today)} · refunded {money(stats.refToday)}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-bold uppercase text-muted-foreground">Kept, last 7 days</p>
          <p className="mt-1 text-2xl font-black text-ink">{money(stats.week - stats.refWeek)}</p>
          <p className="text-xs text-muted-foreground">
            Paid {money(stats.week)} · refunded {money(stats.refWeek)}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-bold uppercase text-muted-foreground">Kept this month</p>
          <p className="mt-1 text-2xl font-black text-ink">{money(stats.month - stats.refMonth)}</p>
          <p className="text-xs text-muted-foreground">
            Paid {money(stats.month)} · refunded {money(stats.refMonth)}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-bold uppercase text-muted-foreground">Payments this month</p>
          <p className="mt-1 text-2xl font-black text-ink">{stats.monthCount}</p>
          <p className="text-xs text-muted-foreground">Successful card payments</p>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-black text-ink">Webhook health</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Last event received: <strong>{fmt(health.lastReceived)}</strong>
          {health.stuck > 0 && (
            <span className="ml-3 font-bold text-amber-700">{health.stuck} stuck processing</span>
          )}
        </p>
        {health.failed.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-emerald-700">No failed events. All good.</p>
        ) : (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-bold text-red-700">{health.failed.length} failed events</p>
            {health.failed.slice(0, 5).map((f, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {fmt(f.date)} · {f.type} · {f.message || "No message"}
              </p>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["payments", "refunds"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  view === v ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-black/10"
                }`}
              >
                {v === "payments" ? `Payments (${payments.length})` : `Refunds (${refunds.length})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search order, customer, email…"
                className="rounded-full border border-black/10 bg-white py-2 pl-9 pr-4 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                view === "payments"
                  ? csv("payments.csv", [
                      ["Date", "Order", "Customer", "Email", "Amount", "Currency", "Status", "Refunded"],
                      ...shown.map((p) => [fmt(p.date), p.orderNumber, p.customer, p.email, p.amount, p.currency, p.status, p.refunded]),
                    ])
                  : csv("refunds.csv", [
                      ["Date", "Order", "Amount", "Currency", "Status", "Reason"],
                      ...shownRefunds.map((r) => [fmt(r.date), r.orderNumber, r.amount, r.currency, r.status, r.reason]),
                    ])
              }
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> CSV
            </button>
          </div>
        </div>

        {view === "payments" ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["paid", "Paid"],
                  ["failed", "Failed / abandoned"],
                  ["refunded", "Refunded"],
                  ["disputed", "Disputed"],
                ] as [Tab, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    tab === k ? "bg-brand text-white" : "bg-white text-ink ring-1 ring-black/10"
                  }`}
                >
                  {label} ({counts[k]})
                </button>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nothing here.
                      </td>
                    </tr>
                  )}
                  {shown.map((p) => (
                    <tr key={p.id} className="border-t border-black/5">
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(p.date)}</td>
                      <td className="px-4 py-3 font-bold">#{p.orderNumber || "—"}</td>
                      <td className="px-4 py-3">
                        {p.customer || "—"}
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {money(p.amount, p.currency)}
                        {p.refunded > 0 && (
                          <div className="text-xs font-semibold text-sky-700">
                            Refunded {money(p.refunded, p.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {badge(p.status)}
                        {p.disputed && <span className="ml-1 text-xs font-bold text-red-700">Disputed</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.orderId && (
                          <a href="/admin/orders" className="mr-3 font-semibold text-brand">
                            Order
                          </a>
                        )}
                        {p.stripeUrl && (
                          <a href={p.stripeUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand">
                            Stripe
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {failedPayments.length > 0 && tab === "failed" && (
              <p className="mt-3 text-xs text-muted-foreground">
                These customers tried to pay and did not finish. Emails are shown above so you can follow up.
              </p>
            )}
          </>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {shownRefunds.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No refunds.
                    </td>
                  </tr>
                )}
                {shownRefunds.map((r) => (
                  <tr key={r.id} className="border-t border-black/5">
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(r.date)}</td>
                    <td className="px-4 py-3 font-bold">#{r.orderNumber || "—"}</td>
                    <td className="px-4 py-3 font-bold">{money(r.amount, r.currency)}</td>
                    <td className="px-4 py-3">{r.reason || "—"}</td>
                    <td className="px-4 py-3">{badge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
