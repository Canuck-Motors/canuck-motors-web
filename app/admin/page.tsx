import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  ImageOff,
  PackageCheck,
  RotateCcw,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import AiStatusCard from "@/components/admin/AiStatusCard";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

const TZ = "America/Vancouver";
const money = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
const dayKey = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

const TO_SHIP = ["paid", "processing", "packed", "ready_to_ship"];
const RETURN_CLOSED = ["completed", "closed", "rejected", "cancelled", "canceled", "refunded", "denied", "exchanged", "exchange_completed", "resolved"];

type Supa = Awaited<ReturnType<typeof createClient>>;

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await page(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function loadDashboard(supabase: Supa, role: string) {
  const since = new Date(Date.now() - 31 * 86400000).toISOString();

  const [orders, items, stock, products, returns, run, disputes, recent] = await Promise.all([
    fetchAll<{ total_amount: number; created_on: string; status: string; payment_status: string }>((a, b) =>
      supabase
        .from("orders")
        .select("total_amount, created_on, status, payment_status")
        .gte("created_on", since)
        .range(a, b)
    ),
    fetchAll<{ product_name: string; sku: string; quantity: number }>((a, b) =>
      supabase
        .from("order_items")
        .select("product_name, sku, quantity, orders!inner(created_on, payment_status, status)")
        .gte("orders.created_on", since)
        .eq("orders.payment_status", "paid")
        .neq("orders.status", "cancelled")
        .range(a, b)
    ),
    fetchAll<{
      quantity: number;
      reserved_quantity: number;
      low_stock_threshold: number | null;
      products: { id: number; product_name: string; sku: string } | { id: number; product_name: string; sku: string }[] | null;
    }>((a, b) =>
      supabase
        .from("inventory")
        .select("quantity, reserved_quantity, low_stock_threshold, products!inner(id, product_name, sku, is_active, is_delete)")
        .eq("products.is_active", true)
        .eq("products.is_delete", false)
        .range(a, b)
    ),
    fetchAll<{ id: number; is_active: boolean; product_images: { id: number }[] | null }>((a, b) =>
      supabase
        .from("products")
        .select("id, is_active, product_images(id)")
        .eq("is_delete", false)
        .range(a, b)
    ),
    supabase.from("return_requests").select("status").limit(1000),
    role === "admin"
      ? supabase
          .from("stripe_reconciliation_runs")
          .select("status, issue_count, started_on")
          .order("started_on", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    role === "admin"
      ? supabase.from("payment_disputes").select("status").limit(500)
      : Promise.resolve({ data: null }),
    supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total_amount, customer_name, created_on")
      .order("created_on", { ascending: false })
      .limit(5),
  ]);

  // Sales
  const paid = orders.filter((o) => o.payment_status === "paid" && o.status !== "cancelled");
  const today = dayKey(new Date());
  const sum = (list: typeof paid) => list.reduce((t, o) => t + Number(o.total_amount ?? 0), 0);
  const within = (days: number) =>
    paid.filter((o) => Date.now() - new Date(o.created_on).getTime() < days * 86400000);
  const todayOrders = paid.filter((o) => dayKey(o.created_on) === today);
  const monthStart = today.slice(0, 8) + "01";
  const monthOrders = paid.filter((o) => dayKey(o.created_on) >= monthStart);
  const week = within(7);

  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) byDay.set(dayKey(new Date(Date.now() - i * 86400000)), 0);
  for (const o of paid) {
    const k = dayKey(o.created_on);
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + Number(o.total_amount ?? 0));
  }
  const chart = [...byDay.entries()];
  const chartMax = Math.max(1, ...chart.map(([, v]) => v));

  // Needs attention
  const toShip = orders.filter((o) => o.payment_status === "paid" && TO_SHIP.includes(o.status)).length;
  const openReturns = (returns.data ?? []).filter((r) => !RETURN_CLOSED.includes(String(r.status))).length;
  const openDisputes = (disputes.data ?? []).filter((d) => /needs_response|warning_needs|under_review/.test(String(d.status))).length;
  const stripeIssues = run.data && run.data.status !== "running" ? Number(run.data.issue_count ?? 0) : 0;

  // Stock
  const lowStock = stock
    .map((r) => {
      const p = Array.isArray(r.products) ? r.products[0] : r.products;
      return {
        id: p?.id,
        name: p?.product_name ?? "",
        sku: p?.sku ?? "",
        available: (r.quantity ?? 0) - (r.reserved_quantity ?? 0),
        threshold: r.low_stock_threshold ?? 5,
      };
    })
    .filter((r) => r.available <= r.threshold)
    .sort((a, b) => a.available - b.available);

  // Catalog health
  const visible = products.filter((p) => p.is_active);
  const hidden = products.length - visible.length;
  const noImage = visible.filter((p) => !(p.product_images?.length)).length;

  // Top sellers
  const sold = new Map<string, { name: string; sku: string; qty: number }>();
  for (const it of items) {
    const cur = sold.get(it.sku) ?? { name: it.product_name, sku: it.sku, qty: 0 };
    cur.qty += Number(it.quantity ?? 0);
    sold.set(it.sku, cur);
  }
  const top = [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

  return {
    sales: {
      today: sum(todayOrders),
      todayCount: todayOrders.length,
      week: sum(week),
      weekCount: week.length,
      month: sum(monthOrders),
      monthCount: monthOrders.length,
    },
    chart,
    chartMax,
    attention: { toShip, openReturns, openDisputes, stripeIssues },
    lowStock,
    health: { visible: visible.length, hidden, noImage },
    top,
    recent: recent.data ?? [],
  };
}

const card =
  "rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_38px_rgba(0,0,0,0.06)]";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const d = await loadDashboard(supabase, String(role));

  const attention = [
    { label: "Orders to ship", value: d.attention.toShip, href: "/admin/orders", icon: PackageCheck },
    { label: "Open returns", value: d.attention.openReturns, href: "/admin/returns", icon: RotateCcw },
    ...(role === "admin"
      ? [
          {
            label: "Payment issues",
            value: d.attention.openDisputes + d.attention.stripeIssues,
            href: "/admin/stripe/reconciliation",
            icon: CreditCard,
          },
        ]
      : []),
    { label: "Low / out of stock", value: d.lowStock.length, href: "/admin/inventory?filter=low", icon: Boxes },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10">
          <p className="cm-eyebrow">Canuck Motors Admin</p>
          <h1 className="cm-section-title mt-3">Operations dashboard</h1>
          <p className="mt-3 text-sm text-muted-foreground">Signed in as {role}.</p>
        </div>

        {role === "admin" && <AiStatusCard />}

        {/* Needs attention */}
        <h2 className="mt-8 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Needs attention
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {attention.map(({ label, value, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={`${card} group transition hover:-translate-y-1 hover:border-brand/25 ${
                value > 0 ? "border-brand/30" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    value > 0 ? "bg-brand text-white" : "bg-brand-tint text-brand"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-brand">Open</span>
              </div>
              <p className="mt-5 text-sm font-semibold text-muted-foreground">{label}</p>
              <p className="mt-1 text-4xl font-black tracking-[-0.04em] text-ink">{value}</p>
            </Link>
          ))}
        </div>

        {/* Sales */}
        <h2 className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Sales (paid orders)
        </h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {[
            ["Today", d.sales.today, d.sales.todayCount],
            ["Last 7 days", d.sales.week, d.sales.weekCount],
            ["This month", d.sales.month, d.sales.monthCount],
          ].map(([label, amount, count]) => (
            <div key={String(label)} className={card}>
              <p className="text-sm font-semibold text-muted-foreground">{label}</p>
              <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-ink">
                {money(Number(amount))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {count} order{Number(count) === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>

        <div className={`${card} mt-4`}>
          <p className="text-sm font-semibold text-ink">Last 30 days</p>
          <div className="mt-4 flex h-40 items-end gap-1" role="img" aria-label="Daily sales for the last 30 days">
            {d.chart.map(([day, value]) => (
              <div key={day} className="group relative flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-brand/80 transition group-hover:bg-brand"
                  style={{ height: `${Math.max(value > 0 ? 4 : 1, (value / d.chartMax) * 100)}%` }}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                  {day.slice(5)}: {money(value)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{d.chart[0]?.[0]}</span>
            <span>{d.chart[d.chart.length - 1]?.[0]}</span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Catalog health */}
          <div className={card}>
            <p className="text-sm font-bold text-ink">Catalog health</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Link href="/admin/inventory?filter=visible" className="rounded-2xl bg-secondary p-4 hover:bg-brand-tint">
                <Eye className="mx-auto h-5 w-5 text-brand" aria-hidden="true" />
                <p className="mt-2 text-2xl font-black text-ink">{d.health.visible}</p>
                <p className="text-xs text-muted-foreground">Visible</p>
              </Link>
              <Link href="/admin/inventory?filter=hidden" className="rounded-2xl bg-secondary p-4 hover:bg-brand-tint">
                <EyeOff className="mx-auto h-5 w-5 text-brand" aria-hidden="true" />
                <p className="mt-2 text-2xl font-black text-ink">{d.health.hidden}</p>
                <p className="text-xs text-muted-foreground">Hidden</p>
              </Link>
              <Link href="/admin/inventory?filter=noimage" className="rounded-2xl bg-secondary p-4 hover:bg-brand-tint">
                <ImageOff className="mx-auto h-5 w-5 text-brand" aria-hidden="true" />
                <p className="mt-2 text-2xl font-black text-ink">{d.health.noImage}</p>
                <p className="text-xs text-muted-foreground">Visible, no photo</p>
              </Link>
            </div>
          </div>

          {/* Top sellers */}
          <div className={card}>
            <p className="text-sm font-bold text-ink">Top sellers (30 days)</p>
            {d.top.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No paid orders yet.</p>
            ) : (
              <ol className="mt-3 divide-y text-sm">
                {d.top.map((t) => (
                  <li key={t.sku} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold text-ink">{t.sku}</span>{" "}
                      <span className="text-muted-foreground">{t.name}</span>
                    </span>
                    <span className="shrink-0 font-bold text-brand">{t.qty} sold</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Low stock */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" /> Low &amp; out of stock
              </p>
              <Link href="/admin/inventory" className="text-xs font-bold text-brand hover:underline">
                Manage
              </Link>
            </div>
            {d.lowStock.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Everything is well stocked.</p>
            ) : (
              <ul className="mt-3 divide-y text-sm">
                {d.lowStock.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/inventory/${s.id}`} className="min-w-0 truncate hover:text-brand">
                      <span className="font-semibold text-ink">{s.sku}</span>{" "}
                      <span className="text-muted-foreground">{s.name}</span>
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        s.available <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.available <= 0 ? "Out" : `${s.available} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent orders */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Recent orders</p>
              <Link href="/admin/orders" className="text-xs font-bold text-brand hover:underline">
                All orders
              </Link>
            </div>
            {d.recent.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="mt-3 divide-y text-sm">
                {d.recent.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold text-ink">{o.order_number}</span>{" "}
                      <span className="text-muted-foreground">{o.customer_name || "Customer"}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="font-bold text-ink">{money(Number(o.total_amount ?? 0))}</span>
                      <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold capitalize text-brand">
                        {String(o.status).replaceAll("_", " ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
