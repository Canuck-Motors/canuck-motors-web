import { decodeVin } from "@/lib/catalog";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { listCategories } from "@/lib/parts";
import {
  findPartsByVin,
  findPartsForVehicle,
  searchCatalog,
  type CatalogProduct,
} from "@/lib/catalog";
import { isSpecMessage } from "@/lib/axel-narrow";
import { shippingNote } from "@/lib/shipping-note";
import {
  findPart,
  matchPartNumber,
  readAnswers,
  interpretText,
  DEFAULT_MAX_QUESTIONS,
  NOT_SURE,
  type Answer,
  type FinderResult,
} from "@/lib/part-finder";
import { getRefs, getSpecs } from "@/lib/part-finder-data";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CHAT_MODEL ?? "claude-haiku-4-5-20251001";

const SYSTEM = `You are Axel, the Canuck Motors parts assistant. Your goal is that the customer ends up with the exact, correct part, so nothing gets returned. Write like a quick text message: ONE or TWO short sentences (under 25 words), one question at a time. No long explanations, no lists, no bold headings.

How to work:
1. Find out which part they need (call list_categories if unsure which parts we sell today, and never offer or promise a part that is not in that list).
2. Once you know the part, ask for the vehicle in ONE short line, exactly like: "Which vehicle is it for? Year, make and model, or paste your VIN." Do not explain the VIN yet. Identify the vehicle in one of two ways:
   a. VIN (most accurate). If the customer's message contains a 17-character VIN, call find_parts_by_vin right away, with the part they asked for earlier.
   b. Year, make and model. As soon as you know all three, call find_parts_for_vehicle immediately, even if you don't know the engine yet.
3. NEVER list, guess or recall engines, models, trims or part numbers from your own memory. The tools return the real options and the customer sees them as buttons.
4. Only if the customer says they don't know their vehicle details, or asks where the VIN is, give this in one short line: "Your VIN is on the driver's side windshield corner, the door jamb sticker, or your insurance card. Paste it here." Never send them hunting for the engine or trim: use the buttons or the VIN.

Reading tool results (find_parts_for_vehicle and find_parts_by_vin):
- status "choose": ask ONE short question for that level (for example "Which engine does your 2004 Ford F-150 have?"). The options appear as buttons, so do not list them.
- status "not_found": for a VIN search, first say what the VIN decoded to using vin_summary (include the trim). Then say what we couldn't find, ask them to double-check it, or offer to use their VIN instead.
- status "ok": write one or two short sentences. Confirm the vehicle using the "vehicle" text. For a VIN search, say what the VIN decoded to using vin_summary, and ALWAYS include the trim from it when it has one (never drop the trim). Do NOT list, count or describe products (never say how many were found): they appear automatically below your message. If "positions" has more than one value (for example Front and Rear) and the customer didn't say which one they need, add one line asking which. If available_trims is not empty, add one short line saying they can tell you their trim to double-check. Do not name trims yourself.
- status "need_part": ask which part they need, in one short line.
- If the result has engine_note, say it in one short sentence. NEVER ask for the engine again after the customer said they are not sure.
- If the result has trim_note, say it in one short sentence (the parts fit every trim in our catalog).
- status "not_found" for trim: say we couldn't match that trim and show nothing as fitting. NEVER say parts "should still fit" or guess.
- status "no_products": say we couldn't find a matching part for that vehicle and suggest contacting the team.
- status "confirm_vehicle": the VIN may contain a typo. Do NOT list products. Say the VIN looks slightly off and reads as a {year} {make} {model} with {engine} (from vin_vehicle), and ask if that is their vehicle. Yes/No buttons appear automatically. If they say yes, call find_parts_for_vehicle with that year, make, model, engine (use engine_liters) and the part. If they say no, ask them to re-check the VIN or give the year, make and model.
- status "invalid_vin": the VIN has the wrong length or invalid characters. Explain using the message, and ask them to re-check it or give the year, make and model instead.
- status "not_decoded" or "error": say we couldn't read that right now and ask for the year, make and model instead.

Other rules:
- If the customer forgot their password, username or email: customers sign in with their email address. Send them to [Forgot password](/auth/forgot-password) to reset it by email, or the [login page](/login). Never say you can't help with this.
- Whenever the customer gives or changes the trim, engine, model, year, make or part, ALWAYS call find_parts_for_vehicle again with ALL the details known so far (year, make, model, engine, trim, part). Never answer from the earlier results and never say results are "the same" or that a part "will fit" without a new tool call.
- Products, SKUs and prices come only from tool results. Never invent them.
- Never state, guess or assume any detail of a part (bolts, pulley, drive type, material, size, anything) that is not written in a tool result, and never pick one part over another yourself. When a search has more than one possible part, only the search narrows it: if the customer describes their old part, call find_parts_for_vehicle again with the active search details; if it is still not settled, ask for the number printed on the old part or the VIN. Saying "that's your match" without a tool result showing a single part is a serious mistake: the customer buys the wrong part.
- Only say a part fits if find_parts_for_vehicle or find_parts_by_vin returned it.
- Any time the customer types something that looks like a part number (for example CM-1252102, cm1252102, an OE number, or a number from another brand such as AC Delco or Gates), call search_catalog with exactly what they typed. It ignores case, dashes and spaces and checks our own catalog: our CM numbers, every OE number and every interchange / cross-reference number we have stored.
- Each product it returns has match.exact. ONLY when match.exact is true may you say it is the Canuck Motors equivalent, and name match.via (for example "matches OE number ACDelco 252544"). If match.exact is false, say it is only a similar result and NOT a confirmed match. Never call a similar-looking number a match.
- If search_catalog returns several products, check each one's match.via; if there are no results, try again once with the number in any other form the customer gave (for example the number without its brand name) before saying nothing was found. Only claim a web search if you really ran web_search.
- When you present a matched part, give its name, price, availability (in_stock = in stock, low_stock = low stock, out_of_stock = out of stock, unknown = say you can't confirm stock) and link. Then ask for the vehicle or VIN and call find_parts_for_vehicle / the VIN tool to verify fitment; only say it fits if that result lists the part.
- If search_catalog finds NOTHING for a part number from another brand (status no_results), you MUST call web_search before replying; never answer "nothing found" and ask for details until you have tried it. Use web_search (at most 3 searches) to find out what that number is: which part type it is and which vehicles (year, make, model, engine) it fits, and other numbers the web lists as equivalent. Then: (a) call search_catalog for each equivalent number you found and only treat exact matches as confirmed; (b) call find_parts_for_vehicle with the vehicle and part type from the web result, to see which Canuck Motors parts our own fitment data lists for that vehicle. Tell the customer plainly that the vehicle information came from web sources, and that only the fitment shown by our catalog counts. If the web result names one or more vehicles, do NOT ask the customer which vehicle it is: immediately call find_parts_for_vehicle for the most specific application the web lists (year, make, model, engine) and show what our catalog has. Only ask for the vehicle when the web gives none. Present our parts as "possible alternatives for that vehicle", never as an exact replacement for their number unless search_catalog matched it exactly. If the web result is unclear or conflicting, say so and ask for the vehicle or VIN instead of guessing.
- If the customer asks for the trim, engine or model of a VIN (or wants to know what a VIN is), call decode_vin and answer from its result. If trim is missing, say the VIN data does not list a trim (the VIN identifies the vehicle but not always the trim level) and, if useful, share the series, drive and engine it did give. Do not send them to their registration or insurance card for that.
- search_catalog does NOT confirm fitment: say so and ask for the vehicle or VIN to confirm.
- Always pass the customer's part in the "part" field of the vehicle and VIN tools. Never say a part is "in stock" or "available".
- If the customer asks for a category list, use list_categories.
- If the customer says a question was repeated or asks what fits their vehicle, say sorry in one short sentence and call find_parts_for_vehicle again with the details of the active search (given below when there is one). Never claim a part fits or is shown unless a tool result returned it.
- Whenever you mention the customer's vehicle, give it in full: year, make, model, trim and engine (litres and cylinders) when known, e.g. "2024 Ford F-150 XLT with the 2.7L 6-cylinder".
- If the customer sends a VIN before saying which part they need, say what it decodes to (in full) and ask which part they need. Never say whether we have parts for the vehicle until a find_parts tool with the part has returned.
- Politely decline unrelated topics.`;

