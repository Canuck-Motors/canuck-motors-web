import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Deals & Offers",
  description:
    "View current Canuck Motors promotions and browse automotive parts by fitment and category.",
  alternates: { canonical: "/deals" },
};

export default function DealsPage() {
  return (
    <>
      <Header />
      <Navbar />
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
        <section className="bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <p className="cm-eyebrow">Offers</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.045em] md:text-6xl">
              Deals without the guesswork.
            </h1>
            <p className="mt-5 max-w-2xl text-white/65">
              Promotions will appear here when active. We do not publish placeholder
              discounts or misleading sale pricing.
            </p>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-brand/15 bg-brand-tint/55 p-7">
              <p className="cm-eyebrow">Current status</p>
              <h2 className="mt-3 text-2xl font-black text-ink">
                No public promotion is active right now.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                You can still browse the catalog or search by vehicle to find compatible parts.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/products" className="cm-button-dark">
                  Browse auto parts
                </Link>
                <Link href="/#vehicle-finder" className="cm-button-primary">
                  Find by vehicle
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] bg-ink p-7 text-white shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
                Better buying
              </p>
              <h2 className="mt-3 text-2xl font-black">
                Start with compatibility, not discount percentage.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                The vehicle finder helps reduce incorrect purchases by narrowing products
                against your vehicle details before checkout.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
