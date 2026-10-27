import { MapPin, Truck, RotateCcw, Headphones } from "lucide-react";

const ITEMS = [
  { icon: MapPin, title: "Fitment checked", text: "Choose your year, make and model and see only the parts that fit." },
  { icon: Truck, title: "Ships across Canada", text: "Orders ship from Canada, with same-day Uber delivery in Vancouver and Burnaby." },
  { icon: RotateCcw, title: "Easy returns", text: "Request a return from your account within 30 days of delivery." },
  { icon: Headphones, title: "Real support", text: "Questions? Call 604-445-0147 or ask Axel, our parts assistant." },
];

export default function TrustStrip() {
  return (
    <section className="bg-white py-14 md:py-20" aria-labelledby="trust-heading">
      <div className="cm-container">
        <p className="cm-eyebrow">Why Canuck Motors</p>
        <h2 id="trust-heading" className="cm-section-title mt-3">
          Parts you can order with confidence
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-[22px] border border-black/5 bg-secondary p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:bg-white hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-tint text-brand transition duration-300 group-hover:bg-brand group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-black tracking-[-0.02em] text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
