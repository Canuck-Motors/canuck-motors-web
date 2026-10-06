import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, ShoppingCart, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, first_name, last_name, email_id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error("Customer profile is unavailable.");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total_amount, currency, created_on")
    .eq("user_id", profile.id)
    .order("created_on", { ascending: false })
    .limit(5);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12 md:py-16">
        <div className="rounded-[30px] bg-ink p-7 text-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] md:p-10">
          <p className="cm-eyebrow">Customer account</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">
            Welcome back{profile.first_name ? `, ${profile.first_name}` : ""}.
          </h1>
          <p className="mt-3 max-w-2xl text-white/60">
            Track your orders, review purchases, and manage your Canuck Motors account.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Link href="/account/orders" className="group rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_38px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-brand/25">
            <Package className="h-6 w-6 text-brand" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-black text-ink">Order history</h2>
            <p className="mt-2 text-sm text-muted-foreground">View every order and its current status.</p>
          </Link>
          <Link href="/cart" className="group rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_38px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-brand/25">
            <ShoppingCart className="h-6 w-6 text-brand" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-black text-ink">Your cart</h2>
            <p className="mt-2 text-sm text-muted-foreground">Return to your current shopping cart.</p>
          </Link>
          <div className="rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_38px_rgba(0,0,0,0.06)]">
            <UserRound className="h-6 w-6 text-brand" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-black text-ink">Profile</h2>
            <p className="mt-2 text-sm text-muted-foreground">{profile.email_id}</p>
          </div>
        </div>

        <section className="mt-10 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="cm-eyebrow">Recent activity</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">Recent orders</h2>
            </div>
            <Link href="/account/orders" className="text-sm font-bold text-brand hover:underline">
              View all
            </Link>
          </div>

          <div className="mt-6 divide-y">
            {(orders ?? []).length === 0 ? (
              <div className="py-8 text-sm text-muted-foreground">
                You have not placed any orders yet.
              </div>
            ) : (
              (orders ?? []).map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-5 transition hover:text-brand"
                >
                  <div>
                    <p className="font-bold text-ink">{order.order_number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(order.created_on).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink">
                      ${Number(order.total_amount).toFixed(2)} {order.currency}
                    </p>
                    <p className="mt-1 text-sm capitalize text-muted-foreground">
                      {order.status.replace("_", " ")}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
