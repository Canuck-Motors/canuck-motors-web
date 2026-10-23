"use client";

import { useRef, useState, useTransition } from "react";
import { uploadProductImageFiles } from "@/lib/upload-product-images";

export default function ImageUploadForm({
  productId,
  sku,
}: {
  productId: number;
  sku: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [over, setOver] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = (files: File[]) => {
    if (!files.length) return;
    start(async () => {
      setResult(null);
      try {
        const r = await uploadProductImageFiles(productId, sku, files);
        setResult(r);
        if (r.ok && inputRef.current) inputRef.current.value = "";
      } catch (err) {
        setResult({ ok: false, message: err instanceof Error ? err.message : "Upload failed." });
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(Array.from(inputRef.current?.files ?? []));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        send(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
      }}
      className={`rounded-2xl border-2 border-dashed p-4 transition ${
        over ? "border-brand bg-brand-tint" : "border-black/15 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          required
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
        />
        <button disabled={pending} className="cm-button-primary disabled:opacity-60">
          {pending ? "Uploading..." : "Upload photos"}
        </button>
        <span className="text-xs text-muted-foreground">
          Or drag photos here. JPG, PNG or WebP; large photos are shrunk automatically.
        </span>
      </div>
      {result && (
        <p
          role="status"
          className={`mt-3 text-sm font-semibold ${result.ok ? "text-green-700" : "text-red-600"}`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
