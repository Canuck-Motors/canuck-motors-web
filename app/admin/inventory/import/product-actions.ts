"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseProductFile, type ProductImportRow } from "@/lib/inventory-import";

export type ImportResult = {
  row: number;
  sku: string;
  name: string;
  action: "create" | "update" | "error";
  message: string | null;
  product_id: number | null;
};

export type PreviewResponse = {
  ok: boolean;
  error?: string;
  fileName?: string;
  rows?: ProductImportRow[];
  results?: ImportResult[];
};

async function requireStaff() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");
  if (error || !role) throw new Error("You are not authorized to perform this action.");
  return supabase;
}

function friendly(message: string) {
  return /admin_import_products|schema cache/.test(message)
    ? "Run database/admin_import_products.sql in the Supabase SQL editor first."
    : message;
}

export async function previewProductImport(formData: FormData): Promise<PreviewResponse> {
  try {
    const supabase = await requireStaff();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) throw new Error("Choose a file first.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Files are limited to 5 MB.");

    const parsed = parseProductFile(file.name, await file.arrayBuffer());
    if (!parsed.length) throw new Error("No product rows were found.");
    if (parsed.length > 5000) throw new Error("Limit is 5,000 rows per upload.");

    let rows = parsed;
    if (formData.get("mode") === "add") {
      const { data: prods } = await supabase
        .from("products")
        .select("sku, inventory(quantity)")
        .eq("is_delete", false)
        .in("sku", Array.from(new Set(parsed.map((r) => r.sku))));
      const current = new Map<string, number>();
      for (const p of prods ?? []) {
        const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
        current.set(String(p.sku).toLowerCase(), Number(inv?.quantity ?? 0));
      }
      rows = parsed.map((r) => {
        const cur = current.get(r.sku.toLowerCase());
        const add = Number(r.quantity);
        return cur === undefined || !Number.isFinite(add)
          ? r
          : { ...r, quantity: String(Math.max(0, cur + add)) };
      });
    }

    const { data, error } = await supabase.rpc("admin_import_products", {
      p_rows: rows,
      p_apply: false,
      p_file_name: file.name,
    });
    if (error) throw new Error(friendly(error.message));

    return { ok: true, fileName: file.name, rows, results: data as ImportResult[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read the file." };
  }
}

export async function applyProductImport(
  rows: ProductImportRow[],
  fileName: string
): Promise<PreviewResponse> {
  try {
    const supabase = await requireStaff();
    const { data, error } = await supabase.rpc("admin_import_products", {
      p_rows: rows,
      p_apply: true,
      p_file_name: fileName,
    });
    if (error) throw new Error(friendly(error.message));

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/import");
    revalidatePath("/", "layout");
    return { ok: true, fileName, results: data as ImportResult[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}

export async function addSingleProduct(formData: FormData): Promise<{
  ok: boolean;
  message: string;
  productId?: number;
}> {
  try {
    const supabase = await requireStaff();
    const row: ProductImportRow = {
      row_number: 1,
      sku: String(formData.get("sku") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      price: String(formData.get("price") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      quantity: String(formData.get("quantity") || "").trim(),
      low_stock: "",
    };

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .ilike("sku", row.sku)
      .eq("is_delete", false)
      .limit(1)
      .maybeSingle();
    if (existing) throw new Error(`A product with SKU ${row.sku} already exists.`);

    const { data, error } = await supabase.rpc("admin_import_products", {
      p_rows: [row],
      p_apply: true,
      p_file_name: "Added by hand",
    });
    if (error) throw new Error(friendly(error.message));

    const res = (data as ImportResult[])[0];
    if (!res || res.action === "error") throw new Error(res?.message || "Could not add the product.");

    revalidatePath("/admin/inventory");
    return { ok: true, message: "Product added (hidden until you switch it on).", productId: res.product_id ?? undefined };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not add the product." };
  }
}
