import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Translates site text to French once, saves it, and serves the saved copy after that.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.TRANSLATE_MODEL ?? process.env.CHAT_MODEL ?? "claude-haiku-4-5-20251001";
const LANG = "fr";

const SYSTEM = `You translate text from the Canuck Motors website (a Canadian auto parts store) from English into Canadian French (fr-CA), as written in Quebec.
Write natural, professional retail French. Use Quebec usage: courriel, magasiner, clavarder, NIV (for VIN).
Glossary: water pump = pompe à eau; brake pads = plaquettes de frein; brake shoes = segments de frein; timing belt kit = ensemble de courroie de distribution; impeller = turbine; pulley = poulie; housing = boîtier; back housing = boîtier arrière; gasket = joint d'étanchéité; seal = joint; bearing = roulement; hub = moyeu; flange = bride; OE number = numéro d'origine (OE); interchange number = numéro d'interchangeabilité; trim = version; engine = moteur; inches = pouces; Not sure = Je ne suis pas sûr; None of these = Aucune de ces réponses.
Never translate or change: brand and model names (Ford, F-150, Canuck Motors, Axel, Amazon, Stripe), part numbers (CM1253260), OE and interchange numbers, VINs, URLs, email addresses, prices, numbers and measurements (only translate unit words like inches).
Keep formatting exactly: markdown, links [text](url) (translate the text, keep the url), line breaks, bullets and punctuation symbols.
If a text is already French, or has nothing to translate, return it unchanged.
Input: a JSON array of strings. Output: ONLY a JSON array of the same length, translations in the same order.`;

// Simple per-visitor limit so the endpoint cannot be used as a free translator
const hits = new Map<string, { n: number; reset: number }>();
function allowed(ip: string, n: number) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n, reset: now + 60_000 });
    return true;
  }
  h.n += n;
  return h.n <= 600;
}

const hashOf = (t: string) => createHash("sha256").update(t).digest("hex");

async function translateBatch(texts: string[]): Promise<(string | null)[]> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: Math.min(8000, 400 + Math.ceil(texts.join("").length / 1.5)),
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(texts) }],
  });
  const out = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = out.slice(out.indexOf("["), out.lastIndexOf("]") + 1);
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr) && arr.length === texts.length) return arr.map((x) => (typeof x === "string" ? x : null));
  } catch {}
  // One by one if the batch answer could not be read
  if (texts.length > 1) {
    const each = [];
    for (const t of texts) each.push((await translateBatch([t]))[0]);
    return each;
  }
  return [null];
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const texts: string[] = Array.isArray(body?.texts)
    ? body.texts.filter((t: unknown) => typeof t === "string" && t.trim()).slice(0, 50).map((t: string) => t.slice(0, 5000))
    : [];
  if (!texts.length) return NextResponse.json({ translations: [] });

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!allowed(ip, texts.length)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const db = createAdminClient();
  const hashes = texts.map(hashOf);
  const saved = new Map<string, string>();
  const { data, error } = await db.from("translations").select("hash, translated").eq("lang", LANG).in("hash", hashes);
  if (error) console.error("Translation lookup failed:", error.message);
  for (const r of data ?? []) saved.set(r.hash, r.translated);

  const missing = texts.filter((_, i) => !saved.has(hashes[i]));
  if (missing.length && process.env.ANTHROPIC_API_KEY) {
    // Batches of ~6000 characters
    const batches: string[][] = [];
    let cur: string[] = [];
    let size = 0;
    for (const t of missing) {
      if (cur.length && size + t.length > 6000) { batches.push(cur); cur = []; size = 0; }
      cur.push(t);
      size += t.length;
    }
    if (cur.length) batches.push(cur);

    const rows: { hash: string; lang: string; source: string; translated: string }[] = [];
    await Promise.all(
      batches.map(async (b) => {
        try {
          const fr = await translateBatch(b);
          b.forEach((t, i) => {
            const v = fr[i];
            if (v) {
              saved.set(hashOf(t), v);
              rows.push({ hash: hashOf(t), lang: LANG, source: t, translated: v });
            }
          });
        } catch (e: any) {
          console.error("Translation failed:", e?.message ?? e);
        }
      }),
    );
    if (rows.length) {
      const { error: upErr } = await db.from("translations").upsert(rows, { onConflict: "hash,lang" });
      if (upErr) console.error("Saving translations failed:", upErr.message);
    }
  }

  return NextResponse.json({ translations: texts.map((_, i) => saved.get(hashes[i]) ?? null) });
}
