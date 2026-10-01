import Link from "next/link";

const links = [
  { label: "Auto Parts", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Brands", href: "/brands" },
  { label: "Deals", href: "/deals" },
  { label: "About Us", href: "/about" },
];

export default function Navbar() {
  return (
    <nav className="w-full bg-ink text-white">
      <div className="mx-auto flex max-w-7xl gap-8 overflow-x-auto px-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group relative whitespace-nowrap py-3 text-sm font-medium text-white/80 transition hover:text-white"
          >
            {l.label}
            <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100" />
          </Link>
        ))}
      </div>
    </nav>
  );
}