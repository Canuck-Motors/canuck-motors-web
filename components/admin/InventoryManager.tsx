"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Pencil, Search, X } from "lucide-react";
import {
  setInventoryQuantity,
  setProductsVisibility,
  updateProduct,
} from "@/app/admin/actions";
import { imageUrl } from "@/lib/product-images";

export type InventoryRow = {
  id: number;
  name: string;
  sku: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: number | null;
  thumb: string | null;
  imageCount: number;
  quantity: number;
  reserved: number;
  lowStock: number;
};

type Filter = "all" | "visible" | "hidden" | "noimage" | "low" | "out";
type SortKey = "name" | "price" | "stock";
const PAGE = 50;

const avail = (r: InventoryRow) => r.quantity - r.reserved;
const isOut = (r: InventoryRow) => avail(r) <= 0;
const isLow = (r: InventoryRow) => avail(r) > 0 && avail(r) <= r.lowStock;

export default function InventoryManager({
  initial,
  categories,
  initialFilter = "all",
}: {
  initial: InventoryRow[];
  categories: { id: number; name: string }[];
  initialFilter?: Filter;
}) {
  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const counts = useMemo(
    () => ({
      all: rows.length,
      visible: rows.filter((r) => r.isActive).length,
      hidden: rows.filter((r) => !r.isActive).length,
      noimage: rows.filter((r) => r.imageCount === 0).length,
      low: rows.filter(isLow).length,
      out: rows.filter(isOut).length,
    }),
    [rows]
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
    const list = rows.filter((r) => {
      if (filter === "visible" && !r.isActive) return false;
      if (filter === "hidden" && r.isActive) return false;
      if (filter === "noimage" && r.imageCount > 0) return false;
      if (filter === "low" && !isLow(r)) return false;
      if (filter === "out" && !isOut(r)) return false;
      if (category && String(r.categoryId) !== category) return false;
      if (!term) return true;
      const hay = `${r.name} ${r.sku}`.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      return term.split(/\s+/).every((t) => hay.includes(t));
    });
    if (sort) {
      const val = (r: InventoryRow) =>
        sort.key === "name" ? r.name.toLowerCase() : sort.key === "price" ? r.price : avail(r);
      list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
    }
    return list;
  }, [rows, q, filter, category, sort]);

  const patch = (id: number, p: Partial<InventoryRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const run = (fn: () => Promise<void>, ok?: string) =>
    start(async () => {
      try {
        await fn();
        setMsg(ok ?? null);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  const toggleHidden = (r: InventoryRow) => {
    const next = !r.isActive;
    patch(r.id, { isActive: next });
    run(async () => {
      try {
        await updateProduct(r.id, {
          name: r.name,
          description: r.description,
          price: r.price,
          isActive: next,
        });
      } catch (e) {
        patch(r.id, { isActive: r.isActive });
        throw e;
      }
    }, next ? `${r.sku} is now visible on the website.` : `${r.sku} is now hidden from the website.`);
  };

  const toggleOne = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const toggleAllShown = () =>
    setSelected(allShownSelected ? new Set() : new Set(shown.map((r) => r.id)));

  const bulkVisibility = (hide: boolean) => {
    const ids = [...selected];
    if (!ids.length) return;
    const before = rows;
    setRows((rs) => rs.map((r) => (selected.has(r.id) ? { ...r, isActive: !hide } : r)));
    run(async () => {
      try {
        await setProductsVisibility(ids, !hide);
        setSelected(new Set());
      } catch (e) {
        setRows(before);
        throw e;
      }
    }, `${ids.length} product${ids.length === 1 ? "" : "s"} ${hide ? "hidden from" : "shown on"} the website.`);
  };

  const downloadCsv = () => {
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    };
    const catName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "";
    const lines = shown.map((r) =>
      [r.sku, r.name, catName(r.categoryId), r.price.toFixed(2), r.quantity, r.reserved, avail(r), r.lowStock, r.isActive ? "Visible" : "Hidden", r.imageCount]
        .map(esc)
        .join(",")
    );
    const head = "SKU,Name,Category,Price,On hand,Reserved,Available,Low-stock level,Website,Photos";
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sortBy = (key: SortKey) =>
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="px-5 py-4 font-semibold text-ink">
      <button type="button" onClick={() => sortBy(k)} className="inline-flex items-center gap-1 hover:text-brand">
        {children}
        {sort?.key === k && (sort.dir === 1 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
      </button>
    </th>
  );

  const tabs: [Filter, string][] = [
    ["all", "All"],
    ["visible", "Visible"],
    ["hidden", "Hidden"],
    ["low", "Low stock"],
    ["out", "Out of stock"],
    ["noimage", "No image"],
  ];

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[260px] flex-1 items-center rounded-full border border-black/10 bg-white px-4 shadow-sm focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search by name or SKU..."
            aria-label="Search products"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(PAGE);
          }}
          aria-label="Filter by category"
          className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white">
          <span className="font-semibold">{selected.size} selected</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => bulkVisibility(true)}
            className="rounded-full bg-brand px-4 py-1.5 font-bold disabled:opacity-60"
          >
            Hide
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => bulkVisibility(false)}
            className="rounded-full bg-white px-4 py-1.5 font-bold text-ink disabled:opacity-60"
          >
            Show
          </button>

          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto underline">
            Clear
          </button>
        </div>
      )}

      {msg && (
        <p role="status" className="mt-3 rounded-lg bg-black/5 px-4 py-2.5 text-sm font-medium text-ink">
          {msg}
        </p>
      )}

      <div
        className={`mt-4 overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_16px_46px_rgba(0,0,0,0.06)] ${
          pending ? "opacity-70" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="w-10 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleAllShown}
                    aria-label="Select all shown products"
                    className="h-4 w-4 accent-[#d62828]"
                  />
                </th>
                <SortHead k="name">Part</SortHead>
                <SortHead k="price">Price</SortHead>
                <SortHead k="stock">Stock</SortHead>
                <th className="px-5 py-4 font-semibold text-ink">Hide on website</th>
                <th className="px-5 py-4 font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.slice(0, limit).map((r) => {
                const available = avail(r);
                return (
                  <tr key={r.id} className={r.isActive ? "" : "bg-black/[0.03]"}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        aria-label={`Select ${r.sku}`}
                        className="h-4 w-4 accent-[#d62828]"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {r.thumb ? (
                          <Image
                            src={imageUrl(r.thumb)}
                            alt=""
                            width={44}
                            height={44}
                            className="h-11 w-11 shrink-0 rounded-lg border object-contain"
                          />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed bg-amber-50 text-[10px] font-bold text-amber-800">
                            No photo
                          </span>
                        )}
                        <div>
                          <div className="font-medium text-ink">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.sku} · {r.imageCount} photo{r.imageCount === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink">${r.price.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <form
                        action={(fd) =>
                          run(async () => {
                            const n = Number(fd.get("quantity"));
                            await setInventoryQuantity(r.id, n, "Admin inventory adjustment");
                            patch(r.id, { quantity: n });
                          }, `Stock saved for ${r.sku}.`)
                        }
                        className="flex items-center gap-2"
                      >
                        <input
                          name="quantity"
                          type="number"
                          min={0}
                          defaultValue={r.quantity}
                          key={r.quantity}
                          aria-label={`Stock for ${r.sku}`}
                          className="w-20 rounded-lg border px-2 py-1.5"
                        />
                        <button className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand">
                          Save
                        </button>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            available <= 0
                              ? "bg-red-100 text-red-700"
                              : available <= r.lowStock
                                ? "bg-amber-100 text-amber-800"
                                : "text-muted-foreground"
                          }`}
                        >
                          {available <= 0 ? "Out of stock" : `${available} available`}
                          {r.reserved > 0 && ` · ${r.reserved} reserved`}
                        </span>
                      </form>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!r.isActive}
                        aria-label={`Hide ${r.sku} on website`}
                        onClick={() => toggleHidden(r)}
                        disabled={pending}
                        className={`relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out disabled:opacity-60 ${
                          r.isActive ? "bg-black/20" : "bg-brand"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                            r.isActive ? "translate-x-0" : "translate-x-5"
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.isActive ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/inventory/${r.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    No products match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