const tools: Anthropic.ToolUnion[] = [
  // Lets Axel research an unknown OE / aftermarket number on the web
  { type: "web_search_20250305", name: "web_search", max_uses: 3 } as any,
  {
    name: "find_parts_for_vehicle",
    description:
      "Find parts that fit a vehicle, using the same fitment rules as the website. Call it as soon as you know year, make and model. Add engine and trim only when the customer has chosen them.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "integer" },
        make: { type: "string" },
        model: { type: "string" },
        engine: { type: "string", description: "Engine the customer chose, e.g. 5.4L" },
        trim: { type: "string", description: "Trim the customer chose" },
        any_engine: {
          type: "boolean",
          description: "true when the customer says they do not know their engine. Never ask for the engine twice.",
        },
        part: {
          type: "string",
          description:
            "Core part name only, e.g. 'water pump', 'brake pad', 'timing belt kit'",
        },
      },
      required: ["year", "make", "part"],
    },
  },
  {
    name: "find_parts_by_vin",
    description:
      "Decode a 17-character VIN and find parts that fit that exact vehicle and engine.",
    input_schema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "The 17-character VIN" },
        part: {
          type: "string",
          description: "Core part name only, e.g. 'water pump'",
        },
      },
      required: ["vin", "part"],
    },
  },
  {
    name: "decode_vin",
    description:
      "Decode a VIN into year, make, model, trim, engine and body, with no part needed. Use it when the customer asks what their VIN is, or asks for the trim or engine of a VIN.",
    input_schema: {
      type: "object",
      properties: { vin: { type: "string", description: "The 17-character VIN" } },
      required: ["vin"],
    },
  },
  {
    name: "search_catalog",
    description:
      "Search by part number, OE number, interchange number or product name. Same search as the website search bar. Does NOT confirm fitment.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Search text" } },
      required: ["query"],
    },
  },
  {
    name: "list_categories",
    description: "List all active part categories",
    input_schema: { type: "object", properties: {} },
  },
];

