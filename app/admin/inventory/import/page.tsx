import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck, CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import ProductImport from "@/components/admin/ProductImport";
import AddProductForm from "@/components/admin/AddProductForm";

export const instant = false;

export const metadata: Metadata = {
  title: "Inventory Import",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ job?: string }>;
};

export default async function InventoryImportPage({ searchParams }: PageProps) {
  const { job } = await searchParams;
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");

  if (!role) {
    redirect("/");
  }

  const { data: cats } = await supabase
    .from("product_categories")
    .select("category_name")
    .eq("is_delete", false)
    .order("category_name");

  const { data: productJobs } = await supabase
    .from("product_import_jobs")
    .select("id, file_name, created_count, updated_count, error_count, created_on")
    .order("created_on", { ascending: false })
    .limit(10);

  const { data: stockJobs } = await supabase
    .from("inventory_import_jobs")
    .select("id, file_name, status, success_rows, failed_rows, created_on")
    .order("created_on", { ascending: false })
    .limit(10);

  let importJob:
    | {
        id: string;
        file_name: string;
        import_mode: string;
        status: string;
        total_rows: number;
        success_rows: number;
        failed_rows: number;
        created_on: string;
        completed_on: string | null;
      }
    | null = null;

  let importRows:
    | Array<{
        id: number;
        row_number: number;
        sku: string | null;
        quantity: number | null;
        status: string;
        error_message: string | null;
        previous_quantity: number | null;
        new_quantity: number | null;
      }>
    | null = null;

  if (job) {
    const { data } = await supabase
      .from("inventory_import_jobs")
      .select(
        "id, file_name, import_mode, status, total_rows, success_rows, failed_rows, created_on, completed_on"
      )
      .eq("id", job)
      .maybeSingle();

    importJob = data;

    if (importJob) {
      const { data: rows } = await supabase
        .from("inventory_import_rows")
        .select(
          "id, row_number, sku, quantity, status, error_message, previous_quantity, new_quantity"
        )
        .eq("import_job_id", importJob.id)
        .order("row_number")
        .limit(500);

      importRows = rows;
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cm-eyebrow">Inventory</p>
            <h1 className="cm-section-title mt-3">Bulk inventory import</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Upload an Excel or CSV file with SKU and Quantity to update stock, or add new products.
            </p>
          </div>
          <Link
            href="/admin/inventory"
            className="text-sm font-bold text-brand hover:underline"
          >
            Back to inventory
          </Link>
        </div>

        <div className="mt-8 space-y-8">
          <ProductImport />
          <AddProductForm categories={(cats ?? []).map((c) => c.category_name)} />
        </div>

        {importJob && (
          <section className="mt-8 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="cm-eyebrow">Import result</p>
                <h2 className="mt-2 text-2xl font-black text-ink">
                  {importJob.file_name}
                </h2>
              </div>
              <span className="rounded-full bg-brand-tint px-3 py-1.5 text-xs font-bold capitalize text-brand">
                {importJob.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-secondary/60 p-5">
                <p className="text-sm text-muted-foreground">Total rows</p>
                <p className="mt-1 text-3xl font-black text-ink">{importJob.total_rows}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5">
                <p className="text-sm text-emerald-700">Successful</p>
                <p className="mt-1 text-3xl font-black text-emerald-900">
                  {importJob.success_rows}
                </p>
              </div>
              <div className="rounded-2xl bg-red-50 p-5">
                <p className="text-sm text-red-700">Failed</p>
                <p className="mt-1 text-3xl font-black text-red-900">
                  {importJob.failed_rows}
                </p>
              </div>
            </div>

            {(importRows ?? []).length > 0 && (
              <div className="mt-7 overflow-x-auto rounded-2xl border border-black/5">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Input</th>
                      <th className="px-4 py-3">Previous</th>
                      <th className="px-4 py-3">New</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(importRows ?? []).map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">{row.row_number}</td>
                        <td className="px-4 py-3 font-semibold">{row.sku || "—"}</td>
                        <td className="px-4 py-3">{row.quantity ?? "—"}</td>
                        <td className="px-4 py-3">{row.previous_quantity ?? "—"}</td>
                        <td className="px-4 py-3">{row.new_quantity ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={row.status === "success" ? "inline-flex items-center gap-2 font-bold text-emerald-700" : "inline-flex items-center gap-2 font-bold text-red-700"}>
                            {row.status === "success" ? (
                              <CircleCheck className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <CircleAlert className="h-4 w-4" aria-hidden="true" />
                            )}
                            {row.status === "success"
                              ? "Updated"
                              : row.error_message || "Failed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="mt-8 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-8">
          <h2 className="text-xl font-black text-ink">Import history</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold text-ink">Product imports</p>
              {(productJobs ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
              ) : (
                <ul className="mt-2 divide-y text-sm">
                  {(productJobs ?? []).map((j) => (
                    <li key={j.id} className="py-2">
                      <span className="font-semibold text-ink">{j.file_name || "File"}</span>
                      <span className="ml-2 text-muted-foreground">
                        {j.created_count} new · {j.updated_count} updated · {j.error_count} errors
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {new Date(j.created_on).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Stock updates</p>
              {(stockJobs ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
              ) : (
                <ul className="mt-2 divide-y text-sm">
                  {(stockJobs ?? []).map((j) => (
                    <li key={j.id} className="py-2">
                      <Link href={`/admin/inventory/import?job=${j.id}`} className="font-semibold text-brand hover:underline">
                        {j.file_name || "File"}
                      </Link>
                      <span className="ml-2 text-muted-foreground">
                        {j.success_rows} updated · {j.failed_rows} failed
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {new Date(j.created_on).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
