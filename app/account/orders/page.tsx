import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Order History",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error("Customer profile is unavailable.");
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total_amount, currency, created_on, placed_on")
    .eq("user_id", profile.id)
    .order("created_on", { ascending: false });

  if (error) {
    throw new Error("Unable to load your orders.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">My account</p>
            <h1 className="cm-section-title mt-3">Order history</h1>
          </div>
          <Link href="/account" className="text-sm font-bold text-brand hover:underline">
            Back to account
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {(orders ?? []).length === 0 ? (
            <div className="cm-card p-10 text-center">
              <h2 className="text-xl font-black text-ink">No orders yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your completed and in-progress orders will appear here.
              </p>
            </div>
          ) : (
            (orders ?? []).map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-[24px] border border-black/5 bg-white p-6 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div>
                    <p className="text-lg font-black text-ink">{order.order_number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(order.placed_on || order.created_on).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-brand-tint px-3 py-1.5 text-xs font-bold capitalize text-brand">
                      {order.status.replace("_", " ")}
                    </span>
                    <span className="text-lg font-black text-ink">
                      ${Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
