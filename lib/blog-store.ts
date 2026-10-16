import { cacheLife, cacheTag } from "next/cache";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog";
import { createPublicClient } from "@/lib/supabase/public";

type Row = {
  slug: string;
  title: string;
  heading: string;
  description: string;
  excerpt: string;
  cover: string;
  body_html: string;
  photos?: { url: string; source: string; credit: string; creditUrl: string; pageUrl: string }[] | null;
  faq: { q: string; a: string }[] | null;
  sources: { title: string; url: string }[] | null;
  published_at: string | null;
  updated_at: string;
};

const toPost = (r: Row): BlogPost => ({
  slug: r.slug,
  title: r.title,
  heading: r.heading,
  description: r.description,
  excerpt: r.excerpt,
  cover: r.cover,
  bodyHtml: r.body_html,
  photos: r.photos ?? [],
  faq: r.faq ?? [],
  sources: r.sources ?? [],
  publishedAt: r.published_at ?? undefined,
  updatedAt: r.updated_at,
});

// Published posts written in /admin/blog, newest first
async function getDbPosts(): Promise<BlogPost[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("blog");

  const { data, error } = await createPublicClient()
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) return []; // table not created yet: just show the older posts
  return (data as Row[]).map(toPost);
}

export async function getAllPosts(): Promise<BlogPost[]> {
  return [...(await getDbPosts()), ...BLOG_POSTS];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  return (await getAllPosts()).find((p) => p.slug === slug);
}

// Real facts (part number, position, price) of the first product linked in an article: used for the header diagram
export async function getPartFacts(body: string): Promise<{ name: string; sku: string | null; position: string | null; price: number | null } | null> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 600, expire: 86400 });
  cacheTag("blog");

  const ref = body.match(/href="\/product\/([^"/?#]+)"/i)?.[1];
  if (!ref) return null;
  const db = createPublicClient();
  const q = db.from("products").select("product_name, sku, position, price").eq("is_active", true).eq("is_delete", false);
  const { data } = await (/^\d+$/.test(ref) ? q.eq("id", Number(ref)) : q.eq("slug", ref)).limit(1);
  const p = data?.[0] as { product_name: string; sku: string | null; position: string | null; price: number | null } | undefined;
  return p ? { name: p.product_name, sku: p.sku, position: p.position, price: p.price } : null;
}
