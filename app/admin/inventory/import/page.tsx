import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UploadCloud, FileSpreadsheet, CircleCheck, CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { importInventory } from "./actions";

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
              Upload Excel or CSV stock counts. Every accepted row is audited and
              inventory cannot be reduced below quantities already reserved for orders.
            </p>
          </div>
          <Link
            href="/admin/inventory"
            className="text-sm font-bold text-brand hover:underline"
          >
            Back to inventory
          </Link>
        </div>

        <section className="mt-8 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_16px_46px_rgba(0,0,0,0.06)] md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-black text-ink">Upload stock file</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Required columns: SKU and Quantity. Formats: .xlsx or .csv.
              </p>
            </div>
          </div>

          <form action={importInventory} className="mt-6 grid gap-4 lg:grid-cols-[1fr_240px_auto]">
            <input
              name="file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              required
              className="rounded-2xl border border-black/10 bg-secondary/50 px-4 py-3 text-sm"
            />
            <select
              name="mode"
              defaultValue="replace"
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold"
            >
              <option value="replace">Replace quantity</option>
              <option value="delta">Add/subtract quantity</option>
            </select>
            <button type="submit" className="cm-button-primary gap-2">
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Import
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm leading-6 text-muted-foreground">
            <strong className="text-ink">Example:</strong> SKU = CM1012H, Quantity = 25.
            In Replace mode, warehouse stock becomes 25. In Delta mode, 25 is added
            to the current stock. Negative deltas are allowed only when the resulting
            stock remains non-negative and above reserved stock.
          </div>
        </section>

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
      </div>
    </main>
  );
}
