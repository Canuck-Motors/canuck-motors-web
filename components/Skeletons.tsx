// Grey placeholders shaped like the real page, shown while a page loads (instead of a spinner).
const bar = "animate-pulse rounded-lg bg-black/[0.07]";

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.05)]" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-black/[0.06]" />
      <div className="space-y-3 p-5">
        <div className={`${bar} h-3 w-1/3`} />
        <div className={`${bar} h-5 w-5/6`} />
        <div className={`${bar} h-5 w-2/3`} />
        <div className="flex items-end justify-between pt-3">
          <div className={`${bar} h-8 w-24`} />
          <div className="h-11 w-11 animate-pulse rounded-full bg-black/[0.07]" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" }: { count?: number; className?: string }) {
  return (
    <div className={className} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Dark banner + filter column + cards: the shape of the vehicle / search results pages.
export function ResultsPageSkeleton() {
  return (
    <main className="min-h-screen bg-secondary" aria-busy="true">
      <section className="bg-ink">
        <div className="cm-container space-y-4 py-10 md:py-14">
          <div className="h-3 w-48 animate-pulse rounded bg-white/15" />
          <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-10 w-3/4 max-w-2xl animate-pulse rounded-lg bg-white/15 md:h-14" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-white/10" />
          <div className="flex gap-2 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
            ))}
          </div>
        </div>
      </section>
      <div className="cm-container py-10 md:py-14 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <div className="mb-6 hidden space-y-2 rounded-[22px] bg-white p-4 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${bar} h-10 w-full`} />
          ))}
        </div>
        <div className="mb-6 flex gap-2 overflow-hidden lg:hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-black/[0.07]" />
          ))}
        </div>
        <ProductGridSkeleton count={6} className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3" />
      </div>
    </main>
  );
}

// Generic page: a heading and a few blocks.
export function PageSkeleton() {
  return (
    <main className="min-h-[60vh] bg-white" aria-busy="true">
      <div className="cm-container space-y-6 py-12">
        <div className={`${bar} h-4 w-32`} />
        <div className={`${bar} h-10 w-2/3 max-w-xl`} />
        <div className={`${bar} h-4 w-full max-w-2xl`} />
        <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-[22px] bg-black/[0.06]" />
          ))}
        </div>
      </div>
    </main>
  );
}
