import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Order Confirmation",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect("/");
  }

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
    redirect("/");
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("order_id, status")
    .eq("provider_checkout_session_id", sessionId)
    .maybeSingle();

  let order:
    | {
        id: string;
        order_number: string;
        status: string;
        payment_status: string;
        total_amount: number;
        currency: string;
      }
    | null = null;

  if (payment?.order_id) {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total_amount, currency")
      .eq("id", payment.order_id)
      .eq("user_id", profile.id)
      .maybeSingle();

    order = data;
  }

  return (
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border bg-white p-8 text-center md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Checkout
          </p>

          <h1 className="mt-3 text-3xl font-bold text-ink md:text-5xl">
            {order?.payment_status === "paid"
              ? "Payment confirmed"
              : "Payment is being confirmed"}
          </h1>

          <p className="mt-4 leading-7 text-muted-foreground">
            {order?.payment_status === "paid"
              ? "Your order has been created successfully."
              : "Stripe has returned you to Canuck Motors. We are waiting for the verified payment webhook before marking the order as paid."}
          </p>

          {order && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl bg-secondary p-5 text-left">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Order</dt>
                  <dd className="font-semibold text-ink">{order.order_number}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Order status</dt>
                  <dd className="font-semibold capitalize text-ink">{order.status}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd className="font-semibold capitalize text-ink">
                    {order.payment_status}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold text-ink">
                    ${Number(order.total_amount).toFixed(2)} {order.currency}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/protected"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white"
            >
              View account
            </Link>
            <Link
              href="/"
              className="rounded-full border bg-white px-6 py-3 text-sm font-semibold text-ink"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
