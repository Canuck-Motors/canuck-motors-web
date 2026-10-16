import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { getCoverage } from "@/lib/brand-coverage";
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
  const coverage = await getCoverage();
  const all = data ?? [];
  return coverage ? all.filter((b) => coverage.brands.has(Number(b.id))) : all;
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <>
      <main className="min-h-screen bg-white">
        <section className="relative isolate overflow-hidden bg-ink text-white">
          {/* Animated background (decoration only) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="cm-grid-drift absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_75%_40%,#000_15%,transparent_70%)]" />
            <div className="cm-glow absolute -right-16 -top-20 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
            <div className="cm-glow absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-brand/15 blur-3xl [animation-delay:-3s]" />
            <svg viewBox="0 0 400 400" className="absolute -right-28 top-1/2 h-[500px] w-[500px] -translate-y-[58%] opacity-70 md:-right-10 lg:right-12">
              <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
              <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <line x1="93.9" y1="306.1" x2="75.5" y2="324.5" stroke="rgba(255,255,255,0.28)" strokeWidth="4" /><line x1="61.4" y1="280.0" x2="47.6" y2="288.0" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="45.5" y1="241.4" x2="30.0" y2="245.6" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="50.0" y1="200.0" x2="24.0" y2="200.0" stroke="rgba(255,255,255,0.28)" strokeWidth="4" /><line x1="45.5" y1="158.6" x2="30.0" y2="154.4" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="61.4" y1="120.0" x2="47.6" y2="112.0" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="93.9" y1="93.9" x2="75.5" y2="75.5" stroke="rgba(255,255,255,0.28)" strokeWidth="4" /><line x1="120.0" y1="61.4" x2="112.0" y2="47.6" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="158.6" y1="45.5" x2="154.4" y2="30.0" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="200.0" y1="50.0" x2="200.0" y2="24.0" stroke="rgba(255,255,255,0.28)" strokeWidth="4" /><line x1="241.4" y1="45.5" x2="245.6" y2="30.0" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="280.0" y1="61.4" x2="288.0" y2="47.6" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="306.1" y1="93.9" x2="324.5" y2="75.5" stroke="rgba(255,255,255,0.28)" strokeWidth="4" /><line x1="338.6" y1="120.0" x2="352.4" y2="112.0" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="354.5" y1="158.6" x2="370.0" y2="154.4" stroke="rgba(255,255,255,0.28)" strokeWidth="2" /><line x1="350.0" y1="200.0" x2="376.0" y2="200.0" stroke="rgba(214,40,40,0.8)" strokeWidth="4" /><line x1="354.5" y1="241.4" x2="370.0" y2="245.6" stroke="rgba(214,40,40,0.8)" strokeWidth="2" /><line x1="338.6" y1="280.0" x2="352.4" y2="288.0" stroke="rgba(214,40,40,0.8)" strokeWidth="2" /><line x1="306.1" y1="306.1" x2="324.5" y2="324.5" stroke="rgba(214,40,40,0.8)" strokeWidth="4" />
              <g className="cm-needle">
                <line x1="200" y1="200" x2="200" y2="48" stroke="#d62828" strokeWidth="5" strokeLinecap="round" />
                <line x1="200" y1="200" x2="200" y2="236" stroke="#d62828" strokeWidth="5" strokeLinecap="round" />
              </g>
              <circle cx="200" cy="200" r="16" fill="#111" stroke="rgba(214,40,40,0.9)" strokeWidth="4" />
            </svg>
            {/* Brand names scrolling past; the clickable list is below */}
            <div className="cm-marquee absolute inset-x-0 bottom-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
              <div className="cm-marquee-track cm-marquee-rev whitespace-nowrap">
                {[0, 1].map((rep) => (
                  <div key={rep} className="flex shrink-0 items-center gap-10 pr-10">
                    {brands.slice(0, 24).map((b) => (
                      <span key={`${rep}-${b.id}`} className="text-xl font-black uppercase tracking-[0.14em] text-white/[0.07] md:text-3xl">
                        {b.manufacturer_name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="cm-container relative pb-20 pt-14 md:pb-28 md:pt-20">
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
