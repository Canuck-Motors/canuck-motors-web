import { isPlainPhoto } from "@/lib/plain-photos";
import Image from "next/image";
import { withMaterial } from "@/lib/material";
import Link from "next/link";
import { boxFirst, imageUrl, isVideo } from "@/lib/product-images";
import { ArrowUpRight } from "lucide-react";
import StarRating from "@/components/StarRating";
import QuickView from "@/components/product/QuickView";
import { ratingForSku } from "@/lib/amazon-reviews";

type ProductCardProps = {
  product: {
    id: number;
    product_name: string;
    price: number | null;
    slug?: string | null;
    title_tag?: string | null;
    sku?: string | null;
    position?: string | null;
    product_images?: { path: string; sort_order: number }[] | null;
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const productUrl = product.slug
    ? `/product/${product.slug}`
    : `/product/${product.id}`;

  // Main photo = lowest sort_order
  const main = boxFirst(
    (product.product_images ?? []).filter((i) => !isVideo(i.path)).sort((a, b) => a.sort_order - b.sort_order),
  )[0];

  return (
    <article className="group relative overflow-hidden rounded-[26px] bg-white ring-1 ring-black/[0.04] cm-card-shadow transition duration-300 hover:-translate-y-1.5 hover:ring-brand/20">
      <Link
        href={productUrl}
        className="block"
        aria-label={`View ${withMaterial(product.product_name, product.sku)}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden cm-photo-stage">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(214,40,40,0.10),transparent_28%)] opacity-0 transition duration-300 group-hover:opacity-100" />
          <div className="absolute left-4 top-4 z-10 rounded-full border border-black/5 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink shadow-sm backdrop-blur">
            Canuck Motors
          </div>
          {main ? (
            <Image
              src={imageUrl(main.path)}
              alt={withMaterial(product.product_name, product.sku)}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className={`cm-photo ${isPlainPhoto(product.sku) ? "cm-photo-plain" : ""} object-contain p-4 transition duration-300 group-hover:scale-105`}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/15 bg-brand-tint text-lg font-black text-brand">
                  CM
                </div>
                <div className="mt-3 text-sm font-semibold text-ink/70">
                  Photo coming soon
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 md:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            {product.sku ? `Part · ${product.sku}` : "Automotive Part"}
          </p>

          <h2 className="mt-2 line-clamp-2 min-h-[52px] text-lg font-bold leading-6 tracking-[-0.02em] text-ink">
            {withMaterial(product.product_name, product.sku)}
          </h2>

          {(() => {
            const rating = ratingForSku(product.sku);
            return rating ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <StarRating rating={rating.average} className="h-3.5 w-3.5" />
                <span>
                  {rating.average.toFixed(1)} ({rating.count})
                </span>
              </p>
            ) : null;
          })()}

          {product.position && (
            <p className="mt-3">
              <span className="inline-flex rounded-md bg-slate-500 px-2.5 py-1 text-xs font-bold text-white">
                Position: {product.position}
              </span>
            </p>
          )}

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Price
              </p>
              {product.price !== null ? (
                <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-ink">
                  ${Number(product.price).toFixed(2)}
                </p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Contact for price
                </p>
              )}
            </div>

            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition duration-300 group-hover:rotate-6 group-hover:bg-brand">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>

        <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100" />
      </Link>
      <QuickView productId={product.id} rating={ratingForSku(product.sku)} />
    </article>
  );
}
