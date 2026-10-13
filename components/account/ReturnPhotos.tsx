"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shrink } from "@/lib/upload-product-images";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Customers attach photos (damage, wrong part...). They are stored privately and shown to staff.
export default function ReturnPhotos({ orderId }: { orderId: string }) {
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: File[]) => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Please sign in again.");

      let done = 0;
      for (const [i, original] of files.slice(0, 4).entries()) {
        const file = EXT[original.type] ? await shrink(original) : original;
        const ext = EXT[file.type];
        if (!ext) throw new Error(`${original.name}: only JPG, PNG or WebP photos.`);
        const path = `${data.user.id}/${orderId}/${Date.now()}-${i}.${ext}`;
        const { error: err } = await supabase.storage
          .from("return-photos")
          .upload(path, file, { contentType: file.type });
        if (err) throw new Error("Could not upload the photo. Please try again.");
        done++;
      }
      setCount((c) => c + done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-semibold text-ink">
        Photos (optional, up to 4)
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) upload(files);
            e.target.value = "";
          }}
          className="mt-1 block w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal"
        />
      </label>
      {busy && <p className="mt-1 text-xs text-muted-foreground">Uploading...</p>}
      {count > 0 && !busy && (
        <p className="mt-1 text-xs font-semibold text-green-700">
          {count} photo{count === 1 ? "" : "s"} attached.
        </p>
      )}
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
