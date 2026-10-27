import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/AdminNav";
import FulfillmentSettings from "@/components/admin/FulfillmentSettings";

export const instant = false;

export const metadata: Metadata = {
  title: "Fulfillment Admin",
  robots: { index: false, follow: false },
};

export default async function FulfillmentAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (role !== "admin") redirect("/admin");

  const admin = createAdminClient();

  const [settingsRes, jobsRes] = await Promise.all([
    admin.from("fulfillment_settings").select("*").eq("id", 1).single(),
    admin
      .from("fulfillment_jobs")
      .select("id, order_id, provider, status, attempts, last_error, updated_on, orders(order_number)")
      .order("updated_on", { ascending: false })
      .limit(50),
  ]);

  if (settingsRes.error) throw new Error("Unable to load fulfillment settings.");

  const jobs = (jobsRes.data ?? []).map((job) => {
    const order = Array.isArray(job.orders) ? job.orders[0] : job.orders;
    return {
      id: String(job.id),
      orderId: String(job.order_id),
      orderNumber: String(order?.order_number ?? ""),
      provider: String(job.provider),
      status: String(job.status),
      attempts: Number(job.attempts ?? 0),
      error: job.last_error ? String(job.last_error) : "",
      updatedOn: String(job.updated_on),
    };
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />
        <div className="mt-10">
          <p className="cm-eyebrow">Operations</p>
          <h1 className="cm-section-title mt-3">Fulfillment</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Choose how paid orders are fulfilled. Amazon MCF can be enabled independently
            from the existing Canuck Motors / delivery-partner workflow.
          </p>
        </div>

        <FulfillmentSettings
          initialSettings={{
            amazonRedirectEnabled: Boolean(settingsRes.data.amazon_redirect_enabled),
            uberEnabled: settingsRes.data.uber_enabled !== false,
            amazonMcfEnabled: Boolean(settingsRes.data.amazon_mcf_enabled),
            returnGoEnabled: Boolean(settingsRes.data.returngo_enabled),
            deliveryPartnerEnabled: Boolean(settingsRes.data.delivery_partner_enabled),
            preferredProvider:
              settingsRes.data.preferred_provider === "amazon_mcf"
                ? "amazon_mcf"
                : "delivery_partner",
            amazonShippingSpeed:
              settingsRes.data.amazon_shipping_speed === "Expedited" ||
              settingsRes.data.amazon_shipping_speed === "Priority"
                ? settingsRes.data.amazon_shipping_speed
                : "Standard",
          }}
          amazonConfigured={Boolean(
            process.env.AMAZON_SP_API_CLIENT_ID &&
              process.env.AMAZON_SP_API_CLIENT_SECRET &&
              process.env.AMAZON_SP_API_REFRESH_TOKEN
          )}
          returnGoConfigured={Boolean(
            process.env.RETURNGO_API_KEY &&
              process.env.RETURNGO_SHOP_NAME &&
              process.env.RETURNGO_API_BASE_URL
          )}
          jobs={jobs}
        />
      </div>
    </main>
  );
}
