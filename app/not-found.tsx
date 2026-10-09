import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <main className="min-h-[70vh] bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_28%,#fafafa_100%)]">
        <div className="cm-container flex min-h-[70vh] items-center justify-center py-16">
          <div className="max-w-2xl text-center">
            <p className="cm-eyebrow">404</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-ink md:text-6xl">
              That page isn&apos;t in the garage.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              The link may be outdated or the page may have moved. Use one of the
              options below to get back to the catalog.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/" className="cm-button-dark">
                Go home
              </Link>
              <Link href="/products" className="cm-button-primary">
                Browse auto parts
              </Link>
              <Link href="/#vehicle-finder" className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-ink transition hover:border-brand/30 hover:text-brand">
                Vehicle finder
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
