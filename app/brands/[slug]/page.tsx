import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { createPublicClient } from "@/lib/supabase/public";

type PageProps = { params: Promise<{ slug: string }> };

async function getBrand(slug: string) {
  "use cache";
  cacheLife({ stale: 7200, revalidate: 3600, expire: 86400 });
  cacheTag(`vehicle-brand-${slug}`);

  const supabase = createPublicClient();

  const { data: brand } = await supabase
    .from("manufacturer")
    .select("id, manufacturer_name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!brand) return null;

  const { data: models } = await supabase
    .from("models")
    .select("id, model_name, slug")
    .eq("manufacturer_id", brand.id)
    .order("model_name")
    .limit(200);

  return { brand, models: models ?? [] };
}

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("manufacturer").select("slug").not("slug", "is", null);
  return (data ?? []).map((row) => ({ slug: row.slug! }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBrand(slug);

  if (!result) return { title: "Vehicle Brand Not Found" };

  return {
    title: `${result.brand.manufacturer_name} Auto Parts & Fitment`,
    description: `Browse ${result.brand.manufacturer_name} models supported by the Canuck Motors vehicle fitment catalog.`,
    alternates: { canonical: `/brands/${result.brand.slug}` },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getBrand(slug);

  if (!result) notFound();

  return (
    <>
      <Header />
      <Navbar />
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fafafa_100%)]">
        <section className="bg-ink text-white">
          <div className="cm-container py-14 md:py-20">
            <Link href="/brands" className="text-sm font-bold text-brand hover:underline">
              All vehicle brands
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-6xl">
              {result.brand.manufacturer_name}
            </h1>
            <p className="mt-5 max-w-2xl text-white/65">
              Select your model, then use the vehicle finder to confirm year, engine,
              trim, and compatible parts.
            </p>
            <Link href="/#vehicle-finder" className="cm-button-primary mt-7">
              Open vehicle finder
            </Link>
          </div>
        </section>

        <section className="cm-container py-12 md:py-16">
          <p className="cm-eyebrow">Supported models</p>
          <h2 className="cm-section-title mt-3">
            {result.brand.manufacturer_name} models
          </h2>

          {result.models.length === 0 ? (
            <div className="cm-card mt-8 p-10 text-muted-foreground">
              No models are currently available for this brand.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {result.models.map((model) => (
                <div
                  key={model.id}
                  className="rounded-[22px] border border-black/5 bg-white p-5 font-bold text-ink shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
                >
                  {model.model_name}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
