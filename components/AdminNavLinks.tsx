"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Newspaper,
  ClipboardList,
  CreditCard,
  Gauge,
  PanelTop,
  Route,
  ImageIcon,
  RotateCcw,
  Tags,
  UploadCloud,
  Users,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof Gauge; child?: boolean };

const categoriesLink: NavItem = { href: "/admin/categories", label: "Categories", icon: Tags };

const baseLinks: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/inventory/import", label: "Import Stock", icon: UploadCloud },
  { href: "/admin/images", label: "Images", icon: ImageIcon },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
];

export function AdminNavLinks({
  showStripe,
  returnAttentionCount = 0,
}: {
  showStripe: boolean;
  returnAttentionCount?: number;
}) {
  const pathname = usePathname() ?? "";
  // Admins manage Categories inside the Top menu page; staff (no Top menu) keep it as a normal item.
  const links: NavItem[] = showStripe
    ? [
        ...baseLinks,
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/blog", label: "Blog", icon: Newspaper },
        { href: "/admin/navigation", label: "Top menu", icon: PanelTop },
        { href: "/admin/fulfillment", label: "Fulfillment", icon: Route },
        { href: "/admin/stripe", label: "Stripe", icon: CreditCard },
      ]
    : [...baseLinks.slice(0, 4), categoriesLink, ...baseLinks.slice(4)];

  // The most specific link wins (Import Stock beats Inventory)
  const current =
    links
      .filter((l) => (l.href === "/admin" ? pathname === "/admin" : pathname === l.href || pathname.startsWith(l.href + "/")))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <nav aria-label="Admin" className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
      <p className="cm-side-item hidden items-center gap-2 px-3 pb-3 pt-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/45 lg:flex" style={{ "--i": 0 } as React.CSSProperties}>
        <span className="cm-side-dot h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
        Admin panel
      </p>
      {links.map(({ href, label, icon: Icon, child }, idx) => {
        const active = href === current;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{ "--i": idx + 1 } as React.CSSProperties}
            className={`cm-side-item group relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold transition-all duration-300 lg:py-2.5 ${
              child ? "lg:ml-5 lg:border-l lg:border-white/10 lg:pl-3" : ""
            } ${
              active
                ? "cm-nav-active bg-gradient-to-r from-brand to-[#a81c1c] text-white shadow-[0_10px_28px_rgba(214,40,40,0.45)]"
                : "text-white/70 hover:translate-x-1 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${
                active ? "bg-white/20" : "bg-white/5 group-hover:bg-brand/25"
              }`}
            >
              <Icon className={`h-[17px] w-[17px] ${active ? "text-white" : "text-brand"}`} aria-hidden="true" />
            </span>
            <span className="flex-1">{label}</span>
            {href === "/admin/returns" && returnAttentionCount > 0 && (
              <span
                aria-label={`${returnAttentionCount} returns need attention`}
                className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-black ${
                  active ? "bg-white text-brand" : "bg-brand text-white"
                }`}
              >
                {returnAttentionCount > 99 ? "99+" : returnAttentionCount}
              </span>
            )}
            {active && <span className="cm-side-dot hidden h-1.5 w-1.5 rounded-full bg-white lg:block" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
