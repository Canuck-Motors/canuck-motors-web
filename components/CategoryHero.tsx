import Image from "next/image";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";

// Animated banner for category pages, built from real photos only.
// - Dark style: a professional black-background shoot saved in public/categories/<folder>
//   (brake pads: Drive "Sameer-blackbg-brakeprofessionalshoot", via scripts/fetch-category-banners.mjs).
// - Light style: our real product photos (white background, CM logo) from the parts in this category.
// Photos cross-fade with a slow zoom.

const SHOOTS: Record<string, string[]> = {
  "disc-brake-pad-set": ["/categories/brake-pads/hero-1.webp", "/categories/brake-pads/hero-2.webp", "/categories/brake-pads/hero-3.webp"],
};

const TAGLINES: Record<string, string> = {
  "disc-brake-pad-set": "Engineered to stop. Built to last.",
  "engine-water-pump": "Keeps your engine at the right temperature.",
  "engine-timing-belt-kit-with-water-pump": "Everything for the job, in one box.",
};

const shootFor = (slug: string) =>
  (SHOOTS[slug] ?? []).filter((src) => existsSync(path.join(process.cwd(), "public", src)));

function Slides({ photos, fit, sizes }: { photos: string[]; fit: "cover" | "contain"; sizes: string }) {
  return (
    <>
      {photos.map((src, i) => (
        <div
          key={src}
          className="cm-cat-slide absolute inset-0"
          style={{ ["--i" as string]: i, ["--n" as string]: photos.length } as React.CSSProperties}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes={sizes}
            className={fit === "cover" ? "object-cover object-center" : "object-contain object-center p-5 md:p-8"}
          />
        </div>
      ))}
    </>
  );
}

export function CategoryHero({
  slug,
  name,
  count,
  productPhotos = [],
}: {
  slug: string;
  name: string;
  count: number;
  productPhotos?: string[];
}) {
  const shoot = shootFor(slug);
  const photos = shoot.length ? shoot : productPhotos.slice(0, 4);
  const card = !shoot.length && photos.length > 0; // white-background product photos, shown beside the text
  const tagline = TAGLINES[slug];

  return (
    <section className={`relative isolate overflow-hidden bg-ink text-white ${photos.length ? "md:min-h-[480px]" : ""}`}>
      {/* Pro shoot (black background): full-bleed on the right, faded into the black */}
      {shoot.length > 0 && (
        <div className="cm-cat-photos absolute inset-y-0 right-0 -z-20 w-full md:w-[60%]" aria-hidden="true">
          <Slides photos={shoot} fit="cover" sizes="(min-width: 768px) 60vw, 100vw" />
        </div>
      )}

      {!shoot.length && <div className="cm-cat-grid absolute inset-0 -z-30" aria-hidden="true" />}
      <div className="cm-cat-glow absolute -right-24 top-1/2 -z-30 h-[560px] w-[560px] -translate-y-1/2 rounded-full" aria-hidden="true" />
      <div className="cm-cat-sweep absolute inset-0 -z-10" aria-hidden="true" />

      <div
        className={`cm-container relative grid items-center gap-10 py-14 md:py-16 ${
          card ? "md:grid-cols-[1.05fr_0.95fr]" : ""
        } ${photos.length ? "md:min-h-[480px]" : ""}`}
      >
        <div className="cm-hero-in relative max-w-xl">
          <Link href="/categories" className="text-sm font-bold text-brand hover:underline">
            All categories
          </Link>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-6xl">{name}</h1>
          {tagline && <p className="mt-3 text-lg font-bold text-white/85">{tagline}</p>}
          <p className="mt-4 max-w-xl text-white/65">
            Browse available parts, then confirm compatibility with your vehicle before ordering.
          </p>
          {count > 0 && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80">
              <span className="cm-cat-dot h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
              <span>{count}</span>
              <span>parts</span>
            </p>
          )}
        </div>

        {/* Product photos, shown plainly and cross-fading */}
        {card && (
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-2xl bg-white cm-cat-fade" aria-hidden="true">
            <Slides photos={photos} fit="contain" sizes="(min-width: 768px) 520px, 90vw" />
          </div>
        )}
      </div>
    </section>
  );
}
