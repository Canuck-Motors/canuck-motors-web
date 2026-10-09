import Link from "next/link";

const links = [
  { label: "Home", href: "/" },
  { label: "Auto Parts", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Brands", href: "/brands" },
  { label: "Deals", href: "/deals" },
  { label: "About Us", href: "/about" },
];

export default function Navbar() {
  return (
    <nav className="w-full border-b border-white/5 bg-ink text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
      <div className="cm-container flex items-center gap-8 overflow-x-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group relative whitespace-nowrap py-3.5 text-sm font-semibold text-white/72 transition duration-200 hover:text-white"
          >
            {l.label}
            <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 rounded-full bg-brand transition-transform duration-300 group-hover:scale-x-100" />
          </Link>
        ))}

        <span className="ml-auto hidden rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand lg:inline-flex">
          Built for fitment
        </span>
      </div>
    </nav>
  );
}
