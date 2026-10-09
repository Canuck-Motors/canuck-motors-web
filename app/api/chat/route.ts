import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { listCategories } from "@/lib/parts";
import {
  findPartsByVin,
  findPartsForVehicle,
  searchCatalog,
  type CatalogProduct,
} from "@/lib/catalog";
import {
  getSpecsForProducts,
  isSpecMessage,
  narrow,
  questionText,
  readFilters,
  type SpecFilter,
} from "@/lib/axel-narrow";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CHAT_MODEL ?? "claude-haiku-4-5-20251001";

const SYSTEM = `You are Axel, the Canuck Motors parts assistant. Your goal is that the customer ends up with the exact, correct part, so nothing gets returned. Write like a quick text message: ONE or TWO short sentences (under 25 words), one question at a time. No long explanations, no lists, no bold headings.

How to work:
1. Find out which part they need (water pump, brake pads, brake shoes, timing belt kit with water pump, front and rear brake kit, and so on).
2. Once you know the part, ask for the vehicle in ONE short line, exactly like: "Which vehicle is it for? Year, make and model, or paste your VIN." Do not explain the VIN yet. Identify the vehicle in one of two ways:
   a. VIN (most accurate). If the customer's message contains a 17-character VIN, call find_parts_by_vin right away, with the part they asked for earlier.
   b. Year, make and model. As soon as you know all three, call find_parts_for_vehicle immediately, even if you don't know the engine yet.
3. NEVER list, guess or recall engines, models, trims or part numbers from your own memory. The tools return the real options and the customer sees them as buttons.
4. Only if the customer says they don't know their vehicle details, or asks where the VIN is, give this in one short line: "Your VIN is on the driver's side windshield corner, the door jamb sticker, or your insurance card. Paste it here." Never send them hunting for the engine or trim: use the buttons or the VIN.

Reading tool results (find_parts_for_vehicle and find_parts_by_vin):
- status "choose": ask ONE short question for that level (for example "Which engine does your 2004 Ford F-150 have?"). The options appear as buttons, so do not list them.
- status "not_found": say what we couldn't find, ask them to double-check it, or offer to use their VIN instead.
- status "ok": write one or two short sentences. Confirm the vehicle using the "vehicle" text. For a VIN search, say what the VIN decoded to using vin_vehicle. Do NOT list, count or describe products (never say how many were found): they appear automatically below your message. If "positions" has more than one value (for example Front and Rear) and the customer didn't say which one they need, add one line asking which. If available_trims is not empty, add one short line saying they can tell you their trim to double-check. Do not name trims yourself.
- status "need_part": ask which part they need, in one short line.
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
- Only say a part fits if find_parts_for_vehicle or find_parts_by_vin returned it.
- search_catalog is for part numbers (CM, OE or interchange numbers) and product names. It does NOT confirm fitment: say so and ask for the vehicle or VIN to confirm.
- Always pass the customer's part in the "part" field of the vehicle and VIN tools. Never say a part is "in stock" or "available".
- If the customer asks for a category list, use list_categories.
- Politely decline unrelated topics.`;

const tools: Anthropic.Tool[] = [
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

async function runTool(name: string, input: any) {
  try {
    if (
      (name === "find_parts_for_vehicle" || name === "find_parts_by_vin") &&
      !String(input.part ?? "").trim()
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
      });
    }

    if (name === "find_parts_by_vin") {
      return await findPartsByVin(
        String(input.vin ?? ""),
        input.part ? String(input.part) : undefined,
      );
    }

    if (name === "search_catalog") {
      const products = await searchCatalog(String(input.query ?? ""));
      return { status: products.length ? "ok" : "no_results", products };
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
    return `• [${label}](${p.url}) - ${price}${position}`;
  });

  const out: string[] = [];
  if (heading) out.push(heading);
  out.push(...lines);

  if (vehicleUrl && total > items.length) {
    out.push(`[See all ${total} parts for this vehicle](${vehicleUrl})`);
  }

  return out.join("\n");
}

type Ctx = { tool: "find_parts_for_vehicle" | "find_parts_by_vin"; input: any };

