import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ProductArt from "@/components/blog/ProductArt";
import AboutTabs from "@/components/about/AboutTabs";
import ContactCta from "@/components/about/ContactCta";
import { BLOG_POSTS } from "@/lib/blog";
import { getAllPosts, getPartFacts, getPostBySlug } from "@/lib/blog-store";
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
      images: post.cover ? [post.cover] : undefined,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
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
  const body = post.bodyHtml ?? (await readBody(slug));
  if (!body) notFound();

  const facts = post.bodyHtml ? await getPartFacts(body) : null;
  const diagramLabels = facts
    ? [
        { title: "Product", value: facts.name },
        ...(facts.sku ? [{ title: "Part no.", value: facts.sku }] : []),
        ...(facts.position ? [{ title: "Position", value: facts.position }] : []),
        { title: "Fit check", value: "Year, make, model or VIN" },
      ]
    : [{ title: "Canuck Motors", value: "Canadian-owned" }, { title: "Fit check", value: "Year, make, model or VIN" }];
  const heroPhoto = post.photos?.[0];
  const inlinePhoto = post.photos?.[1] ?? null;
  const cut = inlinePhoto ? body.search(/<\/blockquote>/i) : -1;
  const bodyHead = cut >= 0 ? body.slice(0, cut + 13) : body;
  const bodyTail = cut >= 0 ? body.slice(cut + 13) : "";
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
    image: post.cover ? `${SITE_URL}${post.cover}` : undefined,
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
          <div className={post.bodyHtml && post.cover ? "grid items-center gap-8 md:grid-cols-[1fr_1.3fr]" : ""}>
            <div>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.04em] md:text-5xl">{post.heading}</h1>
          {post.publishedAt && (
            <p className="mt-4 text-sm text-white/60">
              By Canuck Motors · <time dateTime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>
              {post.updatedAt && dateLabel(post.updatedAt) !== dateLabel(post.publishedAt) && <> · Updated <time dateTime={post.updatedAt}>{dateLabel(post.updatedAt)}</time></>}
            </p>
          )}
            </div>
            {post.bodyHtml && post.cover && (
              <div className="relative mt-6 aspect-[8/5] overflow-hidden rounded-[28px] border border-brand/30 shadow-[0_24px_60px_rgba(0,0,0,0.5)] md:mt-0">
                <ProductArt src={post.cover} alt={post.title} uid="hero" labels={diagramLabels} />
              </div>
            )}
          </div>
        </div>
      </section>

      <AboutTabs />

      <div className="cm-container py-12 md:py-16">
        <article className="mx-auto max-w-3xl rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)] md:p-10">
          <>
            {inlinePhoto && cut >= 0 ? (
              <>
                <div className={bodyClass} dangerouslySetInnerHTML={{ __html: bodyHead }} />
                <figure className="my-8 overflow-hidden rounded-3xl border border-brand/30 bg-ink shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
                  <div className="relative aspect-[16/9]">
                    <Image src={inlinePhoto.url} alt={post.title} fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
                  </div>
                </figure>
                <div className={`${bodyClass} mt-5`} dangerouslySetInnerHTML={{ __html: bodyTail }} />
              </>
            ) : (
              <div className={bodyClass} dangerouslySetInnerHTML={{ __html: body }} />
            )}
          </>
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
                    {p.cover &&
                      (p.bodyHtml ? (
                        <ProductArt src={p.cover} alt={p.title} uid={`m-${p.slug.slice(0, 16)}`} />
                      ) : (
                        <Image src={p.cover} alt={p.title} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
                      ))}
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
