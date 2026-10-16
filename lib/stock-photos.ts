// Free-to-use photos from Unsplash and Pexels (both licences allow commercial use; we show the credit).
// Needs UNSPLASH_ACCESS_KEY and/or PEXELS_API_KEY in .env.local. With neither, no photos are added.
export type StockPhoto = {
  url: string;
  source: "Unsplash" | "Pexels";
  credit: string;
  creditUrl: string;
  pageUrl: string;
  track?: string; // Unsplash asks us to ping this when a photo is used
};

const UTM = "utm_source=canuck_motors&utm_medium=referral";

async function unsplash(query: string): Promise<StockPhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY is not set (check .env.local and restart the dev server)");
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`Unsplash answered ${res.status} (${res.status === 401 ? "the key is wrong: use the Access Key, not the Secret Key" : res.status === 403 ? "request limit reached" : "unexpected error"})`);
  const json = (await res.json()) as {
    results?: { urls: { regular: string }; user: { name: string; links: { html: string } }; links: { html: string; download_location: string } }[];
  };
  return (json.results ?? []).map((r) => ({
    url: r.urls.regular,
    source: "Unsplash" as const,
    credit: r.user.name,
    creditUrl: `${r.user.links.html}?${UTM}`,
    pageUrl: `${r.links.html}?${UTM}`,
    track: r.links.download_location,
  }));
}

async function pexels(query: string): Promise<StockPhoto[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY is not set");
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
    { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`Pexels answered ${res.status}`);
  const json = (await res.json()) as {
    photos?: { url: string; photographer: string; photographer_url: string; src: { large2x: string } }[];
  };
  return (json.photos ?? []).map((p) => ({
    url: p.src.large2x,
    source: "Pexels" as const,
    credit: p.photographer,
    creditUrl: p.photographer_url,
    pageUrl: p.url,
  }));
}

export async function searchStockPhotos(query: string, max = 3, exclude: Set<string> = new Set()): Promise<{ photos: StockPhoto[]; note: string }> {
  if (!query.trim()) return { photos: [], note: "No photo search words." };
  const notes: string[] = [];
  const grab = (p: Promise<StockPhoto[]>, name: string) =>
    p.catch((e: unknown) => {
      const m = e instanceof Error ? e.message : String(e);
      // a missing key is fine when the other site is set up
      notes.push(m);
      console.error(`${name} photo search failed:`, m);
      return [] as StockPhoto[];
    });
  const [a0, b0] = await Promise.all([grab(unsplash(query), "Unsplash"), grab(pexels(query), "Pexels")]);
  // never reuse a photo another article already uses; shuffle the best matches so repeat topics get different pictures
  const fresh = (list: StockPhoto[]) => {
    const unused = list.filter((p) => !exclude.has(p.url));
    const top = unused.slice(0, 10);
    for (let i = top.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top[i], top[j]] = [top[j], top[i]];
    }
    return [...top, ...unused.slice(10)];
  };
  const a = fresh(a0);
  const b = fresh(b0);
  const out: StockPhoto[] = [];
  for (let i = 0; out.length < max && (i < a.length || i < b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (out.length < max && b[i]) out.push(b[i]);
  }
  const note = out.length ? "" : notes.length ? notes.join(" | ") : `No photos found for "${query}".`;
  return { photos: out, note };
}

// Unsplash's rule: tell them when a photo is actually used
export async function trackUse(photos: StockPhoto[]) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return;
  await Promise.all(
    photos
      .filter((p) => p.track)
      .map((p) => fetch(p.track!, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(5000) }).catch(() => null)),
  );
}
