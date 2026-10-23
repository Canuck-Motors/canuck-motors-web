import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { loadAdminCategories } from "@/lib/admin-categories";
import CategoriesManager from "@/components/admin/CategoriesManager";

export const instant = false;

export const metadata: Metadata = {
  title: "Categories Admin",
  robots: { index: false, follow: false },
};

export default async function CategoriesAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) redirect("/");

  const { rows, needsSql } = await loadAdminCategories(supabase);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10">
          <p className="cm-eyebrow">Catalog</p>
          <h1 className="cm-section-title mt-3">Categories</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Add categories, rename them, change the order and turn them on or off. A category shows on the
            website only when it is on and has at least one visible product.
          </p>
        </div>

        <CategoriesManager initial={rows} needsSql={needsSql} />
      </div>
    </main>
  );
}
