import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AboutTabs from "@/components/about/AboutTabs";
import ProductArt from "@/components/blog/ProductArt";
import AboutHero from "@/components/about/AboutHero";
import { getAllPosts } from "@/lib/blog-store";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Blog | Water Pump, Brake & Auto Parts Guides | Canuck Motors",
  description:
    "Guides and tips from Canuck Motors: how to spot a failing water pump, replacement guides for popular vehicles, and news from Canada's auto parts brand.",
  alternates: { canonical: "/blog" },
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

type Post = Awaited<ReturnType<typeof getAllPosts>>[number];

function Cover({ p, sizes }: { p: Post; sizes: string }) {
  if (p.photos?.[0]) {
    return <Image src={p.photos[0].url} alt={p.title} fill sizes={sizes} className="object-cover transition duration-500 group-hover:scale-105" />;
  }
  if (p.bodyHtml && p.cover) return <ProductArt src={p.cover} alt={p.title} uid={p.slug.slice(0, 20)} />;
  return p.cover ? <Image src={p.cover} alt={p.title} fill sizes={sizes} className="object-cover transition duration-500 group-hover:scale-105" /> : null;
}

function PostCard({ p, wide }: { p: Post; wide: boolean }) {
  if (wide) {
    return (
      <Link
        href={`/blog/${p.slug}`}
        className="cm-reveal group grid overflow-hidden rounded-[28px] border border-black/5 bg-ink text-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] md:grid-cols-[1.1fr_1fr]"
      >
        <div className="relative aspect-[16/10] bg-secondary md:aspect-auto md:min-h-[300px]">
          <Cover p={p} sizes="(min-width: 768px) 55vw, 100vw" />
        </div>
        <div className="relative flex flex-col justify-center p-7 md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />
          <h2 className="text-2xl font-black tracking-[-0.03em] md:text-3xl">{p.title}</h2>
          <p className="mt-3 text-white/65">{p.excerpt}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand">Read the article →</span>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href={`/blog/${p.slug}`}
      className="cm-reveal group flex flex-col overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.11)]"
    >
      <div className="relative aspect-[16/10] bg-secondary">
        <Cover p={p} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-lg font-black leading-6 tracking-[-0.02em] text-ink">{p.title}</h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">{p.excerpt}</p>
        <span className="mt-4 text-sm font-bold text-brand">Read more →</span>
      </div>
    </Link>
  );
}

export default async function BlogIndexPage() {
  const BLOG_POSTS = await getAllPosts();
  // Newest article full width, then every row has 3
  const sizes: number[] = [1];
  while (sizes.reduce((x, y) => x + y, 0) < BLOG_POSTS.length) sizes.push(3);
  const rows: { size: number; items: typeof BLOG_POSTS }[] = [];
  let at = 0;
  for (const n of sizes) {
    if (at >= BLOG_POSTS.length) break;
    rows.push({ size: n, items: BLOG_POSTS.slice(at, at + n) });
    at += n;
  }
  const list = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Canuck Motors Blog",
    url: `${SITE_URL}/blog`,
    blogPost: BLOG_POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.heading,
      url: `${SITE_URL}/blog/${p.slug}`,
      description: p.description,
    })),
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
      <AboutHero eyebrow="About · Blog" title="Guides, tips and news.">
        <p>
          A car&apos;s water pump circulates coolant to keep your engine at the right temperature. Our guides explain how it
          works, the signs of trouble, and how to maintain and replace it.
        </p>
      </AboutHero>

      <AboutTabs />

      <div className="cm-container space-y-6 py-14 md:py-20">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={row.size === 1 ? "grid gap-6" : row.size === 2 ? "grid gap-6 md:grid-cols-2" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}
          >
            {row.items.map((p) => (
              <PostCard key={p.slug} p={p} wide={row.size === 1} />
            ))}
          </div>
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(list) }} />
    </main>
  );
}
