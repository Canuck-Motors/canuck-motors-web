import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CircleAlert, CreditCard, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  StripeManager,
  type DisputeRow,
  type PaymentRow,
  type RefundRow,
  type WebhookHealth,
} from "@/components/admin/StripeManager";

type Rec = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

async function loadAll(table: string, order: string, max = 2000): Promise<Rec[]> {
  const admin = createAdminClient();
  const out: Rec[] = [];
  for (let from = 0; from < max; from += 1000) {
    let res = await admin.from(table).select("*").order(order, { ascending: false }).range(from, from + 999);
    if (res.error) {
      res = await admin.from(table).select("*").range(from, from + 999);
    }
    if (res.error) break;
    out.push(...((res.data ?? []) as Rec[]));
    if ((res.data ?? []).length < 1000) break;
  }
  return out;
}

export const instant = false;

export const metadata: Metadata = {
  title: "Stripe Configuration",
  robots: { index: false, follow: false },
};

function status(value: boolean, label: string) {
  return { value, label };
}

export default async function StripeAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (role !== "admin") {
    redirect("/admin");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const checks = [
    status(Boolean(process.env.STRIPE_SECRET_KEY), "Stripe secret key"),
    status(Boolean(process.env.STRIPE_WEBHOOK_SECRET), "Stripe webhook secret"),
    status(
      Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      "Supabase secret (service-role) key"
    ),
    status(Boolean(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL), "Site URL"),
  ];

  const [payRaw, refRaw, disRaw, hookRaw] = await Promise.all([
    loadAll("payments", "created_on"),
    loadAll("refunds", "created_on"),
    loadAll("payment_disputes", "updated_on"),
    loadAll("webhook_events", "created_on", 1000),
  ]);

  const admin = createAdminClient();
  const orderIds = Array.from(
    new Set([...payRaw, ...refRaw].map((r) => str(r.order_id)).filter(Boolean))
  );
  const orderMap = new Map<string, Rec>();
  for (let i = 0; i < orderIds.length; i += 200) {
    const { data } = await admin
      .from("orders")
      .select("id, order_number, customer_name, customer_email")
      .in("id", orderIds.slice(i, i + 200));
    for (const o of (data ?? []) as Rec[]) orderMap.set(str(o.id), o);
  }

  const isTest = secretKey.startsWith("sk_test_");
  const base = `https://dashboard.stripe.com/${isTest ? "test/" : ""}`;

  const refundedByOrder = new Map<string, number>();
  for (const r of refRaw) {
    if (str(r.status) === "succeeded") {
      const k = str(r.order_id);
      refundedByOrder.set(k, (refundedByOrder.get(k) ?? 0) + Number(r.amount ?? 0));
    }
  }
  const disputedIntents = new Set(disRaw.map((d) => str(d.stripe_payment_intent_id)).filter(Boolean));

  const payments: PaymentRow[] = payRaw.map((p) => {
    const o = orderMap.get(str(p.order_id));
    const pi = str(p.provider_payment_intent_id);
    return {
      id: str(p.id),
      date: str(p.created_on || p.updated_on),
      orderId: str(p.order_id),
      orderNumber: str(o?.order_number),
      customer: str(o?.customer_name),
      email: str(o?.customer_email),
      amount: Number(p.amount ?? 0),
      currency: str(p.currency) || "CAD",
      status: str(p.status) || "pending",
      stripeUrl: pi ? `${base}payments/${pi}` : "",
      refunded: refundedByOrder.get(str(p.order_id)) ?? 0,
      disputed: pi ? disputedIntents.has(pi) : false,
    };
  });

  const refunds: RefundRow[] = refRaw.map((r) => ({
    id: str(r.id),
    date: str(r.created_on || r.updated_on),
    orderId: str(r.order_id),
    orderNumber: str(orderMap.get(str(r.order_id))?.order_number),
    amount: Number(r.amount ?? 0),
    currency: str(r.currency) || "CAD",
    status: str(r.status),
    reason: str(r.reason),
  }));

  const payByIntent = new Map(payRaw.map((p) => [str(p.provider_payment_intent_id), p]));
  const disputes: DisputeRow[] = disRaw.map((d) => {
    const pay = payByIntent.get(str(d.stripe_payment_intent_id));
    const o = pay ? orderMap.get(str(pay.order_id)) : undefined;
    return {
      id: str(d.id),
      date: str(d.updated_on),
      orderNumber: str(o?.order_number),
      customer: str(o?.customer_name),
      amount: Number(d.amount ?? 0),
      currency: str(d.currency) || "CAD",
      status: str(d.status),
      reason: str(d.reason),
      dueBy: str(d.evidence_due_by),
      stripeUrl: `${base}disputes/${str(d.stripe_dispute_id)}`,
    };
  });

  const hookDate = (h: Rec) => str(h.processed_on || h.created_on || h.received_on);
  const health: WebhookHealth = {
    lastReceived: hookRaw.map((h) => str(h.created_on || h.received_on || h.processed_on)).sort().pop() ?? "",
    failed: hookRaw
      .filter((h) => str(h.status) === "failed")
      .map((h) => ({ type: str(h.event_type), message: str(h.error_message), date: hookDate(h) })),
    stuck: hookRaw.filter((h) => str(h.status) === "processing").length,
  };

  const mode = secretKey.startsWith("sk_test_")
    ? "Test mode"
    : secretKey.startsWith("sk_live_")
      ? "Live mode"
      : "Not configured";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10">
          <p className="cm-eyebrow">Payments</p>
          <h1 className="cm-section-title mt-3">Payments &amp; Stripe</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            This page checks configuration without exposing secret values.
          </p>
        </div>

        <StripeManager
          payments={payments}
          refunds={refunds}
          disputes={disputes}
          health={health}
          testMode={isTest}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-tint text-brand">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-black text-ink">{mode}</h2>
                <p className="text-sm text-muted-foreground">
                  Stripe Checkout uses server-side pricing and a verified webhook.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {checks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-secondary/60 px-4 py-4"
                >
                  <span className="font-semibold text-ink">{check.label}</span>
                  <span className={check.value ? "inline-flex items-center gap-2 font-bold text-emerald-700" : "inline-flex items-center gap-2 font-bold text-amber-700"}>
                    {check.value ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <CircleAlert className="h-4 w-4" aria-hidden="true" />
                    )}
                    {check.value ? "Configured" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-[28px] bg-ink p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.12)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
              Webhook endpoint
            </p>
            <p className="mt-3 break-all font-mono text-sm text-white/80">
              /api/stripe/webhook
            </p>
            <p className="mt-5 text-sm leading-6 text-white/55">
              Keep Checkout, refunds, and disputes synchronized through the verified
              webhook endpoint.
            </p>

            <Link
              href="/admin/stripe/reconciliation"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reconciliation & disputes
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
