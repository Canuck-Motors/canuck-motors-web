import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { processNotificationOutbox } from "@/lib/notifications";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!secret || !provided || !safeEqual(secret, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processNotificationOutbox();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Notification processing failed:", error);
    return NextResponse.json(
      { error: "Notification processing failed" },
      { status: 500 }
    );
  }
}
