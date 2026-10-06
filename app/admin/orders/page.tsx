import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateOrderStatus } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Orders Admin",
  robots: { index: false, follow: false },
};

function nextStatus(status: string) {
  switch (status) {
    case "paid":
      return "processing";
    case "processing":
      return "shipped";
    case "shipped":
      return "delivered";
    case "pending":
    case "payment_pending":
      return "cancelled";
    default:
      return null;
  }
}

export default async function OrdersAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total_amount, currency, customer_email, customer_name, created_on")
    .order("created_on", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("Unable to load orders.");
  }

  return (
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-bold text-ink">Orders</h1>
          </div>
          <p className="text-sm text-muted-foreground">Signed in as {role}</p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-5 py-4 font-semibold text-ink">Order</th>
                  <th className="px-5 py-4 font-semibold text-ink">Customer</th>
                  <th className="px-5 py-4 font-semibold text-ink">Payment</th>
                  <th className="px-5 py-4 font-semibold text-ink">Status</th>
                  <th className="px-5 py-4 font-semibold text-ink">Total</th>
                  <th className="px-5 py-4 font-semibold text-ink">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(orders ?? []).map((order) => {
                  const next = nextStatus(order.status);

                  return (
                    <tr key={order.id}>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{order.order_number}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(order.created_on).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink">{order.customer_name || "Customer"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {order.customer_email || "No email"}
                        </div>
                      </td>
                      <td className="px-5 py-4 capitalize">{order.payment_status}</td>
                      <td className="px-5 py-4 capitalize">{order.status}</td>
                      <td className="px-5 py-4 font-semibold text-ink">
                        ${Number(order.total_amount).toFixed(2)} {order.currency}
                      </td>
                      <td className="px-5 py-4">
                        {next ? (
                          <form action={updateOrderStatus.bind(null, order.id, next)}>
                            <button
                              type="submit"
                              className="rounded-full bg-ink px-4 py-2 font-semibold text-white transition hover:bg-brand"
                            >
                              Mark {next.replace("_", " ")}
                            </button>
                          </form>
                        ) : (
                          <span className="text-muted-foreground">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
