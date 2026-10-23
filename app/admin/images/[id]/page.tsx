import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import ImageGrid from "@/components/admin/ImageGrid";
import ImageUploadForm from "@/components/admin/ImageUploadForm";
import { imageUrl } from "@/lib/product-images";

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

      <ImageUploadForm productId={productId} sku={product.sku ?? ""} />

      <ImageGrid
        productId={productId}
        name={product.product_name ?? ""}
        images={(images ?? []).map((img) => ({ id: img.id, url: imageUrl(img.path) }))}
      />
    </main>
  );
}
