import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export const NAV_LINKS = [
  { key: "home", label: "Home", href: "/", locked: true },
  { key: "products", label: "Auto Parts", href: "/products", locked: false },
  { key: "categories", label: "Categories", href: "/categories", locked: false },
  { key: "brands", label: "Brands", href: "/brands", locked: false },
  { key: "deals", label: "Deals", href: "/deals", locked: false },
  { key: "about", label: "About Us", href: "/about", locked: false },
] as const;

/** Keys of menu links the admin switched off. If the table is missing, nothing is hidden. */
export async function getHiddenNavKeys(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("nav-links");
  const { data, error } = await createPublicClient().from("site_nav_links").select("key, visible");
  if (error) return [];
  return (data ?? []).filter((r) => r.visible === false).map((r) => String(r.key));
}