const realPart = (part: unknown) => {
  const p = String(part ?? "").trim();
  return !!p && !/^<.*>$/.test(p) && !/^(unknown|n\/?a|none|any|all|part|parts|null|undefined|\?+)$/i.test(p);
};

async function runTool(name: string, input: any) {
  try {
    // No real part yet (empty, or a placeholder the model filled in such as "<unknown>"):
    // ask the customer instead of searching
    if (
      (name === "find_parts_for_vehicle" || name === "find_parts_by_vin") &&
      !realPart(input.part)
    ) {
      return {
        status: "need_part",
        message: "Ask the customer which part they need before searching.",
      };
    }

    if (name === "find_parts_for_vehicle") {
      return await findPartsForVehicle({
        year: Number(input.year),
        make: String(input.make ?? ""),
        model: input.model ? String(input.model) : undefined,
        engine: input.engine ? String(input.engine) : undefined,
        trim: input.trim ? String(input.trim) : undefined,
        part: input.part ? String(input.part) : undefined,
        anyEngine: input.any_engine === true,
      });
    }

    if (name === "find_parts_by_vin") {
      return await findPartsByVin(
        String(input.vin ?? ""),
        input.part ? String(input.part) : undefined,
      );
    }

    if (name === "decode_vin") return await decodeVin(String(input.vin ?? ""));

    if (name === "search_catalog") {
      const products = await searchCatalog(String(input.query ?? ""));
      if (products.length) return { status: "ok", products };
      const q = String(input.query ?? "");
      const looksLikeNumber = /\d{4,}/.test(q.replace(/[\s-]/g, ""));
      return {
        status: "no_results",
        products,
        ...(looksLikeNumber
          ? {
              next_step:
                "REQUIRED: this looks like another brand's part number. Do NOT reply yet. Call web_search now (for example '" +
                q +
                " OE part number fits vehicles') to learn the part type, the vehicles and equivalent numbers, then follow the web research rule.",
            }
          : {}),
      };
    }

    if (name === "list_categories") return await listCategories();

    return { status: "error", message: "Unknown tool" };
  } catch (error) {
    // A failing tool should never crash the chat
    console.error(`Tool ${name} failed:`, error);
    return { status: "error", message: "Lookup failed. Please try again." };
  }
}

const linkLabel = (text: string) => text.replace(/[\[\]()]/g, " ").replace(/\s+/g, " ").trim();

// Product lines are built by the server from tool results,
// so the model can never change or invent a product.
function formatProducts(
  items: CatalogProduct[],
  total: number,
  heading: string | null,
  vehicleUrl: string | null,
  detailLines?: Map<number, string[]>,
) {
  const lines = items.map((p) => {
    const label = linkLabel(
      p.sku && !p.product_name.includes(p.sku)
        ? `${p.product_name} (${p.sku})`
        : p.product_name,
    );
    const price =
      p.price !== null ? `$${Number(p.price).toFixed(2)}` : "Contact for price";
    const position = p.position ? ` · ${p.position}` : "";
    // When there are several parts, show what makes each one different.
    // Pieces that only repeat the vehicle (trim codes like STX, fuel like FLEX) are dropped.
    const repeated = /^(all|gas|flex|flexfuel|ffv|e85|cng|lpg|propane|diesel|hybrid|electric|alltypes|none)$/i;
    const details = detailLines
      ? (detailLines.get(p.id) ?? [])
      : items.length > 1 && p.notes?.length
        ? Array.from(
            new Set(
              p.notes[0]
                .split(";")
                .map((x) => x.replace(/\s+/g, " ").trim())
                .filter((x) => x && !repeated.test(x) && !/^[A-Z0-9-]{1,4}$/.test(x)),
            ),
          ).slice(0, 5)
        : [];
    return `• [${label}](${p.url}) - ${price}${position}${details.length ? `\n   ${details.join(" · ")}` : ""}`;
  });

  const out: string[] = [];
  if (heading) out.push(heading);
  out.push(...lines);
  if (!detailLines && items.length > 1 && lines.some((l) => l.includes("\n"))) {
    out.push("Compare the details above with your old part, then tap the one that matches.");
  }

  if (vehicleUrl && total > items.length) {
    out.push(`[See all ${total} parts for this vehicle](${vehicleUrl})`);
  }

  return out.join("\n");
}

