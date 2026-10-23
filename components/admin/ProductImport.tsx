"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Download, FileSpreadsheet, ImageIcon } from "lucide-react";
import {
  applyProductImport,
  previewProductImport,
  type ImportResult,
} from "@/app/admin/inventory/import/product-actions";
import type { ProductImportRow } from "@/lib/inventory-import";

const TEMPLATE = "SKU,Quantity\nCM1152090,20\nCM1152320,30\nCM1044H,30\n";

const explain = (m: string | null) =>
  m && /Name is required for a new product/.test(m)
    ? "SKU not found. To add it as a new product, include Name and Price columns."
    : m;

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ProductImport() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; rows: ProductImportRow[] } | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [done, setDone] = useState(false);

  const count = (a: string) => (results ?? []).filter((r) => r.action === a).length;
  const errors = (results ?? []).filter((r) => r.action === "error");

  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand">
          <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-black text-ink">Upload stock file</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Just <strong>SKU</strong> and <strong>Quantity</strong>. You see a preview before anything is saved.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={() => download("product-import-template.csv", TEMPLATE)}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download template
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/admin/inventory/import/export";
          }}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download current stock
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Choose below: <strong>Replace</strong> sets stock to the file&apos;s quantity, <strong>Add</strong> adds the
        file&apos;s quantity on top of what you have now. Everything else about the product stays as it is.{" "}
        <span className="font-semibold text-ink">Adding a new product?</span> Add Name and Price columns (optional:
        Description, Category, Low stock). New products are created <strong>hidden</strong> until you add photos
        and switch them on.
      </p>

      {!done && (
        <form
          action={(fd) =>
            start(async () => {
              setError(null);
              setResults(null);
              const r = await previewProductImport(fd);
              if (!r.ok) {
                setError(r.error ?? "Could not read the file.");
                setFile(null);
                return;
              }
              setFile({ name: r.fileName ?? "import", rows: r.rows ?? [] });
              setResults(r.results ?? []);
            })
          }
          className="mt-5 flex flex-wrap items-center gap-3"
        >
          <select
            name="mode"
            defaultValue="replace"
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold"
          >
            <option value="replace">Replace stock (set to the file&apos;s quantity)</option>
            <option value="add">Add to current stock (current + file&apos;s quantity)</option>
          </select>
          <input
            name="file"
            type="file"
            required
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="rounded-2xl border border-black/10 bg-secondary/50 px-4 py-3 text-sm"
          />
          <button disabled={pending} className="cm-button-primary disabled:opacity-60">
            {pending ? "Checking..." : "Preview import"}
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {results && (
        <div className="mt-6">
          {done && (
            <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl bg-emerald-600 p-4 text-white">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="font-bold">
                {count("update")} SKU{count("update") === 1 ? "" : "s"} updated in the database
                {count("create") > 0 && `, ${count("create")} new product${count("create") === 1 ? "" : "s"} created`}
                {errors.length > 0 && `. ${errors.length} row${errors.length === 1 ? "" : "s"} skipped (see below)`}.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">{done ? "Created" : "Will create"}</p>
              <p className="text-3xl font-black text-emerald-900">{count("create")}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">{done ? "Updated" : "Will update"}</p>
              <p className="text-3xl font-black text-ink">{count("update")}</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm text-red-700">Errors</p>
              <p className="text-3xl font-black text-red-900">{errors.length}</p>
            </div>
          </div>

          {!done && file && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending || count("create") + count("update") === 0}
                onClick={() =>
                  start(async () => {
                    const r = await applyProductImport(file.rows, file.name);
                    if (!r.ok) {
                      setError(r.error ?? "Import failed.");
                      return;
                    }
                    setResults(r.results ?? []);
                    setDone(true);
                  })
                }
                className="cm-button-primary disabled:opacity-60"
              >
                {pending ? "Importing..." : `Confirm import (${count("create") + count("update")} products)`}
              </button>
              {errors.length > 0 && (
                <span className="text-sm text-muted-foreground">Rows with errors are skipped.</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setResults(null);
                  setFile(null);
                }}
                className="text-sm font-semibold underline"
              >
                Cancel
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <button
              type="button"
              onClick={() =>
                download(
                  "import-errors.csv",
                  "Row,SKU,Error\n" +
                    errors
                      .map((e) => `${e.row},"${e.sku ?? ""}","${(explain(e.message) ?? "").replaceAll('"', '""')}"`)
                      .join("\n")
                )
              }
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Download error list
            </button>
          )}

          <div className="mt-4 max-h-96 overflow-auto rounded-2xl border border-black/5">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  <th className="px-4 py-3">Row</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...results].sort((a, b) => Number(b.action === "error") - Number(a.action === "error")).map((r) => (
                  <tr key={r.row}>
                    <td className="px-4 py-2.5">{r.row}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.sku || "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.name}</td>
                    <td className="px-4 py-2.5">
                      {r.action === "error" ? (
                        <span className="inline-flex items-center gap-2 font-bold text-red-700">
                          <CircleAlert className="h-4 w-4" aria-hidden="true" /> {explain(r.message)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 font-bold text-emerald-700">
                          <CircleCheck className="h-4 w-4" aria-hidden="true" />
                          {r.action === "create" ? (done ? "Created (hidden)" : "New product") : done ? "Updated" : "Update"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {done && (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm">
              <p className="flex items-center gap-2 font-bold text-amber-900">
                <ImageIcon className="h-4 w-4" aria-hidden="true" /> New products need photos
              </p>
              <ul className="mt-2 space-y-1">
                {results
                  .filter((r) => r.action === "create" && r.product_id)
                  .map((r) => (
                    <li key={r.row}>
                      <Link href={`/admin/images/${r.product_id}`} className="font-semibold text-brand hover:underline">
                        {r.sku}
                      </Link>{" "}
                      <span className="text-muted-foreground">{r.name}</span>{" "}
                      <Link href={`/admin/inventory/${r.product_id}`} className="text-xs underline">
                        edit &amp; show on website
                      </Link>
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setDone(false);
                  setResults(null);
                  setFile(null);
                }}
                className="mt-4 text-sm font-bold underline"
              >
                Import another file
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
