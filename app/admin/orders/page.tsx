import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createShipment,
  updateOrderStatus,
} from "@/app/admin/actions";
import { AdminNav } from "@/components/AdminNav";

export const instant = false;

export const metadata: Metadata = {
  title: "Orders Admin",
  robots: { index: false, follow: false },
};

function nextStatus(status: string) {
  switch (status) {
    case "paid":
      return "processing";
    case "processing":
      return "packed";
    case "packed":
      return "ready_to_ship";
    case "ready_to_ship":
      return "shipped";
    case "shipped":
      return "out_for_delivery";
    case "out_for_delivery":
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
    .select(
      "id, order_number, status, fulfillment_status, payment_status, total_amount, currency, customer_email, customer_name, created_on, shipments(id, carrier, tracking_number, tracking_url, status, estimated_delivery)"
    )
    .order("created_on", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("Unable to load orders.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">Operations</p>
            <h1 className="cm-section-title mt-3">Orders</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Manage fulfillment, create shipments, and monitor payment state.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Signed in as {role}</p>
        </div>

        <div className="mt-8 space-y-5">
          {(orders ?? []).map((order) => {
            const next = nextStatus(order.status);
            const latestShipment = Array.isArray(order.shipments)
              ? order.shipments[0]
              : order.shipments;

            return (
              <article
                key={order.id}
                className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-lg font-black text-ink">
                      {order.order_number}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.customer_name || "Customer"} ·{" "}
                      {order.customer_email || "No email"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.created_on).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-black text-ink">
                      $\{Number(order.total_amount).toFixed(2)} {order.currency}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold capitalize text-brand">
                        {order.status.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold capitalize text-ink/70">
                        {order.payment_status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
                  <div>
                    <div className="rounded-2xl bg-secondary/60 p-4">
                      <p className="text-sm font-bold text-ink">
                        Fulfillment:{" "}
                        <span className="capitalize">
                          {order.fulfillment_status.replaceAll("_", " ")}
                        </span>
                      </p>

                      {latestShipment ? (
                        <div className="mt-3 text-sm text-muted-foreground">
                          <p>
                            {latestShipment.carrier} ·{" "}
                            {latestShipment.tracking_number || "Tracking pending"}
                          </p>
                          <p className="mt-1 capitalize">
                            {latestShipment.status.replaceAll("_", " ")}
                          </p>
                          {latestShipment.tracking_url && (
                            <a
                              href={latestShipment.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex font-bold text-brand hover:underline"
                            >
                              Open carrier tracking
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No shipment has been created yet.
                        </p>
                      )}
                    </div>

                    {next && (
                      <form
                        action={updateOrderStatus.bind(null, order.id, next)}
                        className="mt-4"
                      >
                        <button type="submit" className="cm-button-dark">
                          Mark {next.replaceAll("_", " ")}
                        </button>
                      </form>
                    )}
                  </div>

                  <form
                    action={async (formData) => {
                      "use server";
                      await createShipment(
                        order.id,
                        String(formData.get("carrier") || ""),
                        String(formData.get("tracking_number") || ""),
                        String(formData.get("tracking_url") || ""),
                        String(formData.get("service_level") || ""),
                        String(formData.get("estimated_delivery") || "")
                      );
                    }}
                    className="rounded-2xl border border-black/5 p-4"
                  >
                    <p className="font-bold text-ink">Create / update shipment</p>

                    <input
                      name="carrier"
                      defaultValue={latestShipment?.carrier || ""}
                      placeholder="Carrier"
                      className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                      required
                    />
                    <input
                      name="tracking_number"
                      defaultValue={latestShipment?.tracking_number || ""}
                      placeholder="Tracking number"
                      className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                      required
                    />
                    <input
                      name="tracking_url"
                      defaultValue={latestShipment?.tracking_url || ""}
                      placeholder="Carrier tracking URL"
                      className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                    />
                    <input
                      name="service_level"
                      placeholder="Service level, e.g. Ground"
                      className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                    />
                    <input
                      name="estimated_delivery"
                      type="datetime-local"
                      className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                    />
                    <button type="submit" className="cm-button-primary mt-3 w-full">
                      Save shipment
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
