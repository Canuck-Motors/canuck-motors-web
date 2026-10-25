import { addToCart } from "@/app/cart/actions";
import AddToCartButton from "@/components/AddToCartButton";
import { createClient } from "@/lib/supabase/server";
import { isAmazonRedirectOn } from "@/lib/fulfillment-mode";

// Shows the Add to Cart button only when the part is in stock.
// Read live (not from the cached page) so stock changes show up right away.
export default async function AddToCartSlot({
  productId,
  amazonUrl,
}: {
  productId: number;
  amazonUrl?: string | null;
}) {
  if (await isAmazonRedirectOn()) {
    return amazonUrl ? (
      <a
        href={amazonUrl}
        rel="nofollow sponsored noopener noreferrer"
        target="_blank"
        className="cm-button-primary"
      >
        Buy on Amazon
      </a>
    ) : (
      <span className="inline-flex rounded-full border px-6 py-3 text-sm font-bold text-muted-foreground">
        Not available online right now
      </span>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("inventory(quantity, reserved_quantity, is_active)")
    .eq("id", productId)
    .maybeSingle();

  const inv = Array.isArray(data?.inventory) ? data?.inventory[0] : data?.inventory;
  const available = inv?.is_active
    ? Math.max(0, Number(inv.quantity ?? 0) - Number(inv.reserved_quantity ?? 0))
    : 0;

  if (available < 1) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-6 py-3 text-sm font-bold text-red-700">
        Out of stock
      </span>
    );
  }

  return <AddToCartButton action={addToCart.bind(null, productId)} />;
}
