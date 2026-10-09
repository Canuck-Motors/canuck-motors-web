import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Canuck Motors and our focus on vehicle fitment, automotive parts discovery, and a clearer online buying experience.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
        <section className="bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <p className="cm-eyebrow">About Canuck Motors</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.045em] md:text-6xl">
              A clearer way to find the right automotive part.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
              Canuck Motors is being built around one simple idea: make automotive parts
              discovery easier by connecting product information with structured vehicle fitment.
            </p>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["Fitment first", "Search by year, make, model, engine, and trim before you buy."],
              ["Clear product data", "Structured product pages make part numbers and compatibility easier to understand."],
              ["Built for confidence", "Account, tracking, returns, inventory, and payment flows are designed to reduce uncertainty after checkout."],
            ].map(([title, body]) => (
              <article key={title} className="cm-card p-6">
                <h2 className="text-xl font-black text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-[30px] bg-ink p-7 text-white md:p-10">
            <p className="cm-eyebrow">Start here</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em]">
              Find parts for your vehicle.
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/#vehicle-finder" className="cm-button-primary">
                Vehicle finder
              </Link>
              <Link href="/products" className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:border-brand/40 hover:text-brand">
                Browse catalog
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
