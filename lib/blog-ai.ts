import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { findVerifiedProductsForVehicle, searchCatalog } from "@/lib/catalog";
import { imageUrl } from "@/lib/product-images";
import { searchStockPhotos, trackUse, type StockPhoto } from "@/lib/stock-photos";
import { extractFaq, sanitizeHtml } from "@/lib/sanitize-html";

// The AI blog pipeline. Four steps, each one a separate call so the admin page can show progress:
//   1 research  ->  2 tailor  ->  3 humanize  ->  4 save as a draft (admin publishes)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.BLOG_MODEL ?? "claude-sonnet-4-5";

export type BlogMode = "guide" | "news";
export type Source = { title: string; url: string };
export type ProductFact = { name: string; sku: string | null; price: number | null; position: string | null; url: string; image: string | null };

export type Research = {
  mode: BlogMode;
  topic: string;
  notes: string;
  sources: Source[];
  products: ProductFact[];
  photos: StockPhoto[];
  photoNote: string;
};

export type Draft = {
  title: string;
  heading: string;
  description: string;
  excerpt: string;
  slug: string;
  body: string;
};

const today = () =>
  new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Vancouver" });

const BRAND = `Canuck Motors is a Canadian-owned online auto parts store and brand (water pumps, brake parts, timing kits and more), shipping across Canada. Contact: contactus@canuckmotors.ca. Do not invent warranties, prices, shipping times, awards, statistics or customer quotes.`;

type Block = { type: string; text?: string; citations?: { url?: string; title?: string }[]; content?: unknown };

async function ask(system: string, user: string, opts: { search?: boolean; maxTokens?: number } = {}) {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  const sources = new Map<string, string>();
  let text = "";

  for (let turn = 0; turn < 4; turn++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 6000,
      system,
      messages,
      ...(opts.search
        ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] }
        : {}),
    } as Anthropic.MessageCreateParamsNonStreaming);

    for (const b of res.content as unknown as Block[]) {
      if (b.type === "text" && b.text) {
        text += b.text;
        for (const c of b.citations ?? []) if (c.url) sources.set(c.url, c.title || c.url);
      }
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content as { url?: string; title?: string }[]) {
          if (r.url && !sources.has(r.url)) sources.set(r.url, r.title || r.url);
        }
      }
    }
    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }
  return { text: text.trim(), sources: Array.from(sources, ([url, title]) => ({ url, title })) };
}

