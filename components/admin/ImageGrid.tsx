"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  deleteProductImage,
  reorderProductImages,
} from "@/app/admin/image-actions";

export type GridImage = { id: number; url: string };

export default function ImageGrid({
  productId,
  name,
  images,
}: {
  productId: number;
  name: string;
  images: GridImage[];
}) {
  const [items, setItems] = useState(images);
  useEffect(() => setItems(images), [images]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (next: GridImage[], before: GridImage[]) => {
    setItems(next);
    start(async () => {
      try {
        await reorderProductImages(productId, next.map((i) => i.id));
        setMsg("Order saved.");
      } catch (e) {
        setItems(before);
        setMsg(e instanceof Error ? e.message : "Could not save the order.");
      }
    });
  };

  const move = (id: number, to: number) => {
    const from = items.findIndex((i) => i.id === id);
    if (from < 0 || to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    save(next, items);
  };

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No photos yet. Upload the first one above.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag a photo to change the order. The first photo is the main one.
      </p>
      {msg && <p role="status" className="mb-3 text-sm font-semibold text-ink">{msg}</p>}
      <ul className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${pending ? "opacity-70" : ""}`}>
        {items.map((img, i) => (
          <li
            key={img.id}
            draggable
            onDragStart={() => setDragId(img.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId !== null) move(dragId, i);
              setDragId(null);
            }}
            className={`cursor-grab rounded-2xl border bg-white p-3 transition ${
              dragId === img.id ? "opacity-40" : "border-border"
            }`}
          >
            <div className="relative aspect-square">
              <Image
                src={img.url}
                alt={`${name} photo ${i + 1}`}
                fill
                sizes="240px"
                className="object-contain"
                draggable={false}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              {i === 0 ? (
                <span className="rounded-full bg-brand-tint px-3 py-1 font-bold text-brand">Main</span>
              ) : (
                <button
                  type="button"
                  onClick={() => move(img.id, 0)}
                  className="font-bold text-ink hover:text-brand"
                >
                  Make main
                </button>
              )}
              <span className="font-bold text-muted-foreground">
                {i + 1} of {items.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm("Delete this photo? This cannot be undone.")) return;
                  start(async () => {
                    try {
                      await deleteProductImage(img.id);
                      setItems((cur) => cur.filter((x) => x.id !== img.id));
                    } catch (e) {
                      setMsg(e instanceof Error ? e.message : "Could not delete the photo.");
                    }
                  });
                }}
                className="font-bold text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
            <div className="mt-2 flex justify-center gap-2 text-xs">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(img.id, i - 1)}
                aria-label="Move earlier"
                className="rounded-full border px-3 py-1 font-bold hover:border-brand hover:text-brand disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                disabled={i === items.length - 1}
                onClick={() => move(img.id, i + 1)}
                aria-label="Move later"
                className="rounded-full border px-3 py-1 font-bold hover:border-brand hover:text-brand disabled:opacity-30"
              >
                →
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
