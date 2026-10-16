import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AboutTabs from "@/components/about/AboutTabs";
import AboutHero from "@/components/about/AboutHero";
import { Boxes, ShieldCheck, Truck, Wrench } from "lucide-react";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Automotive Parts Manufacturer & Supplier in Canada | Canuck Motors",
  description:
    "Canuck Motors supplies high-quality, OEM-standard automotive parts for the most popular car brands in Canada, with retail and bulk options and fast shipping across Canada.",
  alternates: { canonical: "/about/manufacturer" },
};

const usps = [
  {
    title: "Trusted Global Brands",
    img: "/about/usp-1.jpg",
    body: [
      "Canuck Motors works with respected car parts manufacturers. Each brand is carefully chosen so our customers receive only the finest, renowned for innovation, precision and proven performance. Whether you need OEM-grade replacements or performance improvements, our lineup gives you direct access to trusted names.",
      "From brake systems to timing components, every manufacturer on our platform adheres to strict industry norms and compatibility standards, so all vehicle types perform optimally while staying safe and efficient.",
    ],
  },
  {
    title: "Performance Meets Value",
    img: "/about/usp-2.jpg",
    body: [
      "We believe premium performance does not have to come at a premium price. Our manufacturer offerings include affordable options that do not sacrifice quality, whether you are a DIY enthusiast or a repair shop.",
      "With Canuck Motors, you are not just purchasing a part, you are making a wise investment: near-OEM quality at a fraction of the dealership price.",
    ],
  },
  {
    title: "Exact Fit. More Options. Zero Guesswork.",
    img: "/about/usp-3.jpg",
    body: [
      "Skip the hassle of part mismatches. Every item is engineered for an exact fit, tailored to your vehicle's specifications, from brake pads to timing belts and more.",
      "Each brand is backed by detailed specifications and vehicle compatibility guides. Simply select your car, explore trusted brands, and confidently choose the correct part.",
    ],
  },
];

const highlights = [
  { icon: ShieldCheck, title: "OEM-standard quality", text: "Engineered to meet or exceed original equipment fit, performance and durability." },
  { icon: Boxes, title: "Retail and bulk", text: "Single parts for car owners, wholesale pricing for shops and fleets." },
  { icon: Truck, title: "Shipping across Canada", text: "Fast delivery to every province, from compact cars to heavy-duty trucks." },
  { icon: Wrench, title: "Custom applications", text: "Need something less common? We support rare and custom requests." },
];

const brands = [
  ["Ford", "ford"],
  ["Chevrolet", "chevrolet"],
  ["Honda", "honda"],
  ["Nissan", "nissan"],
  ["Hyundai", "hyundai"],
  ["Volkswagen", "volkswagen"],
  ["Toyota", "toyota"],
  ["Mazda", "mazda"],
];

const faqs = [
  [
    "What car brands do you supply parts for?",
    "We manufacture and supply automotive parts for the most popular car brands in Canada, including Toyota, Honda, Ford, Chevrolet, Nissan, Hyundai, Mazda, Volkswagen, and more. Contact us for other makes or custom requirements.",
  ],
  [
    "Are your parts OEM quality?",
    "Yes, all our auto parts are engineered to meet or exceed OEM standards for fit, performance, and durability.",
  ],
  [
    "Can I buy your products on Amazon?",
    "Yes, many of our products are available for purchase on Amazon Canada. Check our Amazon store or contact us for direct orders and bulk pricing.",
  ],
  [
    "Do you offer bulk or wholesale pricing?",
    "Absolutely. We offer competitive bulk and wholesale pricing for retailers, mechanics, and fleet operators. Please contact us for a custom quote.",
  ],
  [
    "How do I know which part fits my car?",
    "Use our vehicle finder or ask Axel, our parts assistant, or contact our support team with your vehicle details. We will help you find the perfect fit.",
  ],
  [
    "Can I request a custom or less common part?",
    "Yes, we can help with custom or rare applications. Contact us with your requirements.",
  ],
];

