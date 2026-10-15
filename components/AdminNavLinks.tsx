"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  CreditCard,
  Gauge,
  Route,
  Home,
  ImageIcon,
  RotateCcw,
  Tags,
  UploadCloud,
  Users,
} from "lucide-react";

const baseLinks = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/inventory/import", label: "Import Stock", icon: UploadCloud },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/images", label: "Images", icon: ImageIcon },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
];

export function AdminNavLinks({ showStripe }: { showStripe: boolean }) {
  const pathname = usePathname() ?? "";
  const links = showStripe
    ? [
        ...baseLinks,
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/fulfillment", label: "Fulfillment", icon: Route },
        { href: "/admin/stripe", label: "Stripe", icon: CreditCard },
      ]
    : baseLinks;

  // The most specific link wins (Import Stock beats Inventory)
  const current =
    links
      .filter((l) => (l.href === "/admin" ? pathname === "/admin" : pathname === l.href || pathname.startsWith(l.href + "/")))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === current;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition duration-200 ${
              active
                ? "cm-nav-active bg-brand text-white shadow-[0_6px_20px_rgba(214,40,40,0.45)]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-white" : "text-brand"}`} aria-hidden="true" />
            {label}
          </Link>
        );
      })}

      <Link
        href="/"
        className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Home className="h-4 w-4 text-brand" aria-hidden="true" />
        Storefront
      </Link>
    </div>
  );
}
