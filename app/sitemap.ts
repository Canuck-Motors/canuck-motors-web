import { getAllPosts } from "@/lib/blog-store";
import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getHiddenNavKeys } from "@/lib/site-nav";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const hiddenNav = await getHiddenNavKeys();
  const isShown = (key: string) => !hiddenNav.includes(key);

  const [{ data: products }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from("products")
      .select("slug, updated_on")
      .eq("is_active", true)
      .eq("is_delete", false)
      .not("slug", "is", null),
    supabase
      .from("product_categories")
      .select("slug, updated_on")
      .eq("is_active", true)
      .eq("is_delete", false)
      .not("slug", "is", null),
    supabase
      .from("manufacturer")
      .select("slug")
      .not("slug", "is", null),
  ]);

  const staticPages = [
    "",
    "/products",
    "/categories",
    "/brands",
    "/deals",
    "/about",
    "/about/product",
    "/about/manufacturer",
    "/blog",
  ]
    .filter((path) => {
      const key = { "/products": "products", "/categories": "categories", "/brands": "brands", "/deals": "deals", "/about": "about" }[path];
      return !key || isShown(key);
    })
    .map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const productPages = (products ?? []).map((product) => ({
    url: `${baseUrl}/product/${product.slug}`,
    lastModified: product.updated_on ? new Date(product.updated_on) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryPages = (categories ?? []).map((category) => ({
    url: `${baseUrl}/categories/${category.slug}`,
    lastModified: category.updated_on ? new Date(category.updated_on) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const brandPages = (brands ?? []).map((brand) => ({
    url: `${baseUrl}/brands/${brand.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const blogPages = (await getAllPosts()).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages, ...productPages, ...categoryPages, ...brandPages];
}
