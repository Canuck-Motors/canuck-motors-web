import { Suspense } from "react";

import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Hero } from "@/components/hero";
import { CategorySection } from "@/components/CategorySection";
import { FeaturedProducts } from "@/components/FeaturedProducts";

export default function Home() {
  return (
    <>
      <Header />
      <Navbar />
      <Hero />

      <Suspense fallback={<p>Loading categories...</p>}>
        <CategorySection />
      </Suspense>

      <Suspense fallback={<p>Loading products...</p>}>
        <FeaturedProducts />
      </Suspense>
    </>
  );
}