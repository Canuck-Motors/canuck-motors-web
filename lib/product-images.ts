import { createPublicClient } from "@/lib/supabase/public";

export const IMAGE_BUCKET = "product-images";

export function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export type ProductImage = { id: number; path: string; url: string };

// Lowest sort_order is the main image
export async function getProductImages(productId: number): Promise<ProductImage[]> {
  const { data, error } = await createPublicClient()
    .from("product_images")
    .select("id, path")
    .eq("product_id", productId)
    .order("sort_order")
    .order("id");

  if (error) {
    console.error("Product images lookup failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({ id: r.id, path: r.path, url: imageUrl(r.path) }));
}
