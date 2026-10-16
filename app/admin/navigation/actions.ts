"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NAV_LINKS } from "@/lib/site-nav";

export async function setNavLinkVisible(key: string, visible: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role } = await supabase.rpc("current_user_staff_role");
    if (role !== "admin") throw new Error("Only admins can change the menu.");

    const link = NAV_LINKS.find((l) => l.key === key);
    if (!link || link.locked) throw new Error("That link can't be changed.");

    const { error } = await createAdminClient()
      .from("site_nav_links")
      .upsert({ key, visible, updated_at: new Date().toISOString() });
    if (error) {
      throw new Error(
        /site_nav_links|schema cache/.test(error.message)
          ? "Run database/site_nav_links.sql in the Supabase SQL editor first."
          : error.message,
      );
    }

    updateTag("nav-links");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
}
