import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWholePost } from "@/lib/blog-ai";

export const maxDuration = 300;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// Runs every ~15 days (see vercel.json). Writes a DRAFT only: an admin reviews and publishes it.
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || !provided || !safeEqual(secret, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: last } = await db
    .from("blog_posts")
    .select("created_at")
    .eq("generated_by", "auto")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 10 * 86400000) {
    return NextResponse.json({ skipped: "A draft was already created in the last 10 days." });
  }

  const { count } = await db.from("blog_posts").select("id", { count: "exact", head: true }).eq("generated_by", "auto");
  const mode = (count ?? 0) % 2 === 0 ? "guide" : "news";

  try {
    const saved = await generateWholePost(mode, "", "auto");
    updateTag("blog");
    return NextResponse.json({ created: saved, mode });
  } catch (error) {
    console.error("Scheduled blog generation failed:", error);
    return NextResponse.json({ error: "Blog generation failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
