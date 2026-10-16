import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AboutTabs from "@/components/about/AboutTabs";
import AboutHero from "@/components/about/AboutHero";
import ProductShowcase from "@/components/about/showcase/ProductShowcase";

export const metadata: Metadata = {
  title: "Our Products | Canuck Motors Water Pumps, Brake Pads & Timing Kits",
  description:
    "See what goes into Canuck Motors parts: high-performance impellers, robust housings, enhanced bearings, seal integrity and OEM-fit compatibility.",
  alternates: { canonical: "/about/product" },
};

const features = [
  {
    title: "High-Performance Impeller",
    img: "/about/impeller.png",
    points: [
      ["Efficient coolant circulation", "Designed for optimal coolant flow, so your engine runs at the ideal temperature."],
      ["Durable material", "High-quality, corrosion-resistant materials for long-lasting performance."],
      ["Precision engineering", "Tight tolerances for smooth operation and less wear and tear."],
      ["Enhanced reliability", "Built to stay dependable in harsh conditions and extreme environments."],
      ["Energy efficient", "Minimizes energy consumption while maximizing output."],
    ],
  },
  {
    title: "Robust Housing",
    img: "/about/housing.png",
    points: [
      ["Durability", "High-strength materials such as aluminum or cast iron resist wear and tear."],
      ["Leak-proof design", "Precision-engineered to prevent coolant leaks."],
      ["Corrosion resistance", "Advanced coatings protect against rust and extend housing life."],
      ["Heat dissipation", "Designed to shed heat and keep operation reliable."],
      ["Easy installation", "Engineered for a precise fit, so installation is straightforward."],
    ],
  },
  {
    title: "Enhanced Bearings",
    img: "/about/bearing.png",
    points: [
      ["Smooth operation", "High-quality bearings reduce friction for quiet, smooth running."],
      ["Extended lifespan", "Built for high engine speeds and temperatures."],
      ["Low vibration", "Engineered to keep vibration low, with detection under 48 dB."],
      ["Heat treatment", "Precise heat treatment (HRC 62-66 steel ball, 60-64 outside loop, 58-62 mandrel) for durability."],
      ["Corrosion resistance", "Materials that resist rust in harsh conditions."],
    ],
  },
  {
    title: "Seal Integrity",
    img: "/about/waterseal.png",
    points: [
      ["Prevent leaks", "Advanced sealing technology keeps coolant in and contamination out."],
      ["High-temperature resistance", "Seals handle extreme temperatures in all driving conditions."],
      ["Durable materials", "Wear-resistant materials for long-lasting sealing."],
      ["Precision fit", "Engineered to prevent gaps and maximize sealing efficiency."],
      ["Chemical resistance", "Resistant to coolant and other chemicals over time."],
    ],
  },
  {
    title: "Efficient Heat Dissipation",
    img: "/about/hx.png",
    points: [
      ["Thermal management", "Efficiently dissipates heat to protect the engine from overheating."],
      ["Consistent performance", "Keeps engine temperature steady for better performance and fuel efficiency."],
      ["Advanced materials", "High-conductivity materials for rapid cooling."],
      ["Optimized design", "Maximizes surface area for better heat dissipation."],
      ["Enhanced efficiency", "Helps reduce fuel consumption and emissions by maintaining the right temperature."],
    ],
  },
  {
    title: "Compatibility",
    img: "/about/fitting.png",
    points: [
      ["OEM fit", "Designed to meet or exceed original equipment manufacturer specifications."],
      ["Wide range", "Available for various makes and models."],
      ["Easy installation", "Fits seamlessly into the existing system."],
      ["Versatile applications", "From compact cars to heavy-duty trucks."],
      ["High interchangeability", "Compatible with numerous aftermarket parts."],
    ],
  },
];

export default function AboutProductPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
      <AboutHero eyebrow="About · Product" title="Built to meet and exceed OE specifications.">
        <p>
          Each product you see is a testament to our commitment to quality, performance, and sustainability. We have put
          our expertise into every part, so it not only meets but exceeds your expectations.
        </p>
      </AboutHero>

      <AboutTabs />

      <ProductShowcase />

      <div className="cm-container space-y-16 py-14 md:space-y-20 md:py-20">
        <section aria-labelledby="why" className="grid gap-8 md:grid-cols-[1fr_1fr] md:gap-12">
          <div className="cm-reveal-l">
            <p className="cm-eyebrow">Why our products?</p>
            <h2 id="why" className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink md:text-4xl">
              Quality you can install with confidence.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              We understand the critical role a water pump plays in your vehicle&apos;s cooling system. That&apos;s why we
              offer a comprehensive range of top-quality car water pumps designed to keep your engine running smoothly and
              efficiently. Our products are designed, constructed and formulated to meet, and often surpass, the original
              equipment (OE) specifications required for a wide range of vehicles.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="cm-button-primary">
                Browse products
              </Link>
              <Link href="/#vehicle-finder" className="cm-button-dark">
                Vehicle finder
              </Link>
            </div>
          </div>
          <div className="cm-reveal-r cm-card p-6 md:p-8">
            <p className="leading-7 text-muted-foreground">
              We stand behind our products with comprehensive quality assurance testing and certification processes. Our
              mission goes beyond selling parts: it is delivering quality products and services with care and efficiency,
              with a distribution network that spans coast to coast so we can deliver the right part at the right time.
            </p>
          </div>
        </section>

        <section aria-labelledby="features" className="cm-reveal">
          <p className="cm-eyebrow">What goes into every part</p>
          <h2 id="features" className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink md:text-4xl">
            Engineered in every detail.
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {features.map((f) => (
              <article
                key={f.title}
                className="cm-reveal group overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/25"
              >
                <div className="relative aspect-[16/9] bg-ink">
                  <Image src={f.img} alt={f.title} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover opacity-90 transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black text-ink">{f.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {f.points.map(([k, v]) => (
                      <li key={k} className="flex gap-3 text-sm leading-6">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                        <span>
                          <strong className="text-ink">{k}:</strong>{" "}
                          <span className="text-muted-foreground">{v}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
