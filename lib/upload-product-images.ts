"use client";

import { createClient } from "@/lib/supabase/client";
import { registerUploadedImages } from "@/app/admin/image-actions";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Big photos are shrunk in the browser (max 1600px, WebP) so any size can be uploaded.
export async function shrink(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.85));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
}

// Uploads straight from the browser to Supabase Storage, then records the files.
export async function uploadProductImageFiles(productId: number, sku: string, files: File[]) {
  const supabase = createClient();
  const folder = sku.replace(/[^A-Za-z0-9_-]/g, "");
  const paths: string[] = [];

  for (const [i, original] of files.entries()) {
    const file = EXT[original.type] ? await shrink(original) : original;
    const ext = EXT[file.type];
    if (!ext) throw new Error(`${original.name}: only JPG, PNG or WebP images are allowed.`);
    if (file.size > MAX_BYTES) throw new Error(`${original.name}: image is too large.`);

    const path = `${folder}/${folder}-${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });

    if (error) {
      throw new Error(
        /bucket not found/i.test(error.message)
          ? 'The storage bucket "product-images" does not exist in Supabase.'
          : /row-level security|policy|not authorized|unauthorized/i.test(error.message)
            ? "Storage permission missing. Run database/product_images.sql in the Supabase SQL editor."
            : error.message
      );
    }
    paths.push(path);
  }
  return registerUploadedImages(productId, paths);
}

// Upload one image (e.g. a category picture) and return its path in the bucket.
export async function uploadSingleImage(folder: string, name: string, original: File) {
  const supabase = createClient();
  const file = EXT[original.type] ? await shrink(original) : original;
  const ext = EXT[file.type];
  if (!ext) throw new Error("Only JPG, PNG or WebP images are allowed.");
  if (file.size > MAX_BYTES) throw new Error("Image is too large.");

  const safe = name.replace(/[^A-Za-z0-9_-]/g, "") || "image";
  const path = `${folder}/${safe}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) {
    throw new Error(
      /row-level security|policy|not authorized|unauthorized/i.test(error.message)
        ? "Storage permission missing. Run database/product_images.sql in the Supabase SQL editor."
        : error.message
    );
  }
  return path;
}