const tag = (text: string, name: string) => {
  const m = text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

async function context() {
  const db = createAdminClient();
  const [{ data: cats }, { data: posts }] = await Promise.all([
    db.from("product_categories").select("category_name, slug").eq("is_active", true).eq("is_delete", false),
    db.from("blog_posts").select("title"),
  ]);
  return {
    categories: (cats ?? []) as { category_name: string; slug: string }[],
    existing: ((posts ?? []) as { title: string }[]).map((p) => p.title),
  };
}

// ---------------------------------------------------------------- 1. research
export async function researchStep(mode: BlogMode | "auto", topicHint: string): Promise<Research> {
  const ctx = await context();
  const system = `You are the research editor for the Canuck Motors blog. ${BRAND} Today is ${today()}.`;
  const task =
    mode === "news"
      ? `Find ONE genuinely important, recent (last 30 days) news item that matters to Canadian car owners buying replacement parts (recalls, tariffs and prices, regulations, cold-weather or seasonal issues, supply news). Use web search. Only report what the sources say.`
      : mode === "guide"
        ? `Research a practical buying-guide topic: how a car owner picks the RIGHT part when several versions exist for the same vehicle (engine size, position front/rear, trim, kit vs single part, fitment differences). Use web search for accurate technical facts.`
        : `The admin wants an article about the topic below. Decide whether it is a news explainer (then find the recent, reliable news with web search) or a practical buying guide (then research accurate technical facts and what differs between versions of the part). Use web search.`;
  const user = `${task}
${topicHint ? `Topic requested by the admin: ${topicHint}` : "Choose the topic yourself."}
Store categories: ${ctx.categories.map((c) => c.category_name).join(", ") || "n/a"}.
Blog posts we already have (do not repeat): ${ctx.existing.join(" | ") || "none"}.

Reply in exactly this form:
MODE: <guide or news>
TOPIC: <working article topic, one line>
VEHICLE: <make | model if the topic is about ONE specific vehicle, e.g. "Ford | Mustang" or "Ford | F-150"; otherwise "none">
PART: <the part in 1-3 words, e.g. "water pump", "brake pad", or "none">
PHOTO: <2-3 word stock-photo search. If the topic names a vehicle, use ONLY the vehicle (e.g. "ford mustang", "ford f-150 truck"), never the part. Otherwise a general car-part scene such as "car engine" or "brake disc">
NOTES:
<concise bullet notes: verified facts, numbers, dates, what readers ask, common mistakes. Note which source each fact came from (for checking only). If you are unsure of a fact, leave it out.>`;

  let res: Awaited<ReturnType<typeof ask>>;
  try {
    res = await ask(system, user, { search: true, maxTokens: 4000 });
  } catch (e) {
    console.error("Blog research with web search failed, retrying without it:", e);
    res = await ask(system, user + "\nWeb search is unavailable: use only well-established knowledge and avoid dates or news claims.", { maxTokens: 3000 });
  }

  const topic = (res.text.match(/^TOPIC:\s*(.+)$/im)?.[1] ?? topicHint ?? "").trim();

  const photoQuery = (res.text.match(/^PHOTO:\s*(.+)$/im)?.[1] ?? topic).trim();
  const { data: usedRows } = await createAdminClient().from("blog_posts").select("photos");
  const used = new Set<string>();
  for (const row of (usedRows ?? []) as { photos?: { url: string }[] | null }[]) for (const ph of row.photos ?? []) used.add(ph.url);
  let { photos, note: photoNote } = await searchStockPhotos(photoQuery, 3, used);
  if (photos.length === 0 && photoQuery.split(/\s+/).length > 2) {
    ({ photos, note: photoNote } = await searchStockPhotos(photoQuery.split(/\s+/).slice(0, 2).join(" "), 3, used));
  }
  const found_mode = /^MODE:\s*news/im.test(res.text) ? "news" : "guide";
  const notes = res.text.split(/^NOTES:\s*$/im)[1]?.trim() || res.text;
  if (!topic) throw new Error("The AI did not come back with a topic. Try again.");

  // Only products that are VERIFIED to be right are shown.
  //  - topic about a vehicle: only parts our fitment data says fit that make and model
  //  - topic about a part in general: only products whose name really is that part
  const vehicleLine = (res.text.match(/^VEHICLE:\s*(.+)$/im)?.[1] ?? "none").trim();
  const partLine = (res.text.match(/^PART:\s*(.+)$/im)?.[1] ?? "none").trim();
  const partWords = /^none$/i.test(partLine) ? [] : partLine.toLowerCase().split(/\s+/).filter(Boolean);
  const [vMake, vModel] = vehicleLine.split("|").map((x) => x.trim());
  let found: { id: number; product_name: string; sku: string | null; price: number | null; position: string | null; url: string }[] = [];
  if (partWords.length > 0) {
    if (vMake && vModel && !/^none$/i.test(vMake)) {
      found = (await findVerifiedProductsForVehicle(vMake, vModel, partWords, 6).catch(() => [])).map((p) => ({ ...p, product_name: p.name }));
    } else if (/^none$/i.test(vehicleLine)) {
      const generic = await searchCatalog(partWords.join(" "), 8).catch(() => []);
      found = generic.filter((p) => partWords.every((w) => p.product_name.toLowerCase().includes(w.replace(/s$/, "")))).slice(0, 4);
    }
  }
  const images = new Map<number, string>();
  if (found.length) {
    const { data } = await createAdminClient()
      .from("product_images")
      .select("product_id, path, sort_order")
      .in("product_id", found.map((p) => p.id))
      .order("sort_order");
    for (const row of (data ?? []) as { product_id: number; path: string }[]) {
      if (!images.has(row.product_id)) images.set(row.product_id, imageUrl(row.path));
    }
  }
  const products: ProductFact[] = found.map((p) => ({
    name: p.product_name,
    sku: p.sku,
    price: p.price,
    position: p.position,
    url: p.url,
    image: images.get(p.id) ?? null,
  }));

  return { mode: mode === "auto" ? found_mode : mode, topic, notes, sources: res.sources.slice(0, 8), products, photos, photoNote: photos.length ? "" : `${photoNote} (search: "${photoQuery}")` };
}

// ---------------------------------------------------------------- 2. tailor
const OUTPUT_FORMAT = `Reply with ONLY these tags:
<title>SEO title, max 60 characters, no brand name</title>
<heading>Page H1, natural, can be longer</heading>
<description>Meta description, 140-155 characters, makes people click</description>
<excerpt>One or two sentences for the blog card</excerpt>
<slug>short-url-slug</slug>
<body>the article HTML</body>`;

export async function tailorStep(r: Research): Promise<Draft> {
  const ctx = await context();
  const links = [
    "/products (all parts, has the year/make/model finder)",
    "/categories",
    ...ctx.categories.slice(0, 30).map((c) => `/categories/${c.slug} (${c.category_name})`),
    "/brands",
    "/about/manufacturer",
    ...r.products.map((p) => `${p.url} (${p.name})`),
  ];

  const system = `You write blog articles for Canuck Motors that rank in Google and get quoted by AI assistants (ChatGPT, Gemini, Perplexity). ${BRAND} Today is ${today()}.`;
  const user = `Write the article from this research.

TOPIC: ${r.topic}
TYPE: ${r.mode === "news" ? "news explainer: what happened, why it matters to Canadian drivers, what to do" : "buying guide: how to choose the right part when there are several options"}

RESEARCH NOTES:
${r.notes}

SOURCES (for your background only. NEVER name, quote, mention or link any website, store, retailer, forum or other auto-parts seller in the article. State the facts in our own words without attribution. Only name car makers or official standards bodies when needed): ${r.sources.map((s) => s.title).join("; ") || "none"}

OUR VERIFIED PRODUCTS (our fitment data confirms these fit the vehicle in the topic, for some model years and engines; only mention these, only these facts; never claim a specific year or engine fits, tell the reader to confirm with the vehicle finder or their VIN):
${r.products.map((p) => `- ${p.name}${p.sku ? ` [${p.sku}]` : ""}${p.position ? ` (${p.position})` : ""}${p.price ? ` $${p.price}` : ""} ${p.url}${p.image ? ` | photo: ${p.image}` : ""}`).join("\n") || "none: do NOT name, link or show any specific product, and do not say we stock one; point to the vehicle finder (/products) instead"}

LINKS YOU MAY USE (internal, use 3 to 6, never invent a link): 
${links.join("\n")}

REQUIREMENTS
- 900 to 1300 words, Canadian spelling, plain clear language for a car owner.
- Allowed HTML only: p, h2, h3, ul, ol, li, strong, em, a, table, thead, tbody, tr, th, td, blockquote, figure, img, figcaption. No inline style, no h1.
- Start with <blockquote><strong>Quick answer:</strong> 2 to 3 sentences that fully answer the topic on their own</blockquote>.
- Section headings (h2) written as the questions people actually ask. Give the first two h2 an id attribute (lowercase-hyphen).
- Where options exist, include one comparison <table> (what differs, how to tell which one you have).
- Include a short numbered "how to check" list.
- Product photos: where a product above has a "photo:" URL, show up to 3 of them, each next to the section that discusses it, exactly like <figure><img src="PHOTO_URL" alt="specific descriptive alt text"><figcaption><a href="PRODUCT_URL">Product name</a></figcaption></figure>. Use only the photo URLs given. Never invent image URLs.
- Finish with <h2 id="faq">Frequently asked questions</h2> then 4 to 5 <h3>question</h3><p>answer</p> pairs (answers 1 to 3 sentences).
- End with a short paragraph pointing to the vehicle finder (/products) or our contact email.
- Never mention competitor websites, retailers, forums or brands of other auto-parts sellers, and never link outside canuckmotors pages.
- Only state facts supported by the notes or by common, well-established mechanical knowledge. If unsure, say so or leave it out.
${OUTPUT_FORMAT}`;

  const res = await ask(system, user, { maxTokens: 7000 });
  return parseDraft(res.text);
}

function parseDraft(text: string): Draft {
  const body = tag(text, "body");
  const title = tag(text, "title");
  if (!body || !title) throw new Error("The AI answer was incomplete. Try again.");
  const heading = tag(text, "heading") || title;
  return {
    title: title.slice(0, 70),
    heading,
    description: tag(text, "description").slice(0, 160),
    excerpt: tag(text, "excerpt") || tag(text, "description"),
    slug: slugify(tag(text, "slug") || title),
    body,
  };
}

// ---------------------------------------------------------------- 3. humanize
export async function humanizeStep(d: Draft): Promise<Draft> {
  const system = `You are a veteran automotive writer and editor. You make AI-written drafts read like a real person wrote them. ${BRAND}`;
  const user = `Rewrite this article so it sounds human, warm and confident, like a knowledgeable Canadian mechanic explaining something to a friend.

RULES
- Keep every fact, number, link, <figure> and <img> tags exactly as they are, HTML tag structure, id attribute, the Quick answer box, the table and the FAQ section (h2 id="faq" with h3 + p pairs). Do not add new facts or claims.
- Vary sentence length. Use contractions. Use concrete, specific wording. Short paragraphs.
- Remove AI giveaways: "delve", "in today's fast-paced world", "it's important to note", "navigate", "landscape", "unlock", "game-changer", "comprehensive guide", "look no further", stacked triplets, and empty openers. At most two em dashes in the whole piece.
- Keep length within 10% of the original. Keep the title and description honest and clickable.

${OUTPUT_FORMAT}

CURRENT DRAFT
<title>${d.title}</title>
<heading>${d.heading}</heading>
<description>${d.description}</description>
<excerpt>${d.excerpt}</excerpt>
<slug>${d.slug}</slug>
<body>${d.body}</body>`;

  const res = await ask(system, user, { maxTokens: 7000 });
  return parseDraft(res.text);
}

// ---------------------------------------------------------------- photos
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const GENERIC_PUMP_PHOTOS = [
  { src: "/about/impeller.png", alt: "Water pump impeller", caption: "The impeller pushes coolant through your engine." },
  { src: "/about/housing.png", alt: "Water pump housing", caption: "The housing holds everything in place." },
  { src: "/about/waterseal.png", alt: "Water pump seal", caption: "A worn seal is a common cause of coolant leaks." },
];

// Makes sure the article has pictures even if the AI skipped them: real product photos first
function ensurePhotos(body: string, r: Research) {
  if (/<img /i.test(body)) return body;
  let figs = r.products
    .filter((p) => p.image)
    .slice(0, 3)
    .map(
      (p) =>
        `<figure><img src="${p.image}" alt="${esc(p.name)} from Canuck Motors" loading="lazy"><figcaption><a href="${p.url}">${esc(p.name)}</a></figcaption></figure>`,
    );
  if (figs.length === 0 && /water\s*pump/i.test(r.topic)) {
    figs = GENERIC_PUMP_PHOTOS.map(
      (g) => `<figure><img src="${g.src}" alt="${g.alt}" loading="lazy"><figcaption>${g.caption}</figcaption></figure>`,
    );
  }
  if (figs.length === 0) return body;

  // put one photo after the first paragraph that follows each of the first h2 headings
  const parts = body.split(/(?=<h2)/i);
  let used = 0;
  for (let i = 1; i < parts.length && used < figs.length; i++) {
    if (/id="faq"/i.test(parts[i])) continue;
    parts[i] = parts[i].replace(/<\/p>/i, (m) => `${m}${figs[used++]}`);
  }
  // leftovers go right after the quick-answer box
  let out = parts.join("");
  if (used < figs.length) out = out.replace(/<\/blockquote>/i, (m) => `${m}${figs.slice(used).join("")}`);
  return out;
}

// ---------------------------------------------------------------- 4. save (as draft)
export async function saveDraft(d: Draft, r: Research, generatedBy: "admin" | "auto") {
  const db = createAdminClient();
  const verified = new Set(r.products.map((p) => p.url));
  const clean = sanitizeHtml(d.body).replace(/<figure>[\s\S]*?<\/figure>/gi, (fig) => {
    const href = fig.match(/href="([^"]+)"/i)?.[1];
    return href && verified.has(href) ? fig : "";
  });
  // never let photo-credit text into an article body
  const noCredit = clean
    .replace(/<(p|figcaption|li)>[^<]*\b(photo|image|picture)s?\s+(by|from|courtesy)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(p|figcaption|li)>(?:(?!<\/\1>)[\s\S])*\b(unsplash|pexels)\b[\s\S]*?<\/\1>/gi, "");
  const body = ensurePhotos(noCredit, r);
  if (body.length < 400) throw new Error("The article came out too short. Try again.");

  let slug = d.slug || slugify(d.title) || `post-${Date.now()}`;
  for (let i = 2; i < 50; i++) {
    const { data } = await db.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${slugify(d.slug || d.title)}-${i}`;
  }

  await trackUse(r.photos);
  const { data, error } = await db
    .from("blog_posts")
    .insert({
      slug,
      title: d.title,
      heading: d.heading,
      description: d.description,
      excerpt: d.excerpt,
      body_html: body,
      cover: r.products.find((p) => p.image)?.image ?? "/about/manufacturer-hero.jpg",
      photos: r.photos.map((p) => ({ url: p.url, source: p.source, credit: p.credit, creditUrl: p.creditUrl, pageUrl: p.pageUrl })),
      faq: extractFaq(body),
      sources: [],
      topic: r.topic,
      mode: r.mode,
      generated_by: generatedBy,
      status: "draft",
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);
  return {
    ...(data as { id: number; slug: string }),
    products: r.products.length,
    photos: (body.match(/<img /gi) ?? []).length,
    stock: r.photos.length,
    photoNote: r.photoNote,
  };
}

// Whole pipeline in one go (used by the 15-day scheduled run)
export async function generateWholePost(mode: BlogMode, topic: string, generatedBy: "admin" | "auto") {
  const research = await researchStep(mode, topic);
  const tailored = await tailorStep(research);
  const human = await humanizeStep(tailored);
  return saveDraft(human, research, generatedBy);
}
