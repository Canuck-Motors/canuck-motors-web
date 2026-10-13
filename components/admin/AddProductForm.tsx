"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addSingleProduct } from "@/app/admin/inventory/import/product-actions";
import { updateProduct } from "@/app/admin/actions";
import { uploadProductImageFiles } from "@/lib/upload-product-images";

export default function AddProductForm({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-normal";

  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-black text-ink">Add one product</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            For a single new part. Add photos now or later. It starts hidden unless you tick &quot;Show on the website&quot;.
          </p>
        </div>
      </div>

      <form
        action={(fd) =>
          start(async () => {
            setMsg(null);
            const r = await addSingleProduct(fd);
            if (!r.ok || !r.productId) {
              setMsg({ ok: false, text: r.message });
              return;
            }
            const files = (fd.getAll("photos") as File[]).filter((f) => f.size > 0);
            const sku = String(fd.get("sku") || "").trim();
            try {
              if (files.length) {
                const up = await uploadProductImageFiles(r.productId, sku, files);
                if (!up.ok) throw new Error(up.message);
              }
              if (fd.get("show") === "on") {
                await updateProduct(r.productId, {
                  name: String(fd.get("name") || "").trim(),
                  description: String(fd.get("description") || "").trim(),
                  price: Number(fd.get("price")),
                  isActive: true,
                });
              }
            } catch (e) {
              setMsg({
                ok: false,
                text: `Product added, but: ${e instanceof Error ? e.message : "photo upload failed"}. Add photos on the next page.`,
              });
              router.push(`/admin/images/${r.productId}`);
              return;
            }
            setMsg({ ok: true, text: "Product added." });
            router.push(`/admin/inventory/${r.productId}`);
          })
        }
        className="mt-5 grid gap-4 md:grid-cols-2"
      >
        <label className="text-sm font-semibold text-ink">
          Part number (SKU)
          <input name="sku" required className={input} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Name
          <input name="name" required className={input} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Price (CAD)
          <input name="price" type="number" step="0.01" min={0} required className={input} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Starting stock
          <input name="quantity" type="number" min={0} defaultValue={0} className={input} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Category
          <select name="category" className={input}>
            <option value="">(none)</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink md:col-span-2">
          Description
          <textarea name="description" rows={4} className={input} />
        </label>
        <label className="text-sm font-semibold text-ink md:col-span-2">
          Photos (optional)
          <input
            name="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full rounded-xl border border-black/10 bg-secondary/50 px-3 py-2.5 text-sm font-normal"
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            JPG, PNG or WebP. The first photo is the main one; large photos are shrunk automatically.
          </span>
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold text-ink md:col-span-2">
          <input type="checkbox" name="show" className="h-5 w-5 accent-[#d62828]" />
          Show on the website right away (leave off to review it first)
        </label>
        <div className="md:col-span-2">
          <button disabled={pending} className="cm-button-primary disabled:opacity-60">
            {pending ? "Adding..." : "Add product"}
          </button>
          {msg && (
            <span className={`ml-4 text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
