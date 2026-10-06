import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { createPublicClient } from "@/lib/supabase/public";
import { BrandSearchGrid } from "@/components/BrandSearchGrid";

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
          <div className="mb-8 text-center">
            <p className="cm-eyebrow">Find your brand</p>
            <h2 className="cm-section-title mt-3">Search vehicle manufacturers</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Start typing a brand name to instantly narrow the list.
            </p>
          </div>

          <BrandSearchGrid brands={brands} />
        </section>
      </main>
    </>
  );
}
