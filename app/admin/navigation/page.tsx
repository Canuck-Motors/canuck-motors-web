import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NAV_LINKS } from "@/lib/site-nav";
import NavToggles from "@/components/admin/NavToggles";
import CategoriesManager from "@/components/admin/CategoriesManager";
import { loadAdminCategories } from "@/lib/admin-categories";

export const instant = false;

export const metadata: Metadata = {
  title: "Menu settings",
  robots: { index: false, follow: false },
};

export default async function NavigationAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (role !== "admin") redirect("/admin");

  const { data, error } = await createAdminClient().from("site_nav_links").select("key, visible");
  const hidden = new Set((data ?? []).filter((r) => r.visible === false).map((r) => String(r.key)));

  const { rows, needsSql } = await loadAdminCategories(supabase);

  const items = NAV_LINKS.map((l) => ({ ...l, visible: l.locked || !hidden.has(l.key) }));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <p className="cm-eyebrow">Website</p>
        <h1 className="cm-section-title mt-3">Top menu</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Switch a link off to hide it from the menu at the top of the website. Changes show within a few seconds.
        </p>
        {error && (
          <p className="mt-8 max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            The menu settings table doesn&apos;t exist yet. Run <code>database/site_nav_links.sql</code> in the Supabase SQL editor, then reload.
          </p>
        )}
        <NavToggles items={items} extras={{ categories: <CategoriesManager initial={rows} needsSql={needsSql} /> }} />
      </div>
    </main>
  );
}
