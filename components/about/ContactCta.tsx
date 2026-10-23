import Link from "next/link";

export default function ContactCta({
  title = "Need help finding the right part?",
  text = "Tell us your vehicle and we will help you find the exact fit.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-ink p-7 text-white md:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
      <div className="relative">
        <p className="cm-eyebrow">Start here</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.035em]">{title}</h2>
        <p className="mt-3 max-w-2xl text-white/65">{text}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/#vehicle-finder" className="cm-button-primary">
            Vehicle finder
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:border-brand/40 hover:text-brand"
          >
            Browse catalog
          </Link>
          <a
            href="mailto:contactus@canuckmotors.ca"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:border-brand/40 hover:text-brand"
          >
            contactus@canuckmotors.ca
          </a>
          <a
            href="tel:+16044450147"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:border-brand/40 hover:text-brand"
          >
            +1 604-445-0147
          </a>
        </div>
      </div>
    </div>
  );
}
