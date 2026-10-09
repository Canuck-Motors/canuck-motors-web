"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_BUCKET } from "@/lib/product-images";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function requireStaff() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");
  if (error || !role) throw new Error("You are not authorized to perform this action.");
  return supabase;
}

const folderOf = (sku: string) => sku.replace(/[^A-Za-z0-9_-]/g, "");

export async function uploadProductImages(productId: number, formData: FormData) {
  const supabase = await requireStaff();

  const { data: product } = await supabase
    .from("products")
    .select("id, sku")
    .eq("id", productId)
    .maybeSingle();
  if (!product?.sku) throw new Error("Product not found or it has no SKU.");

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return;

  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let order = (last?.sort_order ?? -1) + 1;

  for (const file of files) {
    const ext = EXT[file.type];
    if (!ext) throw new Error(`${file.name}: only JPG, PNG or WebP images are allowed.`);
    if (file.size > MAX_BYTES) throw new Error(`${file.name}: image must be under 5 MB.`);

    const folder = folderOf(product.sku);
    const path = `${folder}/${folder}-${Date.now()}-${order}.${ext}`;

    const up = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
    });
    if (up.error) throw new Error(up.error.message);

    const ins = await supabase
      .from("product_images")
      .insert({ product_id: productId, path, sort_order: order++ });
    if (ins.error) throw new Error(ins.error.message);
  }

  revalidatePath(`/admin/images/${productId}`);
  revalidatePath("/product/[slug]", "page");
}

export async function deleteProductImage(imageId: number) {
  const supabase = await requireStaff();

  const { data: img } = await supabase
    .from("product_images")
    .select("id, product_id, path")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return;

  await supabase.storage.from(IMAGE_BUCKET).remove([img.path]);
  const del = await supabase.from("product_images").delete().eq("id", imageId);
  if (del.error) throw new Error(del.error.message);

  revalidatePath(`/admin/images/${img.product_id}`);
  revalidatePath("/product/[slug]", "page");
}

// The main image is the one with the lowest sort_order
export async function setMainImage(imageId: number) {
  const supabase = await requireStaff();

  const { data: img } = await supabase
    .from("product_images")
    .select("id, product_id")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return;

  const { data: first } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", img.product_id)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("product_images")
    .update({ sort_order: (first?.sort_order ?? 0) - 1 })
    .eq("id", imageId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/images/${img.product_id}`);
  revalidatePath("/product/[slug]", "page");
}
