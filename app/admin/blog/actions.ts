"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  humanizeStep,
  researchStep,
  saveDraft,
  tailorStep,
  type Draft,
  type Research,
} from "@/lib/blog-ai";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (role !== "admin") throw new Error("Only admins can manage the blog.");
}

const fail = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// The four generate steps are separate actions so the page can show progress between them.
export async function stepResearch(topic: string): Promise<Result<Research>> {
  try {
    await requireAdmin();
    if (!topic.trim()) throw new Error("Write a topic first.");
    return { ok: true, data: await researchStep("auto", topic.trim().slice(0, 200)) };
  } catch (e) {
    return { ok: false, error: fail(e) };
  }
}

export async function stepTailor(research: Research): Promise<Result<Draft>> {
  try {
    await requireAdmin();
    return { ok: true, data: await tailorStep(research) };
  } catch (e) {
    return { ok: false, error: fail(e) };
  }
}

export async function stepHumanize(draft: Draft): Promise<Result<Draft>> {
  try {
    await requireAdmin();
    return { ok: true, data: await humanizeStep(draft) };
  } catch (e) {
    return { ok: false, error: fail(e) };
  }
}

export async function stepSaveDraft(draft: Draft, research: Research): Promise<Result<{ id: number; products: number; photos: number; stock: number; photoNote: string }>> {
  try {
    await requireAdmin();
    const saved = await saveDraft(draft, research, "admin");
    revalidatePath("/admin/blog");
    return { ok: true, data: { id: saved.id, products: saved.products, photos: saved.photos, stock: saved.stock, photoNote: saved.photoNote } };
  } catch (e) {
    return { ok: false, error: fail(e) };
  }
}

export async function setPostStatus(id: number, status: "published" | "unpublished" | "draft") {
  await requireAdmin();
  const db = createAdminClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "published") patch.published_at = now;
  const { error } = await db.from("blog_posts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  updateTag("blog");
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
}

export async function updatePostText(id: number, title: string, description: string) {
  await requireAdmin();
  const t = title.trim().slice(0, 120);
  const d = description.trim().slice(0, 300);
  if (!t || !d) throw new Error("Title and description can't be empty.");
  const db = createAdminClient();
  const { error } = await db
    .from("blog_posts")
    .update({ title: t, description: d, excerpt: d, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  updateTag("blog");
  revalidatePath("/admin/blog");
}

export async function deletePost(id: number) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("blog_posts").delete().eq("id", id).neq("status", "published");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blog");
}

export async function clearPhotos(id: number) {
  await requireAdmin();
  const { error } = await createAdminClient().from("blog_posts").update({ photos: [], updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  updateTag("blog");
  revalidatePath("/admin/blog");
}
