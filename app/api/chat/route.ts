import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { searchParts, getPart, listCategories, checkFitment } from "@/lib/parts";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CHAT_MODEL ?? "claude-haiku-4-5-20251001";

const SYSTEM = `You are the Canuck Motors parts assistant.

Conversation flow:
1. Ask which part the customer needs (for example brake pads, water pump).
2. Ask for their vehicle: year, make, and model. Ask for any missing detail, one question at a time.
3. Once you have the part and the vehicle, use search_parts to find matching products and show them.

Rules:
- Only state prices, SKUs, and availability that come from tool results.
- Once you know the part and the vehicle (year, make, model), call check_fitment.
- Only say a part fits if check_fitment returns it for that vehicle. If it returns nothing, say we couldn't confirm a match and suggest contacting the team.
- If the customer asks for a category list, use list_categories.
- If nothing is found, say so and suggest contacting the team.
- Never say a part is "confirmed", "available", or "in stock" unless check_fitment returned that product. If it returns found: false, say we couldn't find a matching part for that vehicle and suggest contacting the team.
- Keep replies short and friendly. Politely decline unrelated topics.`;

const tools: Anthropic.Tool[] = [
  {
    name: "search_parts",
    description: "Search auto parts by name or SKU",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Search text" } },
      required: ["query"],
    },
  },
  {
    name: "get_part",
    description: "Get details for one part by id",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_categories",
    description: "List all active part categories",
    input_schema: { type: "object", properties: {} },
  },
  {
  name: "check_fitment",
  description: "Find parts that fit a specific vehicle. Use once you know year, make, and model.",
  input_schema: {
    type: "object",
    properties: {
      year: { type: "integer" },
      make: { type: "string" },
      model: { type: "string" },
      part: { type: "string", description: "Optional part name, e.g. brake pads" },
    },
    required: ["year", "make", "model"],
  },
},
];

async function runTool(name: string, input: any) {
  if (name === "search_parts") return searchParts(String(input.query ?? ""));
  if (name === "get_part") return getPart(String(input.id ?? ""));
  if (name === "list_categories") return listCategories();
  if (name === "check_fitment")
  if (name === "check_fitment") {
  const result = await checkFitment({
    year: Number(input.year),
    make: String(input.make ?? ""),
    model: String(input.model ?? ""),
    part: input.part ? String(input.part) : undefined,
  });
  console.log("check_fitment:", JSON.stringify(input), "→", JSON.stringify(result).slice(0, 300));
  return result;
}
  
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Keep only the last 10 messages, trimmed, to limit cost and abuse
  const messages: Anthropic.MessageParam[] = body.messages
    .slice(-10)
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
    .map((m: any) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, 1000),
    }));

  if (messages.length === 0 || messages[0].role !== "user") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    for (let i = 0; i < 5; i++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM,
        tools,
        messages,
      });

      if (res.stop_reason !== "tool_use") {
        const reply = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        return NextResponse.json({ reply });
      }

      messages.push({ role: "assistant", content: res.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type === "tool_use") {
          const out = await runTool(block.name, block.input);
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
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}