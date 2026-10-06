import Link from "next/link";

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
    ? \`/product/\${product.slug}\`
    : \`/product/\${product.id}\`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={productUrl}
        className="block"
        aria-label={\`View \${product.product_name}\`}
      >
        <div className="relative aspect-[4/3] bg-secondary">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground">
                Product Image
              </div>
              <div className="mt-1 text-xs text-muted-foreground/60">
                Coming soon
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.sku ? \`Canuck Motors · \${product.sku}\` : "Canuck Motors"}
          </p>

          <h2 className="mt-2 line-clamp-2 min-h-[48px] text-base font-semibold leading-6 text-ink">
            {product.product_name}
          </h2>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              {product.price !== null ? (
                <p className="text-xl font-bold text-ink">
                  $\{Number(product.price).toFixed(2)}
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  Contact for price
                </p>
              )}
            </div>

            <span className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition group-hover:bg-brand">
              View
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
