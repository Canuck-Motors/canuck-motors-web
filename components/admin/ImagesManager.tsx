"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, EyeOff, Search, UploadCloud, X } from "lucide-react";
import { setProductsVisibility } from "@/app/admin/actions";
import { imageUrl } from "@/lib/product-images";
import { uploadProductImageFiles } from "@/lib/upload-product-images";

export type ImageProductRow = {
  id: number;
  name: string;
  sku: string;
  isActive: boolean;
  imageCount: number;
  thumb: string | null;
};

type Filter = "all" | "none" | "one" | "many";
type SortKey = "sku" | "name" | "photos";
const PAGE = 50;

// "CM1044H-2.jpg" -> sku CM1044H, position 2. Matches the longest known SKU at the start of the name.
function matchSku(fileName: string, skus: Map<string, ImageProductRow>) {
  const stem = fileName.replace(/\.[A-Za-z0-9]+$/, "");
  const lower = stem.toLowerCase();
  let best: ImageProductRow | null = null;
  for (const [sku, row] of skus) {
    if (
      (lower === sku || (lower.startsWith(sku) && /^[-_ ()]*\d*\)?$/.test(lower.slice(sku.length)))) &&
      (!best || sku.length > best.sku.length)
    ) {
      best = row;
    }
  }
  const pos = Number(stem.slice(best ? best.sku.length : 0).replace(/\D/g, "")) || 0;
  return { row: best, pos };
}

type Item = { f: File; path: string };

// Folder name -> product: "1012H" or "CM1012H" both find SKU CM1012H. Nearest folder wins.
function matchFolder(path: string, skus: Map<string, ImageProductRow>) {
  const parts = path.split("/").slice(0, -1).reverse();
  for (const part of parts) {
    const name = part.trim().toLowerCase();
    if (!name) continue;
    const hit = skus.get(name) ?? skus.get("cm" + name) ?? skus.get(name.replace(/^cm/, ""));
    if (hit) return hit;
  }
  return null;
}

type DirEntry = {
  isFile: boolean;
  isDirectory: boolean;
  fullPath: string;
  file?: (ok: (f: File) => void, fail: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (e: DirEntry[]) => void, fail: (e: unknown) => void) => void };
};

