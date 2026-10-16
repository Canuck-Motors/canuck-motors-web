import { getAllPosts } from "@/lib/blog-store";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// A plain-text site summary that AI assistants can read (llmstxt.org style)
export async function GET() {
  const posts = await getAllPosts();
  const text = `# Canuck Motors

> Canadian-owned online auto parts store and brand: water pumps, brake parts, timing kits and more, with a year/make/model/VIN finder so you get the part that fits.

## Shop
- [All auto parts](${baseUrl}/products): search by year, make, model or VIN
- [Categories](${baseUrl}/categories)
- [Brands](${baseUrl}/brands)
- [Deals](${baseUrl}/deals)

## About
- [Company](${baseUrl}/about)
- [Products](${baseUrl}/about/product)
- [Manufacturer](${baseUrl}/about/manufacturer)

## Blog (buying guides and news)
${posts.map((p) => `- [${p.title}](${baseUrl}/blog/${p.slug}): ${p.description}`).join("\n")}

## Contact
contactus@canuckmotors.ca
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
