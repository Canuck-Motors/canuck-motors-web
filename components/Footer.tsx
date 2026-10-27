"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Clock, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";

// Edit these to change the footer. Anything left empty ("") is hidden.
const SITE = {
  phone: "604-445-0147",
  phoneHref: "tel:+16044450147",
  email: "contactus@canuckmotors.ca",
  address: "", // e.g. "123 Example St, Surrey, BC V3T 0A1"
  hours: "", // e.g. "Monday–Friday: 9 a.m. – 5 p.m. PT"
  instagram: "https://www.instagram.com/canuckmotors",
  linkedin: "https://www.linkedin.com/company/canuck-motors/",
};

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Auto Parts", href: "/products" },
      { label: "Categories", href: "/categories" },
      { label: "Brands", href: "/brands" },
      { label: "Deals", href: "/deals" },
    ],
  },
  {
    title: "About Canuck Motors",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Contact Us", href: `mailto:${SITE.email}` },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "My Orders", href: "/account/orders" },
      { label: "Return & Exchange", href: "/account/returns" },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname() ?? "";
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (pathname.startsWith("/admin")) return null;

  const socials = [
    { label: "Instagram", href: SITE.instagram, Icon: Instagram },
    { label: "LinkedIn", href: SITE.linkedin, Icon: Linkedin },
  ].filter((s) => s.href);

  return (
    <footer className="bg-ink text-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="h-1 bg-brand" />
      <div className="cm-container grid gap-12 py-14 md:py-16 lg:grid-cols-[1.4fr_2fr]">
        <div>
          <Link href="/" className="text-2xl font-black uppercase tracking-[0.14em]">
            Canuck <span className="text-brand">Motors</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">
            Direct-fit brake and engine parts, shipped across Canada.
          </p>

          <dl className="mt-7 space-y-4 text-sm">
            {SITE.address && (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <dt className="font-bold">Address</dt>
                  <dd className="mt-0.5 text-white/65">{SITE.address}</dd>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <dt className="font-bold">Phone</dt>
                <dd className="mt-0.5">
                  <a href={SITE.phoneHref} className="text-white/65 transition hover:text-white">
                    {SITE.phone}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <dt className="font-bold">Email</dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${SITE.email}`} className="text-white/65 transition hover:text-white">
                    {SITE.email}
                  </a>
                </dd>
              </div>
            </div>
            {SITE.hours && (
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <dt className="font-bold">Hours</dt>
                  <dd className="mt-0.5 text-white/65">{SITE.hours}</dd>
                </div>
              </div>
            )}
          </dl>

          {socials.length > 0 && (
            <div className="mt-7 flex gap-3">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/80 transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:bg-brand hover:text-white"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>

        <nav aria-label="Footer" className="grid gap-10 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white">{col.title}</h3>
              <ul className="mt-5 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-white/65 transition hover:text-white hover:underline hover:decoration-brand hover:underline-offset-4">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="cm-container flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Canuck Motors. All rights reserved.</p>
          <p>Proudly Canadian · Shipping across Canada</p>
        </div>
      </div>
    </footer>
  );
}