export default function AboutManufacturerPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
      <div aria-hidden="true" className="cm-glow pointer-events-none absolute -left-40 top-[1100px] -z-10 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div aria-hidden="true" className="cm-glow pointer-events-none absolute -right-40 top-[2300px] -z-10 h-96 w-96 rounded-full bg-brand/10 blur-3xl [animation-delay:-3s]" />

      <AboutHero eyebrow="About · Manufacturer" title="Automotive parts manufacturer & supplier in Canada.">
        <p>
          Supplying high-quality, OEM-standard automotive parts for the most popular car brands in Canada. Trusted by
          mechanics, retailers, and car owners nationwide.
        </p>
      </AboutHero>

      <AboutTabs />

      {/* Brand marquee (the first set is real links; the repeat only fills the loop) */}
      <div className="cm-marquee relative mt-10 overflow-hidden border-y border-black/5 bg-white py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="cm-marquee-track gap-10 whitespace-nowrap">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={rep === 1 ? true : undefined}>
              {brands.map(([name, slug]) =>
                rep === 0 ? (
                  <Link key={slug} href={`/brands/${slug}`} className="text-2xl font-black uppercase tracking-[0.12em] text-ink/20 transition hover:text-brand md:text-3xl">
                    {name}
                  </Link>
                ) : (
                  <span key={slug} className="text-2xl font-black uppercase tracking-[0.12em] text-ink/20 md:text-3xl">
                    {name}
                  </span>
                ),
              )}
              <span className="text-brand" aria-hidden="true">✦</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cm-container space-y-20 py-16 md:space-y-28 md:py-24">
        {/* Intro with hero image */}
        <section aria-labelledby="premium" className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <div className="cm-reveal-l">
            <p className="cm-eyebrow">Premium auto parts for every need</p>
            <h2 id="premium" className="mt-3 text-3xl font-black tracking-[-0.035em] text-ink md:text-5xl">
              Made to meet and exceed <span className="text-brand">OEM standards.</span>
            </h2>
            <span className="mt-6 block h-1 w-24 rounded-full bg-gradient-to-r from-brand to-transparent" />
            <div className="mt-6 space-y-4 leading-7 text-muted-foreground">
              <p>
                We specialize in manufacturing and supplying top-quality automotive parts for a wide range of vehicles. As
                a Canadian company, we are committed to products that meet and exceed OEM standards for performance,
                durability, and fit. Whether you are a car owner, mechanic, or parts retailer, our components, including
                brake pads and timing belt kits, are engineered for reliability and long service life in Canadian
                conditions.
              </p>
              <p>
                We offer both retail and bulk solutions, with fast shipping across Canada. Our parts are available for the
                most common car makes and models, and we also support custom and less common applications.
              </p>
            </div>
          </div>
          <div className="cm-reveal-r cm-sweep relative aspect-[16/10] overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
            <div className="cm-glow absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
            <Image
              src="/about/manufacturer-hero.jpg"
              alt="Cutaway wireframe of a performance car showing the engine, brakes and cooling system"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-700 hover:scale-105"
            />
          </div>
        </section>

        {/* Highlights */}
        <section aria-label="Why Canuck Motors" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="cm-reveal group relative overflow-hidden rounded-[24px] border border-black/5 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/30 hover:shadow-[0_24px_50px_rgba(214,40,40,0.14)]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/10 blur-2xl transition duration-500 group-hover:bg-brand/25" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand ring-1 ring-brand/20 transition duration-300 group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="relative mt-5 text-lg font-black tracking-[-0.02em] text-ink">{title}</h3>
              <p className="relative mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        {/* Shipping across Canada */}
        <section aria-labelledby="canada" className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <div className="cm-reveal-l relative aspect-[16/10] overflow-hidden rounded-[32px] border border-black/5 bg-[#f4f4f5] shadow-[0_24px_70px_rgba(0,0,0,0.10)]">
            <div className="cm-glow absolute left-1/4 top-1/4 h-48 w-48 rounded-full bg-brand/15 blur-3xl" />
            <Image
              src="/about/worldcanda.png"
              alt="3D wireframe map of North America with Canada highlighted in red"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="cm-float object-contain p-4 mix-blend-multiply"
            />
          </div>
          <div className="cm-reveal-r">
            <p className="cm-eyebrow">Coast to coast</p>
            <h2 id="canada" className="mt-3 text-3xl font-black tracking-[-0.035em] text-ink md:text-5xl">
              Fast shipping <span className="text-brand">across Canada.</span>
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Our distribution network spans coast to coast, so we can deliver the right part at the right time, whether
              you need one set of brake pads or a bulk order for your shop or fleet.
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
        </section>

        <section aria-label="Why choose our manufacturers" className="space-y-8 md:space-y-12">
          {usps.map((u, i) => (
            <article
              key={u.title}
              className={`group relative grid items-center gap-6 overflow-hidden rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.06)] transition duration-500 hover:border-brand/30 hover:shadow-[0_28px_60px_rgba(214,40,40,0.12)] md:grid-cols-2 md:gap-12 md:p-10 ${
                i % 2 ? "cm-reveal-r md:[&>div:first-child]:order-2" : "cm-reveal-l"
              }`}
            >
              <span className="pointer-events-none absolute right-6 top-2 select-none text-[9rem] font-black leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(0,0,0,0.06)] md:text-[12rem]" aria-hidden="true">
                0{i + 1}
              </span>
              <div className="cm-sweep relative aspect-[4/3] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_55%,rgba(214,40,40,0.14),transparent_62%),#f4f4f5] ring-1 ring-black/5">
                <Image
                  src={u.img}
                  alt={u.title}
                  fill
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="object-contain p-2 mix-blend-multiply transition duration-700 group-hover:scale-110 group-hover:-rotate-2"
                />
              </div>
              <div className="relative">
                <p className="cm-eyebrow">Reason 0{i + 1}</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink md:text-4xl">{u.title}</h3>
                {u.body.map((p) => (
                  <p key={p.slice(0, 20)} className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                    {p}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>

        {/* Inside every part */}
        <section aria-labelledby="inside" className="cm-reveal">
          <p className="cm-eyebrow">Inside every part</p>
          <h2 id="inside" className="mt-3 text-3xl font-black tracking-[-0.035em] text-ink md:text-5xl">
            Engineered in every detail.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["/about/bearing.png", "Enhanced bearings", "Heat-treated bearings that run smooth and quiet at high speed."],
              ["/about/waterseal.png", "Seal integrity", "Advanced seals keep coolant in and contamination out."],
            ].map(([src, title, text]) => (
              <Link
                key={title}
                href="/about/product"
                className="group relative overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/30 hover:shadow-[0_24px_50px_rgba(214,40,40,0.14)]"
              >
                <div className="relative aspect-[16/10] bg-[#f4f4f5]">
                  <Image src={src} alt={title} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-contain p-4 mix-blend-multiply transition duration-700 group-hover:scale-110" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  <span className="mt-3 inline-block text-sm font-bold text-brand">See how it&apos;s built →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="brands" className="cm-reveal">
          <p className="cm-eyebrow">Find parts for your brand</p>
          <h2 id="brands" className="mt-3 text-3xl font-black tracking-[-0.035em] text-ink md:text-5xl">
            Shop by vehicle brand.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {brands.map(([name, slug]) => (
              <Link
                key={slug}
                href={`/brands/${slug}`}
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-ink transition duration-300 hover:-translate-y-1 hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_12px_28px_rgba(214,40,40,0.3)]"
              >
                {name}
              </Link>
            ))}
            <Link
              href="/brands"
              className="rounded-full border border-brand/30 bg-brand-tint px-6 py-3 text-sm font-bold text-brand transition duration-300 hover:-translate-y-1 hover:bg-brand hover:text-white"
            >
              Other brands
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Contact us for less common makes and custom solutions.</p>
        </section>

        <section aria-labelledby="faq" className="cm-reveal">
          <p className="cm-eyebrow">Frequently asked questions</p>
          <h2 id="faq" className="mt-3 text-3xl font-black tracking-[-0.035em] text-ink md:text-5xl">
            Good to know.
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map(([q, a]) => (
              <details
                key={q}
                className="group rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition duration-300 hover:border-brand/25 open:border-brand/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-ink">
                  {q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl text-brand transition duration-300 group-open:rotate-45 group-open:bg-brand group-open:text-white" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    </main>
  );
}
