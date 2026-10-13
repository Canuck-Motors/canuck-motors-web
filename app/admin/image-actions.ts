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

export type UploadResult = { ok: boolean; message: string };

export async function uploadProductImages(
  productId: number,
  formData: FormData
): Promise<UploadResult> {
  try {
    return await doUpload(productId, formData);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Upload failed." };
  }
}

async function doUpload(productId: number, formData: FormData): Promise<UploadResult> {
  const supabase = await requireStaff();

  const { data: product } = await supabase
    .from("products")
    .select("id, sku")
    .eq("id", productId)
    .maybeSingle();
  if (!product?.sku) throw new Error("Product not found or it has no SKU.");

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, message: "Choose at least one photo." };

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
    if (up.error) {
      throw new Error(
        /bucket not found/i.test(up.error.message)
          ? 'The storage bucket "product-images" does not exist in Supabase.'
          : /row-level security|policy|not authorized|unauthorized/i.test(up.error.message)
            ? "Storage permission missing. Run database/product_images.sql in the Supabase SQL editor."
            : up.error.message
      );
    }

    const ins = await supabase
      .from("product_images")
      .insert({ product_id: productId, path, sort_order: order++ });
    if (ins.error) throw new Error(ins.error.message);
  }

  revalidatePath("/admin/images");
  revalidatePath(`/admin/images/${productId}`);
  revalidatePath("/product/[slug]", "page");
  return { ok: true, message: `${files.length} photo${files.length === 1 ? "" : "s"} uploaded.` };
}

export async function deleteProductImage(imageId: number) {
  const supabase = await requireStaff();

  const { data: img } = await supabase
    .from("product_images")
    .select("id, product_id, path")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return;

  const del = await supabase.from("product_images").delete().eq("id", imageId).select("id");
  if (del.error) throw new Error(del.error.message);
  if (!del.data?.length) {
    throw new Error("The photo was not deleted (database permission). Run database/product_images.sql in Supabase.");
  }
  await supabase.storage.from(IMAGE_BUCKET).remove([img.path]);

  revalidatePath("/admin/images");
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

// Files are uploaded straight from the browser to Supabase Storage (no size limit
// from the Next.js server); this just records them for the product.
export async function registerUploadedImages(
  productId: number,
  paths: string[]
): Promise<UploadResult> {
  try {
    const supabase = await requireStaff();

    const { data: product } = await supabase
      .from("products")
      .select("id, sku")
      .eq("id", productId)
      .maybeSingle();
    if (!product?.sku) throw new Error("Product not found or it has no SKU.");

    const folder = folderOf(product.sku);
    const safe = paths.filter((p) => p.startsWith(`${folder}/`) && !p.includes(".."));
    if (!safe.length) throw new Error("No valid files to save.");

    const { data: last } = await supabase
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    let order = (last?.sort_order ?? -1) + 1;

    for (const path of safe) {
      const ins = await supabase
        .from("product_images")
        .insert({ product_id: productId, path, sort_order: order++ });
      if (ins.error) throw new Error(ins.error.message);
    }

    revalidatePath("/admin/images");
  revalidatePath(`/admin/images/${productId}`);
    revalidatePath("/product/[slug]", "page");
    return { ok: true, message: `${safe.length} photo${safe.length === 1 ? "" : "s"} uploaded.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save the photos." };
  }
}

// Move a photo one place earlier (-1) or later (+1). The first photo is the main one.
export async function moveProductImage(imageId: number, direction: -1 | 1) {
  const supabase = await requireStaff();

  const { data: img } = await supabase
    .from("product_images")
    .select("id, product_id")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return;

  const { data: list } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", img.product_id)
    .order("sort_order")
    .order("id");
  const ids = (list ?? []).map((r) => r.id);

  const from = ids.indexOf(imageId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];

  for (const [i, id] of ids.entries()) {
    const { error } = await supabase.from("product_images").update({ sort_order: i }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/admin/images/${img.product_id}`);
  revalidatePath("/product/[slug]", "page");
}

// New order of a product's photos (first = main). ids must belong to the product.
export async function reorderProductImages(productId: number, ids: number[]) {
  const supabase = await requireStaff();
  const { data: list } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId);
  const valid = new Set((list ?? []).map((r) => r.id));
  const ordered = ids.filter((id) => valid.has(id));

  for (const [i, id] of ordered.entries()) {
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: i })
      .eq("id", id)
      .eq("product_id", productId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/images");
  revalidatePath(`/admin/images/${productId}`);
  revalidatePath("/product/[slug]", "page");
}