type Ctx = { tool: "find_parts_for_vehicle" | "find_parts_by_vin"; input: any };

// Narrows a vehicle result with the customer's answers (lib/part-finder.ts).
// Questions, answer options and the recommendation are built from the real data of
// the parts that are still possible, and the reply text is written by the server,
// so Axel can never claim a part fits when the data does not say so.
type Presented = {
  shown: CatalogProduct[];
  total: number;
  choices: null | { level: string; options: string[]; spec?: string; send?: string[] };
  heading: string | null;
  override: string | null;
  lines?: Map<number, string[]>;
};

// Answers that are already known from the search itself
function presetAnswers(input: any, answers: Answer[]): Answer[] {
  const out = [...answers];
  // Customer said they don't know the engine: never ask for it again
  if (input?.any_engine && !out.some((a) => a.name === "Engine")) out.unshift({ name: "Engine", value: null });
  return out;
}

async function narrowResult(out: any, answers: Answer[], input?: any, maxQuestions?: number) {
  const all: CatalogProduct[] = out.products ?? [];
  const ids = all.map((p) => p.id);
  const [specs, refs] = await Promise.all([getSpecs(ids), getRefs(ids)]);
  const r = findPart(all, specs, presetAnswers(input, answers), { refs, vehicle: out.vehicle, maxQuestions });
  if (r.issues.length) console.warn("Fitment data issues:", JSON.stringify(r.issues).slice(0, 600));
  return { r, specs, refs, all };
}

// The detail lines under each part: why it matches, what sets it apart, what to check
function detailLines(r: FinderResult): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const p of r.candidates) {
    const d = r.details.get(p.id);
    if (!d) continue;
    const lines: string[] = [];
    if (r.candidates.length > 1) lines.push(...d.differences.slice(0, 5));
    else lines.push(...d.differences.filter((x) => !/^Position:/.test(x)).slice(0, 4));
    if (d.unconfirmed.length) lines.push(`Not confirmed by our data: ${d.unconfirmed.join("; ")}`);
    if (d.refs.length && r.status === "ambiguous") lines.push(`OE: ${d.refs.join(", ")}`);
    map.set(p.id, lines);
  }
  return map;
}

// After DEFAULT_MAX_QUESTIONS questions Axel shows the result; the customer can ask it to
// keep going (button or typed), which allows that many more questions each time.
const MORE_TEXT = "Keep asking me questions to find the exact part";
const MORE =
  /\b(keep asking|ask (me )?more|more questions|(more|most) accurate|exact (part|product|one|pump)|narrow (it )?down)\b/i;

function questionLimit(history: { role: string; content: string }[]) {
  let extra = 0;
  for (const m of history) {
    if (m.role !== "user") continue;
    const t = m.content.trim();
    const compact = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^(Make|Model|Engine|Trim):/i.test(t) || /\b(19[5-9]\d|20[0-4]\d)\b/.test(t) || /^[A-HJ-NPR-Z0-9]{17}$/.test(compact)) extra = 0;
    else if (MORE.test(t)) extra++;
  }
  return DEFAULT_MAX_QUESTIONS * (1 + extra);
}

