import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tells the register page whether an email already has an account.
const hits = new Map<string, { n: number; reset: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.reset < now) hits.set(ip, { n: 1, reset: now + 60_000 });
  else if (++rec.n > 30) return NextResponse.json({ error: "Too many checks. Try again in a minute." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ exists: false });
  }

  const { data, error } = await createAdminClient()
    .from("users")
    .select("id")
    .ilike("email_id", email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .limit(1);
  if (error) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: (data ?? []).length > 0 });
}
