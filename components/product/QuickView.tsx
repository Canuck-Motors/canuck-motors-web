"use client";

import { isPlainPhoto } from "@/lib/plain-photos";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import StarRating from "@/components/StarRating";
import { addToCart } from "@/app/cart/actions";

type Data = {
  id: number;
  name: string;
  sku: string | null;
  price: number | null;
  href: string;
  images: string[];
  specs: { name: string; value: string }[];
  available: number;
  amazonRedirect: boolean;
  amazonUrl: string | null;
};

// "Quick view" on a product card (mouse devices): key facts and Add to Cart without leaving the list.
export default function QuickView({ productId, rating }: { productId: number; rating?: { average: number; count: number } | null }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function show() {
    setOpen(true);
    setPhoto(0);
    if (data) return;
    setFailed(false);
    try {
      const res = await fetch(`/api/quick-view?id=${productId}`);
      if (!res.ok) throw new Error();
      setData((await res.json()) as Data);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="absolute left-1/2 top-[34%] z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-ink/90 px-4 py-2 text-xs font-bold text-white opacity-0 shadow-lg backdrop-blur transition duration-200 hover:bg-brand focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:inline-flex"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Quick view
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick view"
          className="cm-qv-bg fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="cm-qv-card relative max-h-[90vh] w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-[28px] bg-white p-5 shadow-2xl sm:p-7" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 rounded-full bg-secondary p-2 text-ink transition hover:bg-brand hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {!data && !failed && <div className="h-72 animate-pulse rounded-2xl bg-secondary" />}
            {failed && <p className="py-16 text-center font-semibold text-muted-foreground">Could not load this part. Please open the product page.</p>}

            {data && (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <div data-product-image className="relative aspect-square overflow-hidden rounded-2xl border border-black/5 bg-white">
                    {data.images[photo] ? (
                      <Image src={data.images[photo]} alt={data.name} fill sizes="(min-width: 768px) 360px, 90vw" className={`cm-photo object-contain p-2 ${isPlainPhoto(data.sku) ? "cm-photo-plain" : ""}`} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">Photo coming soon</div>
                    )}
                  </div>
                  {data.images.length > 1 && (
                    <div className="mt-3 flex gap-2">
                      {data.images.map((src, i) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setPhoto(i)}
                          aria-label={`Show photo ${i + 1}`}
                          className={`relative h-14 w-14 overflow-hidden rounded-lg border bg-white ${i === photo ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand/50"}`}
                        >
                          <Image src={src} alt="" fill sizes="56px" className="object-contain p-1" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{data.sku ? `Part · ${data.sku}` : "Automotive Part"}</p>
                  <h2 className="mt-2 pr-8 text-2xl font-black leading-tight tracking-[-0.03em] text-ink">{data.name}</h2>

                  {rating && (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <StarRating rating={rating.average} /> {rating.average.toFixed(1)} ({rating.count})
                    </p>
                  )}

                  <p className="mt-4 text-3xl font-black tracking-[-0.03em] text-ink">{data.price !== null ? `$${Number(data.price).toFixed(2)}` : "Contact us for pricing"}</p>

                  {data.specs.length > 0 && (
                    <dl className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5 text-sm">
                      {data.specs.map((s) => (
                        <div key={s.name} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-4 py-2">
                          <dt className="text-muted-foreground">{s.name}</dt>
                          <dd className="min-w-0 break-words text-right font-semibold text-ink">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {data.amazonRedirect ? (
                      data.amazonUrl ? (
                        <a href={data.amazonUrl} rel="nofollow sponsored noopener noreferrer" target="_blank" className="cm-button-primary">
                          Buy on Amazon
                        </a>
                      ) : null
                    ) : data.available < 1 ? (
                      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700">Out of stock</span>
                    ) : (
                      <AddToCartButton action={addToCart.bind(null, data.id)} />
                    )}
                    <Link href={data.href} onClick={() => setOpen(false)} className="text-sm font-bold text-brand hover:underline">
                      Full details and fitment
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
