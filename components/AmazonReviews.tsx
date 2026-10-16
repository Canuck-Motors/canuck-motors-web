"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Quote, Star, X } from "lucide-react";
import { reviewUrl, visibleReviews, type AmazonReview } from "@/lib/amazon-reviews";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-white/20"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

const tag = (r: AmazonReview) => (r.type === "vine" ? "Vine review" : "Verified Purchase");

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

function ReviewCard({ review }: { review: AmazonReview }) {
  return (
    <article className="group relative flex w-[290px] shrink-0 flex-col gap-4 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1.5 hover:border-brand/50 hover:bg-white/[0.09] sm:w-[330px]">
      <Quote className="absolute -right-2 -top-2 h-20 w-20 rotate-180 text-brand/15 transition duration-300 group-hover:text-brand/30" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-base font-black text-white">
          {review.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{review.name}</p>
          <p className="text-xs text-white/50">{tag(review)}</p>
        </div>
      </div>
      <Stars rating={review.rating} />
      <p className="font-bold leading-6 text-white">{review.title}</p>
      <p className="line-clamp-4 flex-1 text-sm leading-6 text-white/65">“{review.text}”</p>
      <p className="text-xs font-semibold text-brand">{fmtDate(review.date)}</p>
    </article>
  );
}

export function AmazonReviews() {
  const reviews = visibleReviews();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const [loopCopy, setLoopCopy] = useState(false); // second copy only after load, so crawlers see each review once
  const GAP = 20;
  const PAD = 20; // track side padding
  const SPEED = 28; // pixels per second, right to left

  useEffect(() => setLoopCopy(true), []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !loopCopy) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pos = el.scrollLeft;
    let lastSet = pos;
    let last = performance.now();
    let raf = 0;
    const period = () => (el.scrollWidth - 2 * PAD + GAP) / 2;

    const pause = (ms: number) => {
      pausedUntil.current = Math.max(pausedUntil.current, performance.now() + ms);
    };
    const onScroll = () => {
      // moved by the visitor (drag, wheel, arrows): continue from there
      if (Math.abs(el.scrollLeft - lastSet) > 2) {
        pos = el.scrollLeft;
        lastSet = pos;
      }
    };
    const onEnter = () => (pausedUntil.current = Infinity);
    const onLeave = () => (pausedUntil.current = performance.now() + 600);
    const onTouch = () => pause(3000);

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (!reduced && now > pausedUntil.current && document.visibilityState === "visible") {
        pos += (SPEED * dt) / 1000;
        const p = period();
        if (pos >= p) pos -= p;
        el.scrollLeft = pos;
        lastSet = el.scrollLeft;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("focusin", onEnter);
    el.addEventListener("focusout", onLeave);
    el.addEventListener("touchstart", onTouch, { passive: true });
    el.addEventListener("touchend", onTouch, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("focusin", onEnter);
      el.removeEventListener("focusout", onLeave);
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("touchend", onTouch);
    };
  }, [loopCopy]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    pausedUntil.current = performance.now() + 4000;
    const page = el.clientWidth + GAP;
    const p = (el.scrollWidth - 2 * PAD + GAP) / 2;
    // loop: stepping back from the start jumps to the same spot in the second copy first
    if (dir === -1 && el.scrollLeft < page && loopCopy) el.scrollLeft += p;
    el.scrollBy({ left: dir * page, behavior: "smooth" });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  if (reviews.length === 0) return null;

  const newestFirst = [...reviews].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="relative overflow-hidden bg-ink py-20 text-white md:py-24" aria-labelledby="reviews-title">
      <span className="cm-smoke pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
      <span className="cm-smoke pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-orange-900/30 blur-3xl" style={{ animationDelay: "-3s" }} />
      <div className="cm-container relative">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">Amazon.ca reviews</p>
            <h2 id="reviews-title" className="mt-3 text-3xl font-black tracking-[-0.035em] text-white md:text-4xl">What Our Customers Say</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 md:text-base">
              Real reviews from Canuck Motors buyers on Amazon.ca.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:border-brand hover:bg-brand"
          >
            See all reviews
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

      </div>

      <div className="relative mt-10">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous reviews"
            className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-ink/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition hover:border-brand hover:bg-brand sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Next reviews"
            className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-ink/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition hover:border-brand hover:bg-brand sm:right-6"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>

          <div
            ref={trackRef}
            className="flex gap-5 overflow-x-auto px-5 py-3 [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            tabIndex={0}
            aria-label="Customer reviews"
          >
            {reviews.map((r, i) => (
              <ReviewCard key={i} review={r} />
            ))}
            {loopCopy &&
              reviews.map((r, i) => (
                <div key={`copy-${i}`} aria-hidden="true" className="contents">
                  <ReviewCard review={r} />
                </div>
              ))}
          </div>
        </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="all-reviews-title"
        className="m-auto max-h-[85vh] w-[min(760px,calc(100%-32px))] overflow-y-auto rounded-3xl p-0 shadow-2xl backdrop:bg-black/60"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white px-6 py-5">
          <h3 id="all-reviews-title" className="text-xl font-black tracking-tight text-ink">
            All Customer Reviews <span className="text-muted-foreground">({reviews.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-secondary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="divide-y divide-black/5 px-6 pb-6">
          {newestFirst.map((r, i) => (
            <article key={i} className="py-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold text-ink">{r.name}</span>
                <Stars rating={r.rating} />
              </div>
              <p className="mt-2 font-bold text-ink">{r.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDate(r.date)} · {r.part} · {tag(r)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/80">{r.text}</p>
              <a
                href={reviewUrl(r)}
                target="_blank"
                rel="noopener noreferrer"
                className="cm-button-primary mt-4 px-5 py-2"
              >
                Check on Amazon
                <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </dialog>
    </section>
  );
}
