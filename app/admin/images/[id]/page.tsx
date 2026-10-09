import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { imageUrl } from "@/lib/product-images";
import {
  deleteProductImage,
  setMainImage,
  uploadProductImages,
} from "@/app/admin/image-actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Manage Product Images",
  robots: { index: false, follow: false },
};

export default async function ProductImagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (!role) redirect("/");

  const { data: product } = await supabase
    .from("products")
    .select("id, product_name, sku")
    .eq("id", productId)
    .maybeSingle();
  if (!product) notFound();

  const { data: images } = await supabase
    .from("product_images")
    .select("id, path")
    .eq("product_id", productId)
    .order("sort_order")
    .order("id");

  return (
    <main className="cm-container space-y-6 py-10">
      <AdminNav />
      <Link href="/admin/images" className="text-sm font-semibold text-brand hover:underline">
        Back to all products
      </Link>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">{product.product_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Part number: {product.sku}</p>
      </div>

      <form
        action={uploadProductImages.bind(null, productId)}
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-4"
      >
        <input
          type="file"
          name="files"
          multiple
          required
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
        />
        <button className="cm-button-primary">Upload photos</button>
        <span className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB each.</span>
      </form>

      {images?.length ? (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="rounded-2xl border border-border bg-white p-3">
              <div className="relative aspect-square">
                <Image
                  src={imageUrl(img.path)}
                  alt={`${product.product_name} photo ${i + 1}`}
                  fill
                  sizes="240px"
                  className="object-contain"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                {i === 0 ? (
                  <span className="rounded-full bg-brand-tint px-3 py-1 font-bold text-brand">Main</span>
                ) : (
                  <form action={setMainImage.bind(null, img.id)}>
                    <button className="font-bold text-ink hover:text-brand">Make main</button>
                  </form>
                )}
                <form action={deleteProductImage.bind(null, img.id)}>
                  <button className="font-bold text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No photos yet. Upload the first one above.</p>
      )}
    </main>
  );
}
