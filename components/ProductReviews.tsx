import { ArrowUpRight } from "lucide-react";
import StarRating from "@/components/StarRating";
import { ratingForSku, reviewUrl, reviewsForSku } from "@/lib/amazon-reviews";

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

// Amazon.ca reviews for this exact part number (only shown when there are some).
export default function ProductReviews({ sku }: { sku: string | null | undefined }) {
  const reviews = reviewsForSku(sku);
  const summary = ratingForSku(sku);
  if (!reviews.length || !summary) return null;

  return (
    <section className="mt-14" aria-labelledby="product-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <p className="cm-eyebrow">Customer reviews</p>
          <h2 id="product-reviews-heading" className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink md:text-3xl">
            What buyers say about {sku}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-black tracking-[-0.04em] text-ink">{summary.average.toFixed(1)}</span>
          <div>
            <StarRating rating={summary.average} className="h-5 w-5" />
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {summary.count} {summary.count === 1 ? "review" : "reviews"} on Amazon.ca
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {reviews.map((r, i) => (
          // Reviews stay in the customer's own words (not translated)
          <article key={i} data-no-translate className="rounded-[22px] border border-black/5 bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <StarRating rating={r.rating} />
              <span className="text-xs font-semibold text-muted-foreground">{fmtDate(r.date)}</span>
            </div>
            <p className="mt-3 font-black text-ink">{r.title}</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">“{r.text}”</p>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-ink/70">
                {r.name} · {r.type === "vine" ? "Vine review" : "Verified Purchase"}
              </span>
              <a
                href={reviewUrl(r)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
              >
                View on Amazon <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