async function present(out: any, answers: Answer[], input?: any, maxQuestions?: number): Promise<Presented> {
  const { r } = await narrowResult(out, answers, input, maxQuestions);
  const vehicle = out.vehicle as string | undefined;
  const base: Presented = {
    shown: r.candidates.slice(0, 8) as CatalogProduct[],
    total: r.candidates.length,
    choices: null,
    heading: null,
    override: r.message,
    lines: detailLines(r),
  };

  // Limit reached and more could be asked: offer to keep going
  if (r.moreQuestions) {
    base.choices = { level: "spec", spec: "more", options: ["Yes, keep asking"], send: [MORE_TEXT] };
  }

  switch (r.status) {
    case "question":
      // Only the question and its buttons; the parts appear once it is answered
      base.shown = [];
      base.choices = { level: "spec", spec: r.question!.name, options: r.question!.options };
      break;
    case "match":
      base.heading = vehicle ? `Best match for your ${vehicle}:` : "Best match:";
      break;
    case "likely":
      base.heading = r.candidates.length > 1 ? "Best supported first:" : "Most likely part (please verify):";
      break;
    case "equivalent":
      base.shown = [...base.shown].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
      base.heading = "These all fit, based on your answers:";
      break;
    case "ambiguous":
      base.heading = "Possible parts (not confirmed):";
      break;
    case "none": {
      base.shown = [];
      // Let the customer take back the last answer ("Not sure" replaces it)
      const last = [...r.answers].reverse().find((a) => a.value !== null && a.name !== "Engine");
      if (last) {
        base.choices = {
          level: "spec",
          spec: last.name,
          options: [`Change my answer to "${last.name}"`],
          send: [`Spec: ${last.name} = ${NOT_SURE}`],
        };
      }
      break;
    }
  }
  return base;
}

// Customer typed a number from the old part in the middle of a vehicle search:
// check it against the OE / interchange numbers of the parts that fit the vehicle.
async function presentPartNumber(out: any, answers: Answer[], text: string, input?: any): Promise<Presented | null> {
  const { r, specs, refs, all } = await narrowResult(out, answers, input);
  const hits = matchPartNumber(all, specs, refs, text);
  if (!hits.length) return null;
  const vehicle = out.vehicle ? ` your ${out.vehicle}` : " your vehicle";
  const stillOk = hits.filter((h) => r.candidates.some((c) => c.id === h.product.id));
  if (hits.length === 1) {
    const h = hits[0];
    return {
      shown: [h.product as CatalogProduct],
      total: 1,
      choices: null,
      heading: "Matched by your part number:",
      override: stillOk.length
        ? `That number matches ${h.via}, and this part is listed for${vehicle}.`
        : `That number matches ${h.via}. This part is listed for${vehicle}, but it does not agree with one of your earlier answers, so please double-check those details before ordering.`,
    };
  }
  return {
    shown: hits.map((h) => h.product as CatalogProduct),
    total: hits.length,
    choices: null,
    heading: "These parts carry that number:",
    override: `That number is listed on ${hits.length} of our parts for${vehicle}, so it does not settle it on its own.`,
    lines: new Map(hits.map((h) => [h.product.id, [`matches ${h.via}`]])),
  };
}

// A number from the old part: 5+ characters with digits, and not a year/vehicle or VIN
function looksLikePartNumber(text: string) {
  const t = text.trim();
  if (isSpecMessage(t) || /^(Make|Model|Engine|Trim):/i.test(t)) return false;
  const compact = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(compact)) return false;
  return t.split(/[\s,;/]+/).some((w) => {
    const n = w.replace(/[^A-Za-z0-9]/g, "");
    return n.length >= 5 && /\d/.test(n) && !/^(19|20)\d\d$/.test(n);
  });
}

type Choices = { level: string; options: string[]; spec?: string; send?: string[] } | null;

// Customer asks again for the result of the current search ("what fits my vehicle?")
// or complains about a repeated question. Answered by the server from the saved search.
const RECAP =
  /\b(what\s+(fits|fit|parts)|show\s+(me\s+)?(the\s+)?(parts|results|options|them)|same\s+question|asked?\s+(me\s+)?(that\s+)?(twice|again)|already\s+(told|answered|said)|repeat(ed|ing)?)\b/i;
const COMPLAINT = /\b(same|twice|again|already|repeat(ed|ing)?)\b/i;
const samePart = (a?: string, b?: string) =>
  !a || !b || a.toLowerCase().replace(/[^a-z]/g, "") === b.toLowerCase().replace(/[^a-z]/g, "");

