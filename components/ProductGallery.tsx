"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({
  images,
  name,
}: {
  images: { id: number; url: string }[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="text-center">
        <p className="text-base font-semibold text-ink">No photo yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Photo coming soon.</p>
      </div>
    );
  }

  return (
    <div className="w-full" data-product-image>
      <div className="relative mx-auto aspect-square w-full max-w-[520px]">
        <Image
          key={images[active].id}
          src={images[active].url}
          alt={`${name} - photo ${active + 1}`}
          fill
          priority={active === 0}
          sizes="(min-width: 1024px) 520px, 90vw"
          className="object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-16 overflow-hidden rounded-xl border bg-white ${
                i === active ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand/50"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
