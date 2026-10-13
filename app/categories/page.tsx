import Image from "next/image";
import { getVisibleCategories } from "@/lib/categories";
import { imageUrl } from "@/lib/product-images";
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

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <main className="min-h-screen bg-white">
        <section className="bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <p className="cm-eyebrow">Browse smarter</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">
              Shop by category.
            </h1>
            <p className="mt-5 max-w-2xl text-white/65">
              Start with the system or component you need, then use vehicle fitment to
              confirm compatibility.
            </p>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="cm-cat-card group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[28px] border border-black/5 bg-ink p-6 shadow-[0_14px_36px_rgba(0,0,0,0.10)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-[0_24px_56px_rgba(0,0,0,0.28)]"
                style={{ animationDelay: `${Math.min(index, 12) * 90}ms` }}
              >
                <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl transition duration-500 group-hover:bg-brand/30" />
                <span className="relative text-sm font-black tracking-[0.16em] text-brand transition duration-300 group-hover:translate-x-1">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {category.image_path && (
                  <Image
                    src={imageUrl(category.image_path)}
                    alt=""
                    width={120}
                    height={120}
                    className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-xl object-contain"
                  />
                )}
                <span className="cm-cat-shine" aria-hidden="true" />
                <div className="relative flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
                      {category.category_name}
                    </h2>
                    <p className="mt-2 text-sm text-white/55">
                      Browse compatible parts
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-white transition duration-300 group-hover:rotate-12 group-hover:border-brand/30 group-hover:bg-brand">
                    <ArrowUpRight className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-125" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