// Narrows a vehicle result with the customer's spec answers.
// The reply text for questions and single matches is written by the server,
// so Axel can never claim a part fits when the data does not say so.
async function present(out: any, filters: SpecFilter[]) {
  const all: CatalogProduct[] = out.products ?? [];
  const specs = await getSpecsForProducts(all.map((p) => p.id));
  let { candidates, question } = narrow(all, specs, filters);
  let note: string | null = null;

  if (candidates.length === 0) {
    candidates = all;
    ({ question } = narrow(all, specs, []));
    note = "No part matched that answer exactly, so here is everything that fits your vehicle.";
  }

  const vehicle = out.vehicle as string | undefined;
  const base = {
    shown: candidates.slice(0, 8),
    total: candidates.length,
    choices: null as null | { level: string; options: string[]; spec?: string },
    heading: vehicle ? `Matched to your ${vehicle}:` : null,
    override: note,
  };

  if (candidates.length === 1) {
    base.heading = vehicle ? `Best match for your ${vehicle}:` : "Best match:";
    base.override = "This is the part that fits.";
  } else if (question) {
    base.heading = `${candidates.length} possible matches${vehicle ? ` for your ${vehicle}` : ""}:`;
    base.override = questionText(question, candidates.length);
    base.choices = {
      level: "spec",
      spec: question.name,
      options: [...question.options.slice(0, 10), "Not sure"],
    };
  }
  return base;
}

type Choices = { level: string; options: string[]; spec?: string } | null;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
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

  // Keep only the last 12 messages, trimmed, to limit cost and abuse
  const messages: Anthropic.MessageParam[] = body.messages
    .slice(-12)
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
    .map((m: any) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, 1000).trim(),
    }))
    .filter((m: any) => m.content.length > 0);

  if (messages.length === 0 || messages[0].role !== "user") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Customer answered a spec question: re-run the same search and narrow it
  const ctx: Ctx | null =
    body.context &&
    (body.context.tool === "find_parts_for_vehicle" ||
      body.context.tool === "find_parts_by_vin") &&
    body.context.input
      ? { tool: body.context.tool, input: body.context.input }
      : null;
  const lastText = String(messages[messages.length - 1].content);

  if (ctx && isSpecMessage(lastText)) {
    const out: any = await runTool(ctx.tool, ctx.input);
    if (out?.status === "ok") {
      const filters = readFilters(
        body.messages.map((m: any) => ({
          role: String(m?.role),
          content: String(m?.content ?? "").slice(0, 1000),
        })),
      );
      const r = await present(out, filters);
      return NextResponse.json({
        reply: [r.override, formatProducts(r.shown, r.total, r.heading, null)]
          .filter(Boolean)
          .join("\n\n"),
        products: r.shown,
        choices: r.choices,
        context: ctx,
      });
    }
  }

  let lastOut: any = null;
  let lastCtx: Ctx | null = null;

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
        max_tokens: 700,
        system: SYSTEM + pageNote,
        tools,
        messages,
      });

      if (res.stop_reason !== "tool_use") {
        const text = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        let replyText = text;
        let outShown = shown;
        let outTotal = shownTotal;
        let outHeading = heading;

        if (lastOut) {
          const r = await present(lastOut, []);
          outShown = r.shown;
          outTotal = r.total;
          outHeading = r.heading;
          if (r.choices) choices = r.choices;
          if (r.override) replyText = r.override;
        }

        const list = outShown.length
          ? "\n\n" + formatProducts(outShown, outTotal, outHeading, vehicleUrl)
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
          const out: any = await runTool(block.name, block.input);

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
              lastCtx = { tool: block.name as Ctx["tool"], input: block.input };
              shown = out.products ?? [];
              shownTotal = out.total_matches ?? shown.length;
              vehicleUrl = out.vehicle_page_url ?? null;
              heading = out.vehicle ? `Matched to your ${out.vehicle}:` : null;
            }

            // Real options from the catalog become buttons
            const optionLevels = ["make", "model", "engine", "trim"];
            if (
              Array.isArray(out?.options) &&
              out.options.length > 0 &&
              optionLevels.includes(out.level) &&
              (out.status === "choose" ||
                (out.status === "not_found" && out.level !== "make"))
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
              ? "Matches for your search (fitment not confirmed):"
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
