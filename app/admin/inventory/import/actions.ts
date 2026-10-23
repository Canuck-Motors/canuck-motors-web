"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseInventoryFile } from "@/lib/inventory-import";

export async function importInventory(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const file = formData.get("file");
  const mode = String(formData.get("mode") || "replace");

  if (!(file instanceof File)) {
    throw new Error("Please choose an inventory file.");
  }

  if (!["replace", "delta"].includes(mode)) {
    throw new Error("Invalid inventory import mode.");
  }

  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Inventory files are limited to 5 MB.");
  }

  const rows = parseInventoryFile(file.name, await file.arrayBuffer());

  if (rows.length === 0) {
    throw new Error("No inventory rows were found.");
  }

  if (rows.length > 10000) {
    throw new Error("Inventory imports are limited to 10,000 rows per upload.");
  }

  const { data: jobId, error } = await supabase.rpc("apply_inventory_import", {
    p_file_name: file.name,
    p_import_mode: mode,
    p_rows: rows,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/import");

  redirect(`/admin/inventory/import?job=${jobId}`);
}
