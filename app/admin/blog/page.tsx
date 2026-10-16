import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/AdminNav";
import BlogManager, { type AdminPost } from "@/components/admin/BlogManager";

export const instant = false;
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Blog Admin",
  robots: { index: false, follow: false },
};

export default async function BlogAdminPage() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (role !== "admin") redirect("/admin");

  const { data, error } = await createAdminClient()
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const missingTable = Boolean(error);
  const posts = ((data ?? []) as Record<string, unknown>[]).map(
    (p): AdminPost => ({
      id: Number(p.id),
      slug: String(p.slug),
      title: String(p.title),
      description: String(p.description),
      status: String(p.status) as AdminPost["status"],
      mode: p.mode ? String(p.mode) : "",
      generatedBy: String(p.generated_by),
      topic: p.topic ? String(p.topic) : "",
      createdAt: String(p.created_at),
      publishedAt: p.published_at ? String(p.published_at) : "",
      bodyHtml: String(p.body_html),
      photoCount: Array.isArray(p.photos) ? p.photos.length : 0,
      photos: Array.isArray(p.photos) ? (p.photos as AdminPost["photos"]) : [],
    }),
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fafafa_100%)]">
      <div className="cm-container py-12">
        <AdminNav />
        <div className="mt-10">
          <p className="cm-eyebrow">Content</p>
          <h1 className="cm-section-title mt-3">Blog</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Generate a new article with AI. It is saved as a draft: nothing goes live until you press Publish. A fresh draft is also created automatically about every 15 days.
          </p>
        </div>
        {missingTable ? (
          <p className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            The blog table doesn&apos;t exist yet. Run <code>database/blog_posts.sql</code> in the Supabase SQL editor, then reload.
          </p>
        ) : (
          <BlogManager posts={posts} />
        )}
      </div>
    </main>
  );
}
