import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CircleAlert, CreditCard, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";

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
    status(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "Supabase service-role key"),
    status(Boolean(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL), "Site URL"),
  ];

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
          <h1 className="cm-section-title mt-3">Stripe readiness</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            This page checks configuration without exposing secret values.
          </p>
        </div>

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
              Subscribe to checkout.session.completed, checkout.session.expired,
              checkout.session.async_payment_succeeded, and
              checkout.session.async_payment_failed.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
