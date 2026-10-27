import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  robots: { index: false, follow: false },
};

type Json = Record<string, unknown>;
const one = <T,>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : (value ?? undefined);

const label = (value: string) => value.replaceAll("_", " ");

const tone = (status: string) => {
  if (["completed", "refunded", "received"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (["rejected", "cancelled", "canceled", "inspection_failed"].includes(status)) {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (["approved", "label_issued", "in_transit", "refund_pending", "exchange_processing"].includes(status)) {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  return "bg-brand-tint text-brand ring-brand/20";
};

export default async function AccountReturnsPage() {
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

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("user_id", profile.id);

  const orderIds = (orders ?? []).map((order) => order.id);
  const orderNumberById = new Map(
    (orders ?? []).map((order) => [String(order.id), String(order.order_number)])
  );

  const { data: requests, error } =
    orderIds.length > 0
      ? await supabase
          .from("return_requests")
          .select(
            "id, order_id, request_type, status, reason_code, reason_text, resolution_notes, requested_on, updated_on, return_request_items(quantity, order_items!inner(product_name, sku))"
          )
          .in("order_id", orderIds)
          .order("requested_on", { ascending: false })
      : { data: [], error: null };

  if (error) {
    throw new Error("Unable to load your returns.");
  }

  const rows = (requests ?? []).map((request) => {
    const items = ((request.return_request_items ?? []) as Json[]).map((entry) => {
      const item = one(entry.order_items as Json | Json[] | null) as Json | undefined;
      return {
        quantity: Number(entry.quantity ?? 0),
        name: String(item?.product_name ?? item?.sku ?? "Item"),
        sku: String(item?.sku ?? ""),
      };
    });

    return {
      id: String(request.id),
      orderId: String(request.order_id),
      orderNumber: orderNumberById.get(String(request.order_id)) ?? "Order",
      type: String(request.request_type ?? "return"),
      status: String(request.status ?? "requested"),
      reason: String(request.reason_code ?? "").replaceAll("_", " "),
      reasonText: String(request.reason_text ?? ""),
      resolutionNotes: String(request.resolution_notes ?? ""),
      requestedOn: String(request.requested_on),
      updatedOn: String(request.updated_on ?? request.requested_on),
      items,
    };
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">My account</p>
            <h1 className="cm-section-title mt-3">Returns & exchanges</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review your return and exchange requests, see their latest status, and open the related order for full details.
            </p>
          </div>
          <Link href="/account/orders" className="text-sm font-bold text-brand hover:underline">
            View all orders
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {rows.length === 0 ? (
            <section className="rounded-[26px] border border-black/5 bg-white p-10 text-center shadow-[0_14px_40px_rgba(0,0,0,0.05)]">
              <h2 className="text-xl font-black text-ink">No return requests yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                To start a return or exchange, open an eligible delivered order from your order history.
              </p>
              <Link href="/account/orders" className="cm-button-primary mt-5">
                View my orders
              </Link>
            </section>
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                href={`/account/orders/${row.orderId}`}
                className="block rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)] md:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-ink">{row.orderNumber}</p>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold capitalize text-ink/70">
                        {label(row.type)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Requested {new Date(row.requestedOn).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>

                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ring-1 ${tone(row.status)}`}>
                    {label(row.status)}
                  </span>
                </div>

                {row.items.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {row.items.map((item, index) => (
                      <span
                        key={`${item.sku}-${index}`}
                        className="rounded-full border border-black/5 bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        {item.quantity > 1 ? `${item.quantity}× ` : ""}
                        {item.name}
                        {item.sku && !item.name.toLowerCase().includes(item.sku.toLowerCase()) ? ` · ${item.sku}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    {row.reason && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-ink">Reason:</span> {row.reason}
                      </p>
                    )}
                    {row.reasonText && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {row.reasonText}
                      </p>
                    )}
                    {row.resolutionNotes && ["rejected", "inspection_failed"].includes(row.status) && (
                      <p className="mt-2 text-sm font-semibold text-red-700">
                        {row.resolutionNotes}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-brand">View order & return history →</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
