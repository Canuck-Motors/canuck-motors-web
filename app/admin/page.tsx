import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes, ClipboardList, PackageCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const [
    { count: orderCount },
    { count: paidOrderCount },
    { count: inventoryCount },
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "paid"),
    supabase.from("inventory").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const cards = [
    {
      label: "Orders",
      value: orderCount ?? 0,
      href: "/admin/orders",
      icon: ClipboardList,
    },
    {
      label: "Paid orders",
      value: paidOrderCount ?? 0,
      href: "/admin/orders",
      icon: PackageCheck,
    },
    {
      label: "Inventory records",
      value: inventoryCount ?? 0,
      href: "/admin/inventory",
      icon: Boxes,
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10">
          <p className="cm-eyebrow">Canuck Motors Admin</p>
          <h1 className="cm-section-title mt-3">Operations dashboard</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as {role}. Manage orders and inventory from one place.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {cards.map(({ label, value, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_14px_38px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-tint text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-brand">Open</span>
              </div>
              <p className="mt-7 text-sm font-semibold text-muted-foreground">{label}</p>
              <p className="mt-1 text-4xl font-black tracking-[-0.04em] text-ink">{value}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
