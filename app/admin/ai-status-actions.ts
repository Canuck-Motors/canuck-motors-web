"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export type AiStatus =
  | { state: "ok"; checkedAt: string }
  | {
      state: "no_key" | "invalid_key" | "no_credits" | "rate_limited" | "error";
      message: string;
      checkedAt: string;
    };

// Makes one tiny test call (about 1 token) and says in plain words what is wrong.
export async function checkAiStatus(): Promise<AiStatus> {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("current_user_staff_role");
  if (role !== "admin") throw new Error("Admins only.");

  const checkedAt = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { state: "no_key", message: "No API key is set on the server.", checkedAt };
  }

  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: process.env.CHAT_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    return { state: "ok", checkedAt };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    const text = e instanceof Error ? e.message : String(e);
    if (status === 401 || status === 403) {
      return {
        state: "invalid_key",
        message: "The API key was rejected. It may be deleted, revoked or mistyped.",
        checkedAt,
      };
    }
    if (status === 402 || /credit balance|billing/i.test(text)) {
      return {
        state: "no_credits",
        message: "The account is out of credits. Add credits in the Anthropic console.",
        checkedAt,
      };
    }
    if (status === 429) {
      return {
        state: "rate_limited",
        message: "Too many requests right now. This usually clears by itself.",
        checkedAt,
      };
    }
    return { state: "error", message: "Could not reach the AI service. Try again soon.", checkedAt };
  }
}
