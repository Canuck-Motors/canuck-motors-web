"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ABOUT_LINKS = [
  { href: "/about", label: "Company" },
  { href: "/about/product", label: "Product" },
  { href: "/blog", label: "Blog" },
  { href: "/about/manufacturer", label: "Manufacturer" },
];

// Sub-menu shown at the top of every About page
export default function AboutTabs({ dark = false }: { dark?: boolean }) {
  const path = usePathname() ?? "";
  const current =
    ABOUT_LINKS.filter((l) => (l.href === "/about" ? path === "/about" : path === l.href || path.startsWith(l.href + "/")))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <nav aria-label="About Canuck Motors" className="cm-container -mt-6 relative z-10">
      <div
        className={`flex flex-wrap gap-2 rounded-[24px] border p-2 ${
          dark
            ? "border-white/10 bg-[#141416] shadow-[0_16px_44px_rgba(0,0,0,0.5)]"
            : "border-black/5 bg-white shadow-[0_16px_44px_rgba(0,0,0,0.10)]"
        }`}
      >
        {ABOUT_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={current === l.href ? "page" : undefined}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
              current === l.href
                ? "bg-brand text-white shadow-sm"
                : dark
                  ? "text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-ink/70 hover:bg-brand-tint hover:text-brand"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
