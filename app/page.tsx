import { Suspense } from "react";
import { Hero } from "@/components/hero";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { AmazonReviews } from "@/components/AmazonReviews";

// Fixed-height placeholder so the page does not jump when data arrives
// (keeps Cumulative Layout Shift low, which helps SEO).
function SectionSkeleton({
  label,
  heightClass,
}: {
  label: string;
  heightClass: string;
}) {
  return (
    <div className="cm-container py-10" role="status" aria-label={label}>
      <div className={`${heightClass} animate-pulse rounded-3xl bg-secondary`} />
    </div>
  );
}

export default function Home() {
  return (
    <>


      <main id="main-content">
        <Hero />

        <AmazonReviews />

        <Suspense
          fallback={
            <SectionSkeleton label="Loading products" heightClass="h-96" />
          }
        >
          <FeaturedProducts />
        </Suspense>
      </main>
    </>
  );
}