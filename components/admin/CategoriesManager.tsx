"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { reorderCategories, saveCategory } from "@/app/admin/category-actions";
import { imageUrl } from "@/lib/product-images";
import { uploadSingleImage } from "@/lib/upload-product-images";

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number | null;
  imagePath: string | null;
  visibleProducts: number;
  totalProducts: number;
};

export default function CategoriesManager({
  initial,
  needsSql,
}: {
  initial: CategoryRow[];
  needsSql: boolean;
}) {
  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const newImage = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState("");

  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        setMsg({ ok: true, text: ok });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
      }
    });

  const patch = (id: number, p: Partial<CategoryRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const toggle = (r: CategoryRow) => {
    const next = !r.isActive;
    patch(r.id, { isActive: next });
    run(async () => {
      try {
        await saveCategory({ id: r.id, name: r.name, isActive: next });
      } catch (e) {
        patch(r.id, { isActive: r.isActive });
        throw e;
      }
    }, next ? `${r.name} is now ON (visible on the website).` : `${r.name} is now OFF (hidden from the website).`);
  };

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[index], next[to]] = [next[to], next[index]];
    const before = rows;
    setRows(next);
    run(async () => {
      try {
        await reorderCategories(next.map((r) => r.id));
      } catch (e) {
        setRows(before);
        throw e;
      }
    }, "Order saved.");
  };

  const setImage = (r: CategoryRow, file: File) =>
    run(async () => {
      const path = await uploadSingleImage("categories", r.slug, file);
      await saveCategory({ id: r.id, name: r.name, isActive: r.isActive, imagePath: path });
      patch(r.id, { imagePath: path });
    }, `Picture saved for ${r.name}.`);

  const input = "rounded-xl border border-black/10 px-3 py-2 text-sm";

  return (
    <div className="mt-8">
      {needsSql && (
        <p className="mb-4 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
          One setup step is missing: run <code>database/admin_categories.sql</code> in the Supabase SQL editor,
          then reload. Until then, changes here can&apos;t be saved.
        </p>
      )}

      <form
        action={() => {
          const name = newName.trim();
          if (!name) return;
          const file = newImage.current?.files?.[0] ?? null;
          run(async () => {
            const path = file ? await uploadSingleImage("categories", name, file) : null;
            await saveCategory({ id: null, name, isActive: true, imagePath: path });
            setNewName("");
            if (newImage.current) newImage.current.value = "";
          }, `${name} added. It appears on the website once it has a visible product.`);
        }}
        className="flex flex-wrap items-center gap-3 rounded-[22px] border border-black/5 bg-white p-4 shadow-sm"
      >
        <Plus className="h-5 w-5 text-brand" aria-hidden="true" />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          aria-label="New category name"
          required
          className={`${input} min-w-[220px] flex-1`}
        />
        <input
          ref={newImage}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Category picture (optional)"
          className="text-sm"
        />
        <button disabled={pending} className="cm-button-primary disabled:opacity-60">
          Add category
        </button>
      </form>

      {msg && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-semibold ${
            msg.ok ? "bg-black/5 text-ink" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <ul className={`mt-4 space-y-3 ${pending ? "opacity-70" : ""}`}>
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={`flex flex-wrap items-center gap-4 rounded-[22px] border border-black/5 p-4 shadow-sm ${
              r.isActive ? "bg-white" : "bg-black/[0.03]"
            }`}
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0 || pending}
                aria-label={`Move ${r.name} up`}
                className="rounded p-1 hover:text-brand disabled:opacity-25"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1 || pending}
                aria-label={`Move ${r.name} down`}
                className="rounded p-1 hover:text-brand disabled:opacity-25"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            {r.imagePath ? (
              <Image
                src={imageUrl(r.imagePath)}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-xl border object-contain"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed text-[10px] font-bold text-muted-foreground">
                No picture
              </span>
            )}

            <div className="min-w-[200px] flex-1">
              {editing === r.id ? (
                <form
                  action={(fd) => {
                    const name = String(fd.get("name") || "").trim();
                    if (!name) return;
                    run(async () => {
                      await saveCategory({ id: r.id, name, isActive: r.isActive });
                      patch(r.id, { name });
                      setEditing(null);
                    }, "Name saved.");
                  }}
                  className="flex gap-2"
                >
                  <input name="name" defaultValue={r.name} required autoFocus className={`${input} flex-1`} />
                  <button className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-white">Save</button>
                  <button type="button" onClick={() => setEditing(null)} className="text-xs underline">
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <p className="font-black text-ink">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /categories/{r.slug} · {r.visibleProducts} visible of {r.totalProducts} products
                    {r.isActive && r.visibleProducts === 0 && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                        empty - not shown yet
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                {r.imagePath ? "Change picture" : "Add picture"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setImage(r, f);
                    e.target.value = "";
                  }}
                />
              </label>
              {r.imagePath && (
                <button
                  type="button"
                  aria-label={`Remove picture of ${r.name}`}
                  onClick={() =>
                    run(async () => {
                      await saveCategory({ id: r.id, name: r.name, isActive: r.isActive, clearImage: true });
                      patch(r.id, { imagePath: null });
                    }, "Picture removed.")
                  }
                  className="rounded-full p-2 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(r.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Rename
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={r.isActive}
                aria-label={`Show ${r.name} on website`}
                onClick={() => toggle(r)}
                disabled={pending}
                className={`relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out disabled:opacity-60 ${
                  r.isActive ? "bg-emerald-500" : "bg-black/20"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                    r.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="w-8 text-xs font-bold text-muted-foreground">{r.isActive ? "ON" : "OFF"}</span>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted-foreground">No categories yet.</li>}
      </ul>
    </div>
  );
}
