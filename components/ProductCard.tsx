import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type ProductCardProps = {
  product: {
    id: number;
    product_name: string;
    price: number | null;
    slug?: string | null;
    title_tag?: string | null;
    sku?: string | null;
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const productUrl = product.slug
    ? `/product/${product.slug}`
    : `/product/${product.id}`;

  return (
    <article className="group relative overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.11)]">
      <Link
        href={productUrl}
        className="block"
        aria-label={`View ${product.product_name}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(145deg,#fafafa,#f3f3f3)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(249,115,22,0.13),transparent_28%)] opacity-0 transition duration-300 group-hover:opacity-100" />
          <div className="absolute left-4 top-4 rounded-full border border-black/5 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink shadow-sm backdrop-blur">
            Canuck Motors
          </div>
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/15 bg-brand-tint text-lg font-black text-brand">
                CM
              </div>
              <div className="mt-3 text-sm font-semibold text-ink/70">
                Product image
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Coming soon
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            {product.sku ? `Part · ${product.sku}` : "Automotive Part"}
          </p>

          <h2 className="mt-2 line-clamp-2 min-h-[52px] text-lg font-bold leading-6 tracking-[-0.02em] text-ink">
            {product.product_name}
          </h2>

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
    </article>
  );
}
