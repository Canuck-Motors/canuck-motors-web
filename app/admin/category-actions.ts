"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");
  if (error || !role) throw new Error("You are not authorized to perform this action.");
  return supabase;
}

function friendly(message: string) {
  return /admin_save_category|admin_reorder_categories|admin_set_product_category|schema cache/.test(message)
    ? "Run database/admin_categories.sql in the Supabase SQL editor first."
    : message;
}

function refresh() {
  updateTag("product-categories");
  updateTag("category-media");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/inventory");
  revalidatePath("/", "layout");
}

export async function saveCategory(input: {
  id: number | null;
  name: string;
  isActive: boolean;
  imagePath?: string | null;
  clearImage?: boolean;
}) {
  const supabase = await requireStaff();
  const { data, error } = await supabase.rpc("admin_save_category", {
    p_id: input.id,
    p_name: input.name,
    p_is_active: input.isActive,
    p_image_path: input.imagePath ?? null,
    p_clear_image: Boolean(input.clearImage),
  });
  if (error) throw new Error(friendly(error.message));
  refresh();
  return Number(data);
}

export async function reorderCategories(ids: number[]) {
  const supabase = await requireStaff();
  const { error } = await supabase.rpc("admin_reorder_categories", { p_ids: ids });
  if (error) throw new Error(friendly(error.message));
  refresh();
}

export async function setProductsCategory(productIds: number[], categoryId: number | null) {
  const supabase = await requireStaff();
  const ids = Array.from(new Set(productIds)).slice(0, 1000);
  if (!ids.length) return;
  const { error } = await supabase.rpc("admin_set_product_category", {
    p_ids: ids,
    p_category_id: categoryId,
  });
  if (error) throw new Error(friendly(error.message));
  refresh();
}
