"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

export default function ProductGallery({
  images,
  name,
  plain = false,
}: {
  plain?: boolean;
  images: { id: number; url: string; video?: boolean }[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);

  const photoIdx = images.map((im, i) => (im.video ? -1 : i)).filter((i) => i >= 0);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (photoIdx.length < 2) return;
      const at = photoIdx.indexOf(active);
      const next = photoIdx[(at + dir + photoIdx.length) % photoIdx.length];
      setActive(next);
      setZoomed(false);
    },
    [active, photoIdx],
  );

  // Keyboard: Esc closes, arrows change photo. Page scroll is locked while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, step]);

  function moveOrigin(clientX: number, clientY: number, rect: DOMRect) {
    setOrigin({
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    });
  }

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
      <div
        className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-2xl cm-photo-stage"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX == null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          setTouchX(null);
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        }}
      >
        {images[active].video ? (
          <video
            key={images[active].id}
            src={images[active].url}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full rounded-xl bg-black object-contain"
            aria-label={`${name} - video`}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              setOpen(true);
            }}
            onMouseMove={(e) => {
              if (window.matchMedia("(hover: none)").matches) return;
              const r = e.currentTarget.getBoundingClientRect();
              setHover({
                x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
                y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
              });
            }}
            onMouseLeave={() => setHover(null)}
            aria-label="Open large photo"
            className="group absolute inset-0 cursor-zoom-in"
          >
            <Image
              key={images[active].id}
              src={images[active].url}
              alt={`${name} - photo ${active + 1}`}
              fill
              priority={active === 0}
              sizes="(min-width: 1024px) 640px, 92vw"
              className={`cm-photo object-contain p-2 ${plain ? "cm-photo-plain" : ""}`}
            />
            {hover && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden bg-white bg-no-repeat md:block"
                style={{
                  backgroundImage: `url("${images[active].url}")`,
                  backgroundSize: "230%",
                  backgroundPosition: `${hover.x}% ${hover.y}%`,
                }}
              />
            )}
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-white opacity-90 transition group-hover:bg-brand">
              <ZoomIn className="h-4 w-4" /> <span className="md:hidden">Tap to zoom</span><span className="hidden md:inline">Hover to zoom, click for full size</span>
            </span>
          </button>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={img.video ? "Play video" : `Show photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white ${
                i === active ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand/50"
              }`}
            >
              {img.video ? (
                <span className="flex h-full w-full items-center justify-center bg-ink text-[11px] font-bold text-white">
                  &#9654; Video
                </span>
              ) : (
                <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
              )}
            </button>
          ))}
        </div>
      )}

      {open && !images[active].video && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} - large photo`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="line-clamp-1 pr-4 text-sm font-semibold text-white/80">{name}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/25"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
            {photoIdx.length > 1 && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <div
              className="relative h-full w-full max-w-5xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onMouseMove={(e) => zoomed && moveOrigin(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())}
              onTouchMove={(e) => zoomed && moveOrigin(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget.getBoundingClientRect())}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[active].url}
                alt={`${name} - photo ${active + 1}`}
                draggable={false}
                onClick={(e) => {
                  moveOrigin(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
                  setZoomed((z) => !z);
                }}
                style={{ transform: zoomed ? "scale(2.6)" : "scale(1)", transformOrigin: `${origin.x}% ${origin.y}%` }}
                className={`h-full w-full select-none object-contain transition-transform duration-200 ${
                  zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
              />
            </div>

            {photoIdx.length > 1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          <p className="p-3 text-center text-xs text-white/60" onClick={(e) => e.stopPropagation()}>
            {zoomed ? "Move your mouse to look around. Click to zoom out." : "Click the photo to zoom in."}
            {photoIdx.length > 1 ? `  ·  Photo ${photoIdx.indexOf(active) + 1} of ${photoIdx.length}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
