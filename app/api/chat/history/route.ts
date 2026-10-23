import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Axel chat history of the signed-in customer (table public.chat_history,
// database/chat_history.sql). Guests keep their chat in the browser only.
const MAX_MESSAGES = 60;
const MAX_BYTES = 200 * 1024;

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ messages: [], context: null });
  const { data, error } = await supabase
    .from("chat_history")
    .select("messages, context, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("Chat history read failed:", error.message);
    return NextResponse.json({ messages: [], context: null });
  }
  return NextResponse.json({
    messages: Array.isArray(data?.messages) ? data!.messages : [],
    context: data?.context ?? null,
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!Array.isArray(body?.messages)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Keep only the fields the chat window shows
  const messages = body.messages
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  const { error } = await supabase.from("chat_history").upsert({
    user_id: user.id,
    messages,
    context: body.context && typeof body.context === "object" ? body.context : null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Chat history save failed:", error.message);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ ok: true });
  await supabase.from("chat_history").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