export async function POST(req: Request) {
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 64 * 1024) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const rawBody = await req.text();
  if (rawBody.length > 64 * 1024) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let body: any = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length > 100) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Where the customer is on the website right now
  const pagePath = String(body.page?.path ?? "").slice(0, 200).replace(/[^\w\-/.%]/g, "");
  const pageTitle = String(body.page?.title ?? "").slice(0, 150).replace(/[\r\n]/g, " ");
  const pageNote = pagePath
    ? `\n\nThe customer is currently on this page of the website: ${pagePath}${
        pageTitle ? ` (title: "${pageTitle}")` : ""
      }. If they ask where they are, describe the page in plain words (for example "the product page for ...", "your cart", "the Brands page", "the home page"). If they are on /product/<slug>, the slug is usually the part number, so you can look it up with search_catalog when they ask about "this part". Never say a part fits their vehicle from the page alone.`
    : "";

  // Tell the model which search is running and what the customer already answered, so a
  // free-text message in the middle of the flow does not lose the vehicle.
  const rawHistory = body.messages.map((m: any) => ({
    role: String(m?.role),
    content: String(m?.content ?? "").slice(0, 1000),
  }));
  let answeredSoFar = readAnswers(rawHistory);
  const activeNote =
    body.context?.input &&
    typeof body.context.input === "object" &&
    (Array.isArray(body.messages) ? body.messages.filter((m: any) => m?.role === "user").length : 0) > 1
      ? `\n\nActive search (do not ask for these details again): ${JSON.stringify(body.context.input).slice(0, 400)}${
          answeredSoFar.length
            ? `. Questions the customer already answered: ${answeredSoFar
                .map((f) => `${f.name} = ${f.value ?? "not sure"}`)
                .join("; ")}`
            : ""
        }.`
      : "";

  // French site: Axel answers in French (the customer may also write in French)
  const langNote =
    body.lang === "fr"
      ? "\n\nThe customer is using the French version of the site. Always reply in Canadian French (Quebec). Keep part numbers, brand and model names, VINs and links unchanged. Tool inputs (part names, vehicle names, spec answers) stay in English as the catalog expects. The customer may write in French: understand it."
      : "";

  // Keep only the last 12 messages, trimmed, to limit cost and abuse
  const messages: Anthropic.MessageParam[] = body.messages
    .slice(-12)
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
    .map((m: any) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, 1000).trim(),
    }))
    .filter((m: any) => m.content.length > 0);

  // Cutting to the last 12 can leave an assistant message first: drop it
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();

  if (messages.length === 0 || messages[0].role !== "user") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Customer answered a spec question: re-run the same search and narrow it
  // A search context only belongs to a conversation that already has earlier messages:
  // a fresh conversation must not pick up an old search (it asked F-150 questions before)
  const ctx: Ctx | null =
    messages.filter((m) => m.role === "user").length > 1 &&
    body.context &&
    (body.context.tool === "find_parts_for_vehicle" ||
      body.context.tool === "find_parts_by_vin") &&
    body.context.input
      ? { tool: body.context.tool, input: body.context.input }
      : null;
  const lastText = String(messages[messages.length - 1].content);

  const partNumberTyped = !!ctx && looksLikePartNumber(lastText);

  // A typed answer in the middle of a search ("if I said no pulley?", "it's chain driven")
  // counts like a button: it is matched against the real values of the vehicle's parts.
  let typedAnswer: Answer | null = null;
  let ctxOut: any = null;
  const compactLast = lastText.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Earlier typed answers count on every later turn too, also when this turn is a button:
  // "no pully" typed after a "Pulley: Yes" button must keep overriding it.
  if (
    ctx &&
    !/^(Make|Model|Engine|Trim):/i.test(lastText) &&
    !/\b(19[5-9]\d|20[0-4]\d)\b/.test(lastText) &&
    !/^[A-HJ-NPR-Z0-9]{17}$/.test(compactLast)
  ) {
    const o: any = await runTool(ctx.tool, ctx.input);
    if (o?.status === "ok") {
      const products = o.products ?? [];
      const specs = await getSpecs(products.map((p: any) => p.id));
      const interpret = (t: string) => interpretText(products, specs, t);
      answeredSoFar = readAnswers(rawHistory, interpret);
      if (!isSpecMessage(lastText) && !partNumberTyped) typedAnswer = interpret(lastText);
      ctxOut = o;
    }
  }

  const maxQuestions = questionLimit(rawHistory);
  if (ctx && (isSpecMessage(lastText) || RECAP.test(lastText) || partNumberTyped || typedAnswer || MORE.test(lastText))) {
    const out: any = ctxOut ?? (await runTool(ctx.tool, ctx.input));
    if (out?.status === "ok") {
      // A number from the old part settles it when one of the vehicle's parts carries it;
      // otherwise the message goes on to Axel (catalog / web search) as before.
      const r = partNumberTyped
        ? await presentPartNumber(out, answeredSoFar, lastText, ctx.input)
        : await present(out, answeredSoFar, ctx.input, maxQuestions);
      if (r) {
        const sorry = typedAnswer
          ? `Got it: ${typedAnswer.name.replace(/^Has: /, "")} = ${typedAnswer.value}. `
          : !isSpecMessage(lastText) && !partNumberTyped && COMPLAINT.test(lastText)
            ? "Sorry about that. "
            : "";
        return NextResponse.json({
          reply: [
            r.override ? sorry + r.override : sorry.trim() || null,
            formatProducts(r.shown, r.total, r.heading, null, r.lines),
          ]
            .filter(Boolean)
            .join("\n\n"),
          products: r.shown,
          choices: r.choices,
          context: ctx,
        });
      }
    }
  }

  // Decide if this message has to be answered by a catalog lookup
  const forceTool = ((): "find_parts_for_vehicle" | "find_parts_by_vin" | null => {
    const t = lastText.trim();
    if (/^(Make|Model|Engine|Trim):\s*\S/i.test(t)) return "find_parts_for_vehicle";
    const compact = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(compact) && /\d/.test(compact) && /[A-Z]/.test(compact)) {
      return "find_parts_by_vin";
    }
    // "2012 dodge caravan": a year plus at least two more words
    const words = t.split(/\s+/).filter(Boolean);
    if (/\b(19[5-9]\d|20[0-4]\d)\b/.test(t) && words.length >= 3 && !/\d{5,}/.test(t)) {
      return "find_parts_for_vehicle";
    }
    return null;
  })();

  let lastOut: any = null;
  let lastCtx: Ctx | null = null;
  let forcedReply: string | null = null;

  // What the tools found in this turn
  let shown: CatalogProduct[] = [];
  let shownTotal = 0;
  let heading: string | null = null;
  let vehicleUrl: string | null = null;
  let choices: Choices = null;

  try {
    for (let i = 0; i < 5; i++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system: SYSTEM + pageNote + activeNote + (await shippingNote()) + langNote,
        tools,
        messages,
        // First step only: a vehicle answer MUST go through the lookup, so
        // the model can never make up an engine list or a question itself.
        ...(i === 0 && forceTool
          ? { tool_choice: { type: "tool" as const, name: forceTool } }
          : {}),
      });

      // A long web search can pause the turn; just let it continue
      if (res.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: res.content });
        continue;
      }

      if (res.stop_reason !== "tool_use") {
        const text = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          // Web-search citations split a sentence into many blocks: glue them
          .reduce(
            (acc, t) =>
              acc && /[.!?:]$/.test(acc) && /^[A-Za-z]/.test(t) ? `${acc} ${t}` : acc + t,
            "",
          );

        let replyText = forcedReply ?? text; // we word the engine/trim questions ourselves
        let outShown = shown;
        let outTotal = shownTotal;
        let outHeading = heading;
        let outLines: Map<number, string[]> | undefined;

        if (lastOut) {
          // Keep the customer's earlier answers when this is the same search
          const sameSearch = samePart(lastCtx?.input?.part, ctx?.input?.part);
          const r = await present(lastOut, sameSearch ? answeredSoFar : [], lastCtx?.input, maxQuestions);
          outShown = r.shown;
          outTotal = r.total;
          outHeading = r.heading;
          outLines = r.lines;
          if (r.choices) choices = r.choices;
          if (r.override) {
            // Keep what the VIN decoded to (with the trim), then the server-written result
            const vin = lastOut.vin_summary ? `Your VIN reads as a ${lastOut.vin_summary}. ` : "";
            replyText = vin + r.override;
          }
        }

        const list = outShown.length
          ? "\n\n" + formatProducts(outShown, outTotal, outHeading, vehicleUrl, outLines)
          : "";

        return NextResponse.json({
          reply: replyText + list,
          products: outShown,
          choices,
          context: lastCtx,
        });
      }

      messages.push({ role: "assistant", content: res.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type === "tool_use") {
          // The model sometimes forgets the part on later turns: reuse the
          // part from the earlier search so the customer is never asked twice.
          const toolInput: any = { ...(block.input as any) };
          const isVehicleTool =
            block.name === "find_parts_for_vehicle" || block.name === "find_parts_by_vin";
          if (isVehicleTool && !realPart(toolInput.part)) {
            const before = lastCtx?.input?.part ?? ctx?.input?.part;
            if (before) toolInput.part = before;
          }

          // A button the customer just clicked ("Engine: 3.6L V6 3604cc") is
          // the exact answer: use it as is, even if the model shortened it.
          if (isVehicleTool) {
            const clicked = lastText.trim().match(
              /^(Make|Model|Engine|Trim):\s*(.+)$/i,
            );
            if (clicked) {
              const level = clicked[1].toLowerCase();
              const value = clicked[2].trim();
              // "Trim: WRX" typed before the model is known: the customer is answering
              // "which model?", so use it as the model instead of a trim.
              if (level === "trim" && !String(toolInput.model ?? "").trim()) {
                toolInput.model = value;
                delete toolInput.trim;
              } else {
                toolInput[level] = value;
              }
            }
          }

          // "not sure / don't know / no idea" to the engine question: never ask again
          if (
            isVehicleTool &&
            !String(toolInput.engine ?? "").trim() &&
            /^(i\s*)?(am\s*)?(not\s*sure|dont\s*know|don'?t\s*know|do\s*not\s*know|no\s*idea|idk|unsure|not\s*certain|i\s*have\s*no\s*idea)\b/i.test(
              lastText.trim().replace(/[’']/g, "'")
            )
          ) {
            toolInput.any_engine = true;
          }

          const out: any = await runTool(block.name, toolInput);
          if (isVehicleTool && realPart(toolInput.part)) {
            // Remember the search (also while we are still asking for the engine)
            lastCtx = { tool: block.name as Ctx["tool"], input: toolInput };
          }

          console.log(
            `${block.name}:`,
            JSON.stringify(block.input),
            "->",
            JSON.stringify(out).slice(0, 300),
          );

          if (
            block.name === "find_parts_for_vehicle" ||
            block.name === "find_parts_by_vin"
          ) {
            shown = [];
            shownTotal = 0;
            heading = null;
            vehicleUrl = null;
            choices = null;

            if (out?.status === "ok") {
              lastOut = out;
              shown = out.products ?? [];
              shownTotal = out.total_matches ?? shown.length;
              vehicleUrl = out.vehicle_page_url ?? null;
              heading = out.vehicle ? `Matched to your ${out.vehicle}:` : null;
            }

            // Real options from the catalog become buttons
            const optionLevels = ["make", "model", "engine", "trim"];
            forcedReply = null;
            if (out?.status === "choose" && optionLevels.includes(out.level)) {
              const veh = [toolInput.year, toolInput.make, toolInput.model]
                .filter(Boolean)
                .join(" ");
              forcedReply =
                out.level === "engine"
                  ? `Which engine does your ${veh} have?`
                  : out.level === "trim"
                    ? `Which trim does your ${veh} have?`
                    : out.level === "model"
                      ? `Which model is your ${toolInput.year ?? ""} ${toolInput.make ?? ""}?`.replace(/\s+/g, " ")
                      : "Which make is it?";
            }
            // Nothing in the catalog for this vehicle: the server words the reply, always with
            // the full vehicle (VIN: year, make, model, trim, engine) and the part asked for.
            const noParts =
              out?.status === "no_products" ||
              (out?.status === "not_found" && (out.level === "year" || out.level === "model"));
            if (noParts && realPart(toolInput.part)) {
              const partName = String(toolInput.part ?? "part").trim().toLowerCase() || "part";
              const typed = [toolInput.year, toolInput.make, toolInput.model, toolInput.engine, toolInput.trim]
                .filter(Boolean)
                .join(" ");
              const veh = out.vin_summary || typed || "this vehicle";
              forcedReply =
                (out.vin_summary ? `Your VIN decodes to a ${out.vin_summary}. ` : "") +
                `We don't have a ${partName} for the ${veh} in our catalog yet, so I can't recommend one. ` +
                `Our team can check if one is coming or find an alternative for you.`;
            }
            if (
              Array.isArray(out?.options) &&
              out.options.length > 0 &&
              optionLevels.includes(out.level) &&
              (out.status === "choose" ||
                // Not found: buttons only for a mistyped engine or trim. Other models of the
                // same make are not offered: they may not have this part either.
                (out.status === "not_found" && out.level !== "make" && out.level !== "model"))
            ) {
              choices = { level: out.level, options: out.options.slice(0, 12) };
            }

            if (out?.status === "confirm_vehicle") {
              choices = {
                level: "confirm",
                options: ["Yes, that's my vehicle", "No, it's a different vehicle"],
              };
            }
          }

          if (block.name === "search_catalog") {
            shown = out?.products ?? [];
            shownTotal = shown.length;
            heading = shown.length
              ? shown.some((p: any) => p.match?.exact)
                ? "Confirmed number match (fitment not confirmed):"
                : "Similar results, not a confirmed match:"
              : null;
            vehicleUrl = null;
            choices = null;
          }

          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(out),
          });
        }
      }
      messages.push({ role: "user", content: results });
    }

    return NextResponse.json({
      reply: "Sorry, I couldn't finish that. Please try again.",
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      {
        reply: "Sorry, something went wrong. Please try again.",
        ...(process.env.NODE_ENV !== "production"
          ? { debug: err instanceof Error ? err.message : String(err) }
          : {}),
      },
      { status: 500 },
    );
  }
}
