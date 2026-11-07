import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import AboutTabs from "@/components/about/AboutTabs";
import ContactCta from "@/components/about/ContactCta";
import { BLOG_POSTS } from "@/lib/blog";
import { getAllPosts, getPostBySlug } from "@/lib/blog-store";
import { safeJsonLd } from "@/lib/json-ld";

type PageProps = { params: Promise<{ slug: string }> };

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Canuck Motors`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `/blog/${post.slug}`,
      images: post.bodyHtml ? (post.photos?.[0]?.url ? [post.photos[0].url] : undefined) : post.cover ? [post.cover] : undefined,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

const FALLBACK_HERO = "/about/manufacturer-hero.jpg";

// Posts written in /admin/blog show vehicle photos and text only: strip any product pictures or
// product links that older AI posts contain.
function cleanProducts(html: string) {
  return html
    .replace(/<figure>[\s\S]*?<\/figure>/gi, "")
    .replace(/<a\s+[^>]*href="\/product\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, "$1");
}

// Puts stock vehicle photos into the text: one after the quick-answer box, one in the middle.
function splitForPhotos(body: string, extra: number) {
  const first = body.search(/<\/blockquote>/i);
  let head = first >= 0 ? body.slice(0, first + 13) : "";
  let rest = first >= 0 ? body.slice(first + 13) : body;
  if (extra < 2) return { head, mid: rest, tail: "" };
  const h2s = [...rest.matchAll(/<h2(?![^>]*id="faq")/gi)].map((m) => m.index ?? 0);
  const at = h2s.length >= 2 ? h2s[Math.floor(h2s.length / 2)] : -1;
  return at > 0 ? { head, mid: rest.slice(0, at), tail: rest.slice(at) } : { head, mid: rest, tail: "" };
}

async function readBody(slug: string) {
  try {
    return await readFile(path.join(process.cwd(), "content", "blog", `${slug}.html`), "utf8");
  } catch {
    return null;
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const rawBody = post.bodyHtml ?? (await readBody(slug));
  if (!rawBody) notFound();
  const body = post.bodyHtml ? cleanProducts(rawBody) : rawBody;

  // Stock vehicle photos: first is the banner, the next two sit inside the text
  const heroPhoto = post.photos?.[0];
  const inlinePhotos = (post.photos ?? []).slice(1, 3);
  const parts = post.bodyHtml && inlinePhotos.length > 0 ? splitForPhotos(body, inlinePhotos.length) : null;
  const photoFigure = (ph: { url: string }) => (
    <figure className="my-8 overflow-hidden rounded-3xl border border-black/5 bg-ink shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
      <div className="relative aspect-[16/9]">
        <Image src={ph.url} alt={post.title} fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
      </div>
    </figure>
  );
  const bodyClass =
    "space-y-5 text-[15px] leading-7 text-muted-foreground " +
    "[&_a]:font-semibold [&_a]:text-brand [&_a]:underline-offset-2 hover:[&_a]:underline               [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-brand [&_blockquote]:bg-brand-tint/50 [&_blockquote]:p-5 [&_blockquote]:text-ink               [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-[-0.03em] [&_h2]:text-ink               [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-black [&_h3]:text-ink               [&_figcaption]:mt-4 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:font-semibold [&_figcaption]:text-white/80 [&_figure]:relative [&_figure]:my-8 [&_figure]:overflow-hidden [&_figure]:rounded-3xl [&_figure]:border [&_figure]:border-brand/30 [&_figure]:bg-ink [&_figure]:bg-[radial-gradient(circle_at_50%_40%,rgba(220,38,38,0.38),transparent_62%),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [&_figure]:bg-[size:100%_100%,28px_28px,28px_28px] [&_figure]:p-6 [&_figure]:shadow-[0_18px_40px_rgba(0,0,0,0.25)] [&_figure_a]:text-white [&_figure_a]:no-underline hover:[&_figure_a]:text-brand [&_figure_img]:mx-auto [&_figure_img]:aspect-square [&_figure_img]:h-60 [&_figure_img]:w-60 [&_figure_img]:rounded-full [&_figure_img]:border-[6px] [&_figure_img]:border-brand [&_figure_img]:bg-zinc-100 [&_figure_img]:object-contain [&_figure_img]:p-3 [&_figure_img]:shadow-[0_0_60px_rgba(220,38,38,0.55)] [&_img]:my-2 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-2xl               [&_li]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-6               [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2";
  const others = (await getAllPosts()).filter((p) => p.slug !== slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.heading,
    description: post.description,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    image: post.bodyHtml ? (heroPhoto?.url ?? `${SITE_URL}${FALLBACK_HERO}`) : post.cover ? `${SITE_URL}${post.cover}` : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Organization", name: "Canuck Motors", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Canuck Motors", url: SITE_URL },
  };

  const faqLd =
    post.faq && post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.heading, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };
  const dateLabel = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
      <section className="relative overflow-hidden bg-ink text-white">
        {heroPhoto && (
          <>
            <Image src={heroPhoto.url} alt="" fill sizes="100vw" priority className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
          </>
        )}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
        <div className="cm-container relative pb-16 pt-12 md:pb-20 md:pt-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-sm text-white/60">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href="/" className="hover:text-white">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/blog" className="hover:text-white">Blog</Link>
              </li>
            </ol>
          </nav>
          <p className="cm-eyebrow">Canuck Motors blog</p>
          <div>
            <div>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.04em] md:text-5xl">{post.heading}</h1>
          {post.publishedAt && (
            <p className="mt-4 text-sm text-white/60">
              By Canuck Motors · <time dateTime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>
              {post.updatedAt && dateLabel(post.updatedAt) !== dateLabel(post.publishedAt) && <> · Updated <time dateTime={post.updatedAt}>{dateLabel(post.updatedAt)}</time></>}
            </p>
          )}
            </div>
          </div>
        </div>
      </section>

      <AboutTabs />

      <div className="cm-container py-12 md:py-16">
        <article className="mx-auto max-w-3xl rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)] md:p-10">
          {parts ? (
            <>
              <div className={bodyClass} dangerouslySetInnerHTML={{ __html: parts.head }} />
              {inlinePhotos[0] && photoFigure(inlinePhotos[0])}
              <div className={`${bodyClass} mt-5`} dangerouslySetInnerHTML={{ __html: parts.mid }} />
              {parts.tail && inlinePhotos[1] && photoFigure(inlinePhotos[1])}
              {parts.tail && <div className={`${bodyClass} mt-5`} dangerouslySetInnerHTML={{ __html: parts.tail }} />}
            </>
          ) : (
            <div className={bodyClass} dangerouslySetInnerHTML={{ __html: body }} />
          )}
        </article>

        {others.length > 0 && (
          <section aria-labelledby="more" className="mx-auto mt-14 max-w-5xl">
            <h2 id="more" className="text-2xl font-black tracking-[-0.03em] text-ink">
              More from the blog
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {others.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group overflow-hidden rounded-[22px] border border-black/5 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:border-brand/25"
                >
                  <div className="relative aspect-[16/10] bg-secondary">
                    {(p.bodyHtml ? (p.photos?.[0]?.url ?? FALLBACK_HERO) : p.cover) && (
                      <Image src={p.bodyHtml ? (p.photos?.[0]?.url ?? FALLBACK_HERO) : p.cover} alt={p.title} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
                    )}
                  </div>
                  <p className="p-4 text-sm font-bold leading-5 text-ink">{p.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mx-auto mt-14 max-w-5xl">
          <ContactCta title="Looking for a water pump or brake parts?" />
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />}
    </main>
  );
}
