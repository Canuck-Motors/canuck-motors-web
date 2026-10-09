import Image from "next/image";
import type { CategoryMedia } from "@/lib/category-media";

// Dark, smoky stage with a red swoosh and a floating product.
// Pure CSS motion; the product image is real content with alt text.
export default function CategoryScene({
  media,
  name,
}: {
  media: CategoryMedia | null;
  name: string;
}) {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_70%_30%,#2a1512_0%,#0d0d0d_65%)]">
      {/* drifting smoke */}
      <span className="cm-smoke pointer-events-none absolute -left-8 top-2 h-32 w-32 rounded-full bg-brand/25 blur-3xl" />
      <span
        className="cm-smoke pointer-events-none absolute -right-6 bottom-0 h-28 w-28 rounded-full bg-orange-900/40 blur-3xl"
        style={{ animationDelay: "-3s" }}
      />

      {/* red swoosh */}
      <span className="cm-swoosh pointer-events-none absolute -bottom-6 -left-10 h-20 w-[85%] bg-gradient-to-r from-brand-dark to-brand" />
      <span className="cm-swoosh pointer-events-none absolute -bottom-2 left-1/3 h-3 w-[70%] bg-brand/60" style={{ animationDelay: "0.15s" }} />

      {media && (
        <div className="absolute inset-0 flex items-center justify-center">
          {media.kind === "photo" ? (
            // product photo: lit by a soft spotlight disc so the white background disappears
            <div className="cm-float relative h-36 w-36 overflow-hidden rounded-full bg-gradient-to-b from-white to-neutral-300 shadow-[0_12px_40px_rgba(214,40,40,0.35)] ring-4 ring-brand/70">
              <Image
                src={media.url}
                alt={name}
                fill
                sizes="144px"
                className="object-contain mix-blend-multiply"
              />
            </div>
          ) : (
            <div className="cm-float relative h-40 w-40 drop-shadow-[0_18px_28px_rgba(0,0,0,0.6)]">
              <Image src={media.url} alt={name} fill sizes="160px" className="object-contain" />
            </div>
          )}
        </div>
      )}

      {/* light sheen sweeping across on hover */}
      <span className="cm-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
