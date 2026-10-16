import { safeJsonLd } from "@/lib/json-ld";
import { getVisibleCategories } from "@/lib/categories";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Auto Part Categories",
  description:
    "Browse Canuck Motors automotive parts by category and find the right replacement part for your vehicle.",
  alternates: { canonical: "/categories" },
};

async function getCategories() {
  "use cache";
  cacheLife({ stale: 7200, revalidate: 3600, expire: 86400 });
  cacheTag("product-categories");

  return getVisibleCategories(createPublicClient());
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function CategoriesPage() {
  const categories = await getCategories();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Auto Part Categories",
    url: `${SITE_URL}/categories`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: categories.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.category_name,
        url: `${SITE_URL}/categories/${c.slug}`,
      })),
    },
  };

  return (
    <>
      <main className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-ink text-white">
          <span className="cm-smoke pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
          <span className="cm-smoke pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-orange-900/40 blur-3xl" style={{ animationDelay: "-3s" }} />
          <span className="cm-speed pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="cm-container relative py-14 md:py-24">
            <span className="cm-mask"><span className="cm-up cm-eyebrow" style={{ "--d": "0s" } as React.CSSProperties}>Browse smarter</span></span>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">
              <span className="cm-mask"><span className="cm-up" style={{ "--d": "0.1s" } as React.CSSProperties}>Shop by</span></span>
              <span className="cm-mask"><span className="cm-up text-brand" style={{ "--d": "0.22s" } as React.CSSProperties}>category.</span></span>
            </h1>
            <span className="cm-mask mt-5 max-w-2xl">
              <p className="cm-up text-white/65" style={{ "--d": "0.4s" } as React.CSSProperties}>
                Start with the system or component you need, then use vehicle fitment to
                confirm compatibility.
              </p>
            </span>
            <span className="cm-mask mt-6">
              <p className="cm-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/70" style={{ "--d": "0.55s" } as React.CSSProperties}>
                <span className="h-2 w-2 rounded-full bg-brand" />
                {categories.length} categories · fitment verified
              </p>
            </span>
          </div>
          <div className="cm-stripe h-1 w-full" />
        </section>

        <section className="cm-container py-12 md:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="cm-cat-card group relative flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[28px] border border-black/5 bg-ink p-7 shadow-[0_14px_36px_rgba(0,0,0,0.10)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-2 hover:border-brand/40 hover:shadow-[0_28px_60px_rgba(0,0,0,0.32)]"
                style={{ animationDelay: `${Math.min(index, 12) * 90}ms` }}
              >
                <span className="cm-smoke pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-brand/25 blur-3xl transition duration-500 group-hover:bg-brand/40" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-2 select-none text-[9rem] font-black leading-none tracking-[-0.06em] text-white/[0.04] transition duration-500 group-hover:-translate-y-2 group-hover:text-brand/15">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="cm-cat-shine" aria-hidden="true" />

                <span className="cm-mask relative">
                  <span className="cm-up text-xs font-black tracking-[0.2em] text-brand" style={{ "--d": `${Math.min(index, 8) * 0.08}s` } as React.CSSProperties}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>

                <div className="relative">
                  <span className="cm-mask">
                    <h2 className="cm-up text-3xl font-black leading-tight tracking-[-0.035em] text-white md:text-[2rem]" style={{ "--d": `${0.1 + Math.min(index, 8) * 0.08}s` } as React.CSSProperties}>
                      {category.category_name}
                    </h2>
                  </span>
                  <span className="cm-line mt-3 block h-[3px] w-14 origin-left rounded-full bg-brand transition-all duration-300 group-hover:w-28" />
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="cm-mask">
                      <p className="cm-up text-sm text-white/55" style={{ "--d": `${0.25 + Math.min(index, 8) * 0.08}s` } as React.CSSProperties}>
                        Browse compatible parts
                      </p>
                    </span>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-white transition duration-300 group-hover:rotate-12 group-hover:border-brand/30 group-hover:bg-brand">
                      <ArrowUpRight className="h-4 w-4 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-125" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
    </>
  );
}
