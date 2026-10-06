import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total_amount, subtotal, tax_amount, shipping_amount, currency, created_on, placed_on")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_id, sku, product_name, unit_price, quantity, line_total")
    .eq("order_id", order.id)
    .order("id");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12 md:py-16">
        <Link href="/account/orders" className="text-sm font-bold text-brand hover:underline">
          Back to orders
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <section>
            <p className="cm-eyebrow">Order details</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink">
              {order.order_number}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {new Date(order.placed_on || order.created_on).toLocaleString()}
            </p>

            <div className="mt-8 space-y-4">
              {(items ?? []).map((item) => (
                <article key={item.id} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-ink">{item.product_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Part number: {item.sku}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-black text-ink">${Number(item.line_total).toFixed(2)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="h-fit rounded-[28px] bg-ink p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.12)]">
            <h2 className="text-xl font-black">Order summary</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Status</dt>
                <dd className="font-bold capitalize">{order.status.replace("_", " ")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Payment</dt>
                <dd className="font-bold capitalize">{order.payment_status.replace("_", " ")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Subtotal</dt>
                <dd className="font-bold">${Number(order.subtotal).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Shipping</dt>
                <dd className="font-bold">${Number(order.shipping_amount).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/50">Tax</dt>
                <dd className="font-bold">${Number(order.tax_amount).toFixed(2)}</dd>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between gap-4 text-lg font-black">
                  <dt>Total</dt>
                  <dd>${Number(order.total_amount).toFixed(2)} {order.currency}</dd>
                </div>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