// Reads dropped files AND dropped folders (any depth).
async function readDropped(dt: DataTransfer): Promise<Item[]> {
  const out: Item[] = [];
  const walk = async (entry: DirEntry) => {
    if (entry.isFile && entry.file) {
      const f = await new Promise<File>((ok, fail) => entry.file!(ok, fail));
      out.push({ f, path: entry.fullPath.replace(/^\//, "") });
    } else if (entry.isDirectory && entry.createReader) {
      const reader = entry.createReader();
      for (;;) {
        const batch = await new Promise<DirEntry[]>((ok, fail) => reader.readEntries(ok, fail));
        if (!batch.length) break;
        for (const child of batch) await walk(child);
      }
    }
  };
  const entries: DirEntry[] = [];
  for (const i of Array.from(dt.items)) {
    const e = i.webkitGetAsEntry?.();
    if (e) entries.push(e as unknown as DirEntry);
  }
  if (entries.length) {
    for (const e of entries) await walk(e);
  } else {
    for (const f of Array.from(dt.files)) out.push({ f, path: f.name });
  }
  return out.filter((x) => x.f.type.startsWith("image/"));
}

export default function ImagesManager({ initial }: { initial: ImageProductRow[] }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "sku", dir: 1 });
  const [limit, setLimit] = useState(PAGE);
  const [msg, setMsg] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ text: string; unmatched: string[] } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      none: rows.filter((r) => r.imageCount === 0).length,
      one: rows.filter((r) => r.imageCount === 1).length,
      many: rows.filter((r) => r.imageCount >= 2).length,
    }),
    [rows]
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (filter === "none" && r.imageCount !== 0) return false;
      if (filter === "one" && r.imageCount !== 1) return false;
      if (filter === "many" && r.imageCount < 2) return false;
      return !term || `${r.sku} ${r.name}`.toLowerCase().includes(term);
    });
    const val = (r: ImageProductRow) =>
      sort.key === "sku" ? r.sku.toLowerCase() : sort.key === "name" ? r.name.toLowerCase() : r.imageCount;
    return list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [rows, q, filter, sort]);

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="px-4 py-3">
      <button type="button" onClick={() => sortBy(k)} className="inline-flex items-center gap-1 uppercase hover:text-brand">
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  const hideNoPhoto = () => {
    const ids = rows.filter((r) => r.imageCount === 0 && r.isActive).map((r) => r.id);
    if (!ids.length) {
      setMsg("Every visible product already has a photo.");
      return;
    }
    if (!window.confirm(`Hide ${ids.length} visible product(s) that have no photo from the website?`)) return;
    start(async () => {
      try {
        await setProductsVisibility(ids, false);
        const set = new Set(ids);
        setRows((rs) => rs.map((r) => (set.has(r.id) ? { ...r, isActive: false } : r)));
        setMsg(`${ids.length} product${ids.length === 1 ? "" : "s"} without photos hidden from the website.`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Could not hide the products.");
      }
    });
  };

  const exportMissing = () => {
    const lines = rows
      .filter((r) => r.imageCount === 0)
      .map((r) => `"${r.sku}","${r.name.replaceAll('"', '""')}",${r.isActive ? "Visible" : "Hidden"}`);
    const blob = new Blob([["SKU,Name,Website", ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `products-without-photos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const bulkUpload = (items: Item[]) => {
    const skus = new Map(rows.map((r) => [r.sku.toLowerCase(), r]));
    const groups = new Map<number, { row: ImageProductRow; files: { f: File; pos: number }[] }>();
    const unmatched: string[] = [];

    for (const { f, path } of items) {
      // 1) file name starts with the part number (CM1044H-1.jpg), 2) otherwise the folder name is the part number
      let { row, pos } = matchSku(f.name, skus);
      if (!row) {
        row = matchFolder(path, skus);
        pos = 0;
      }
      if (!row) {
        unmatched.push(path.includes("/") ? path : f.name);
        continue;
      }
      const g = groups.get(row.id) ?? { row, files: [] };
      g.files.push({ f, pos });
      groups.set(row.id, g);
    }

    start(async () => {
      let photos = 0;
      let done = 0;
      const failed: string[] = [];
      for (const { row, files: list } of groups.values()) {
        setBulk({ text: `Uploading ${++done} of ${groups.size}: ${row.sku}...`, unmatched });
        list.sort(
          (a, b) => a.pos - b.pos || a.f.name.localeCompare(b.f.name, undefined, { numeric: true })
        );
        try {
          const r = await uploadProductImageFiles(row.id, row.sku, list.map((x) => x.f));
          if (!r.ok) throw new Error(r.message);
          photos += list.length;
          setRows((rs) =>
            rs.map((x) => (x.id === row.id ? { ...x, imageCount: x.imageCount + list.length } : x))
          );
        } catch (e) {
          failed.push(`${row.sku}: ${e instanceof Error ? e.message : "failed"}`);
        }
      }
      setBulk({
        text: `${photos} photo${photos === 1 ? "" : "s"} uploaded for ${groups.size - failed.length} product${
          groups.size - failed.length === 1 ? "" : "s"
        }.${failed.length ? ` Failed: ${failed.join("; ")}` : ""}`,
        unmatched,
      });
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const tabs: [Filter, string][] = [
    ["all", "All"],
    ["none", "No photos"],
    ["one", "1 photo"],
    ["many", "2+ photos"],
  ];

  return (
    <div className="space-y-5">
      {/* Bulk upload */}
      <section
        className="rounded-2xl border-2 border-dashed border-black/15 bg-white p-5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const items = await readDropped(e.dataTransfer);
          if (items.length) bulkUpload(items);
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <UploadCloud className="h-8 w-8 text-brand" aria-hidden="true" />
          <div className="min-w-[240px] flex-1">
            <p className="font-bold text-ink">Bulk upload photos</p>
            <p className="text-sm text-muted-foreground">
              Drop many photos <strong>or a whole folder</strong> here. Either name each file with the part number,
              e.g. <code>CM1044H-1.jpg</code>, or put each product&apos;s photos in a folder named with the part number
              (<code>1044H</code> or <code>CM1044H</code>). Photos go to the matching product, in name order.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) bulkUpload(files.map((f) => ({ f, path: f.name })));
            }}
            className="text-sm"
          />
          <label className="cursor-pointer rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand">
            Choose a folder
            <input
              type="file"
              className="hidden"
              disabled={pending}
              multiple
              // @ts-expect-error webkitdirectory is not in React's types but works in every browser
              webkitdirectory=""
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
                if (files.length) {
                  bulkUpload(files.map((f) => ({ f, path: f.webkitRelativePath || f.name })));
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {bulk && (
          <div className="mt-3 text-sm">
            <p className="font-semibold text-ink">{bulk.text}</p>
            {bulk.unmatched.length > 0 && (
              <p className="mt-1 text-red-600">
                No matching part number for {bulk.unmatched.length} file{bulk.unmatched.length === 1 ? "" : "s"}:{" "}
                {bulk.unmatched.slice(0, 8).join(", ")}
                {bulk.unmatched.length > 8 && "..."}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[260px] flex-1 items-center rounded-full border border-black/10 bg-white px-4 shadow-sm focus-within:border-brand/60">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search part number or name"
            aria-label="Search products"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={exportMissing}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download no-photo list
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={hideNoPhoto}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-brand disabled:opacity-60"
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" /> Hide all products with no photos
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setLimit(PAGE);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === key
                ? "bg-ink text-white"
                : "border border-black/10 bg-white text-ink hover:border-brand hover:text-brand"
            }`}
          >
            {label} <span className="opacity-60">{counts[key]}</span>
          </button>
        ))}
      </div>

      {msg && (
        <p role="status" className="rounded-lg bg-black/5 px-4 py-2.5 text-sm font-medium text-ink">
          {msg}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs tracking-wide text-muted-foreground">
            <tr>
              <th className="w-16 px-4 py-3" />
              <SortHead k="sku">Part number</SortHead>
              <SortHead k="name">Name</SortHead>
              <SortHead k="photos">Photos</SortHead>
              <th className="px-4 py-3 uppercase">Website</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, limit).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">
                  {p.thumb ? (
                    <Image
                      src={imageUrl(p.thumb)}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-lg border object-contain"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed bg-amber-50 text-[10px] font-bold text-amber-800">
                      None
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-medium text-ink">{p.sku}</td>
                <td className="px-4 py-2.5">{p.name}</td>
                <td className="px-4 py-2.5">
                  {p.imageCount ? p.imageCount : <span className="font-semibold text-brand">None</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      p.isActive ? "bg-green-100 text-green-800" : "bg-black/10 text-ink/70"
                    }`}
                  >
                    {p.isActive ? "Visible" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/admin/images/${p.id}`} className="font-bold text-brand hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {shown.length > limit && (
          <div className="border-t p-4 text-center">
            <button
              type="button"
              onClick={() => setLimit(Infinity)}
              className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              Show all ({shown.length - limit} more)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
