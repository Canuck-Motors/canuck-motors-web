import Link from "next/link";
import {
  Boxes,
  ClipboardList,
  CreditCard,
  Gauge,
  Home,
  ImageIcon,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const baseLinks = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/inventory/import", label: "Import Stock", icon: UploadCloud },
  { href: "/admin/images", label: "Images", icon: ImageIcon },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
];

export async function AdminNav() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  const links =
    role === "admin"
      ? [
          ...baseLinks,
          { href: "/admin/stripe", label: "Stripe", icon: CreditCard },
        ]
      : baseLinks;

  return (
    <div className="rounded-[24px] border border-black/5 bg-ink p-2 shadow-[0_16px_44px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-center gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
            {label}
          </Link>
        ))}

        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Home className="h-4 w-4 text-brand" aria-hidden="true" />
          Storefront
        </Link>
      </div>
    </div>
  );
}
