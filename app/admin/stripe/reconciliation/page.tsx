import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { runManualStripeReconciliation } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Stripe Reconciliation",
  robots: { index: false, follow: false },
};

export default async function StripeReconciliationPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (role !== "admin") {
    redirect("/admin");
  }

  const [{ data: runs }, { data: disputes }] = await Promise.all([
    supabase
      .from("stripe_reconciliation_runs")
      .select(
        "id, status, checked_payments, checked_refunds, checked_disputes, issue_count, error_message, started_on, completed_on"
      )
      .order("started_on", { ascending: false })
      .limit(20),
    supabase
      .from("payment_disputes")
      .select(
        "id, stripe_dispute_id, amount, currency, status, reason, evidence_due_by, updated_on, orders(order_number, customer_name)"
      )
      .order("updated_on", { ascending: false })
      .limit(50),
  ]);

  const latestRun = runs?.[0] ?? null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="cm-eyebrow">Payments</p>
            <h1 className="cm-section-title mt-3">Stripe reconciliation</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Compare local payment, refund, and dispute state against Stripe and
              repair safe mismatches automatically.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await runManualStripeReconciliation();
            }}
          >
            <button type="submit" className="cm-button-primary gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Run reconciliation
            </button>
          </form>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <div className="cm-card p-5">
            <p className="text-sm text-muted-foreground">Last status</p>
            <p className="mt-2 text-xl font-black capitalize text-ink">
              {latestRun?.status?.replaceAll("_", " ") || "Not run"}
            </p>
          </div>
          <div className="cm-card p-5">
            <p className="text-sm text-muted-foreground">Payments checked</p>
            <p className="mt-2 text-3xl font-black text-ink">
              {latestRun?.checked_payments ?? 0}
            </p>
          </div>
          <div className="cm-card p-5">
            <p className="text-sm text-muted-foreground">Refunds checked</p>
            <p className="mt-2 text-3xl font-black text-ink">
              {latestRun?.checked_refunds ?? 0}
            </p>
          </div>
          <div className="cm-card p-5">
            <p className="text-sm text-muted-foreground">Issues found</p>
            <p className="mt-2 text-3xl font-black text-ink">
              {latestRun?.issue_count ?? 0}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)]">
          <h2 className="text-2xl font-black text-ink">Recent reconciliation runs</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payments</th>
                  <th className="px-4 py-3">Refunds</th>
                  <th className="px-4 py-3">Disputes</th>
                  <th className="px-4 py-3">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(runs ?? []).map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3">
                      {new Date(run.started_on).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <span className="inline-flex items-center gap-2 font-bold">
                        {run.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        {run.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">{run.checked_payments}</td>
                    <td className="px-4 py-3">{run.checked_refunds}</td>
                    <td className="px-4 py-3">{run.checked_disputes}</td>
                    <td className="px-4 py-3 font-bold">{run.issue_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)]">
          <h2 className="text-2xl font-black text-ink">Stripe disputes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open disputes should be reviewed promptly in Stripe before the evidence deadline.
          </p>

          <div className="mt-5 space-y-4">
            {(disputes ?? []).length === 0 ? (
              <div className="rounded-2xl bg-secondary/60 p-5 text-sm text-muted-foreground">
                No Stripe disputes recorded.
              </div>
            ) : (
              (disputes ?? []).map((dispute) => {
                const order = Array.isArray(dispute.orders)
                  ? dispute.orders[0]
                  : dispute.orders;

                return (
                  <article
                    key={dispute.id}
                    className="rounded-2xl border border-black/5 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-ink">
                          {order?.order_number || dispute.stripe_dispute_id}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order?.customer_name || "Customer"} · {dispute.reason || "No reason"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-ink">
                          ${Number(dispute.amount).toFixed(2)} {dispute.currency}
                        </p>
                        <p className="mt-1 text-sm font-bold capitalize text-brand">
                          {dispute.status.replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>

                    {dispute.evidence_due_by && (
                      <p className="mt-3 text-sm text-amber-700">
                        Evidence due: {new Date(dispute.evidence_due_by).toLocaleString()}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
