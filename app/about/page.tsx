import type { Metadata } from "next";
import Image from "next/image";
import AboutTabs from "@/components/about/AboutTabs";
import AboutHero from "@/components/about/AboutHero";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "About Canuck Motors | Canadian Automotive Parts Brand",
  description:
    "Canuck Motors is a Canadian automotive parts brand delivering OEM-grade brake pads, water pumps and timing belt kits engineered for accurate fitment and long-term reliability.",
  alternates: { canonical: "/about" },
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const history = [
  {
    title: "Our mission",
    body: "Canuck Motors was founded on April 19th, 2024, with a clear mission to revolutionize the autoparts industry. From the very beginning, our commitment to innovation, sustainability, and customer satisfaction has been at the forefront of everything we do. Our aim is to set new standards in the industry, ensuring that our customers receive the highest quality products and services.",
  },
  {
    title: "Innovation",
    body: "Innovation is the driving force behind Canuck Motors. We constantly strive to develop and implement cutting-edge technologies that enhance the performance and reliability of our autoparts. Our team of dedicated engineers and designers works tirelessly to push the boundaries of what is possible, creating solutions that meet and exceed the evolving needs of our customers.",
  },
  {
    title: "Sustainability",
    body: "Sustainability is another core value at Canuck Motors. We recognize the importance of reducing our environmental impact and are committed to adopting eco-friendly practices throughout our operations. From sourcing materials responsibly to minimizing waste and emissions, we aim to contribute positively to the environment while delivering top-notch products.",
  },
  {
    title: "Customer satisfaction",
    body: "Customer satisfaction is the cornerstone of our business. We believe in building strong, lasting relationships with our clients by providing exceptional service and support. Our customer-centric approach ensures that every interaction is tailored to meet the unique requirements of each individual, fostering trust and loyalty.",
  },
];

const focus = [
  {
    title: "Precision Engineering",
    img: "/about/focus.png",
    body: "We invest heavily in sourcing and engineering to deliver exceptional quality and performance. By leveraging strict manufacturing standards and rigorous testing, we ensure that our offerings consistently meet and exceed OEM specifications. Our goal is to provide technicians and drivers with parts that fit perfectly every time, and we keep improving our line, including our premium brake pads and timing belt kits.",
  },
  {
    title: "Reliability & Performance",
    img: "/about/sustainr.png",
    body: "We use advanced materials and manufacturing processes so every component delivers long-term reliability. From the friction materials in our brake pads to the durability of our timing belts, quality is built into every detail. That minimizes premature failures and returns, and helps our customers save money and time.",
  },
  {
    title: "Safety First",
    img: "/about/saftey.png",
    body: "Our products are critical to vehicle safety. Whether it is stopping power or engine timing, we ensure that our offerings not only meet but exceed safety standards, enhancing the protection and well-being of all road users. Precision manufacturing leads to parts that perform flawlessly under pressure.",
  },
  {
    title: "Value & Trust",
    img: "/about/grsphup.png",
    body: "We prioritize quality without compromising on value. We strive to find the right balance between OEM-grade quality and cost, so high-quality brake and timing components stay accessible. Our goal is to build lasting relationships based on trust, satisfaction, and dependability.",
  },
];

export default function AboutPage() {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Canuck Motors",
    url: SITE_URL,
    foundingDate: "2024-04-19",
    description:
      "Canadian automotive parts brand: brake pads, brake kits, engine water pumps and timing belt kits engineered for accurate fitment.",
    email: "contactus@canuckmotors.ca",
    telephone: "+1-604-445-0147",
    areaServed: "CA",
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
      <AboutHero eyebrow="About · Company" title="Who are we?">
        <p>
          Canuck Motors is a Canadian automotive parts brand focused on delivering dependable, OEM-grade components
          engineered for real-world driving conditions. Our portfolio includes precision-engineered brake pads, complete
          brake pad sets, engine water pumps and timing belt kits, designed for accurate fitment, consistent performance,
          and long-term reliability.
        </p>
      </AboutHero>

      <AboutTabs />

      {/* Values marquee */}
      <div className="cm-marquee relative mt-10 overflow-hidden border-y border-black/5 bg-white py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="cm-marquee-track whitespace-nowrap" aria-hidden="true">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex shrink-0 items-center gap-10 pr-10">
              {["Integrity", "Reliability", "Precision", "OEM-grade quality", "Made for Canadian roads"].map((w) => (
                <span key={w} className="flex items-center gap-10 text-2xl font-black uppercase tracking-[0.12em] text-ink/20 md:text-3xl">
                  {w}
                  <span className="text-brand">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="cm-container space-y-16 py-14 md:space-y-20 md:py-20">
        {/* Vision */}
        <section aria-labelledby="vision" className="grid items-center gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
          <div className="cm-reveal-l cm-sweep relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_55%,rgba(214,40,40,0.32),transparent_62%),#0b0b0d] ring-1 ring-black/5">
            <Image src="/about/cm4.png" alt="Canuck Motors" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-contain p-6" />
          </div>
          <div className="cm-reveal-r">
            <p className="cm-eyebrow">Our vision</p>
            <h2 id="vision" className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink md:text-4xl">
              From Canada, <span className="text-brand">for Canadians.</span>
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Our vision at Canuck Motors is to be the most trusted Canadian name in automotive aftermarket parts,
              delivering components that drivers and technicians can rely on. We aim to set a new standard for
              dependability and fitment in the Canadian market.
            </p>
            <p className="mt-4 leading-7 text-muted-foreground">
              By maintaining rigorous supplier standards and focusing on products like brake pads, brake kits, engine
              water pumps and timing belts that are crucial for vehicle safety and performance, we strive to earn the
              confidence of professional installers and DIYers alike. Through our quality-first approach, we contribute
              to safer roads and more reliable repairs across Canada, guided by our core values of{" "}
              <strong className="text-ink">integrity</strong>, <strong className="text-ink">reliability</strong> and{" "}
              <strong className="text-ink">precision</strong>.
            </p>
          </div>
        </section>

        {/* History */}
        <section aria-labelledby="history" className="cm-reveal">
          <p className="cm-eyebrow">Our history</p>
          <h2 id="history" className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink md:text-4xl">
            Founded April 19th, 2024.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {history.map((h, i) => (
              <article key={h.title} className="cm-reveal cm-card p-6">
                <p className="text-sm font-black tracking-[0.16em] text-brand">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-xl font-black text-ink">{h.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{h.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Focus areas */}
        <section aria-labelledby="focus" className="cm-reveal">
          <p className="cm-eyebrow">Our focus areas</p>
          <h2 id="focus" className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink md:text-4xl">
            What defines our approach.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {focus.map((f) => (
              <article
                key={f.title}
                className="cm-reveal group overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/25"
              >
                <div className="relative aspect-[16/9] bg-ink">
                  <Image src={f.img} alt={f.title} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover opacity-90 transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black text-ink">{f.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{f.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }} />
    </main>
  );
}
