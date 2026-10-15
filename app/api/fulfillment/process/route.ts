import { NextResponse } from "next/server";
import { processFulfillmentQueue } from "@/lib/fulfillment";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processFulfillmentQueue(25);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Fulfillment queue processing failed:", error);
    return NextResponse.json({ error: "Fulfillment processing failed" }, { status: 500 });
  }
}
