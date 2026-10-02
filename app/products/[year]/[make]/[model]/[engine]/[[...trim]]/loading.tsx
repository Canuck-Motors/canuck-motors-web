export default function Loading() {
  return (
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="animate-pulse">
          <div className="h-4 w-64 rounded bg-muted" />

          <div className="mt-8 h-10 max-w-3xl rounded bg-muted" />

          <div className="mt-4 h-5 max-w-2xl rounded bg-muted" />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border bg-white"
              >
                <div className="aspect-[4/3] bg-muted" />

                <div className="space-y-3 p-5">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-5 w-full rounded bg-muted" />
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="mt-5 h-8 w-full rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}