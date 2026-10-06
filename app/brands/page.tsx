import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Vehicle Brands",
  description:
    "Browse vehicle brands supported by the Canuck Motors fitment catalog and start finding compatible automotive parts.",
  alternates: { canonical: "/brands" },
};

async function getBrands() {
  "use cache";
  cacheLife({ stale: 7200, revalidate: 3600, expire: 86400 });
  cacheTag("vehicle-brands");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("manufacturer")
    .select("id, manufacturer_name, slug")
    .order("manufacturer_name");

  if (error) throw new Error("Unable to load vehicle brands.");
  return data ?? [];
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <>
      <Header />
      <Navbar />
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
        <section className="bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <p className="cm-eyebrow">Fitment catalog</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">
              Browse by vehicle brand.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
              Choose a vehicle brand to explore supported models and then confirm
              fitment before ordering.
            </p>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="group flex min-h-[140px] items-end justify-between rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]"
              >
                <h2 className="text-xl font-black tracking-[-0.025em] text-ink">
                  {brand.manufacturer_name}
                </h2>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white transition group-hover:bg-brand">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
