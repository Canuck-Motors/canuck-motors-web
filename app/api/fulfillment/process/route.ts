import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  processFulfillmentQueue,
  syncAmazonMcfOrders,
  syncAmazonMcfPackageTracking,
} from "@/lib/fulfillment";
import { syncAmazonMcfReturn } from "@/lib/amazon-mcf-returns";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const queued = await processFulfillmentQueue(25);
    const outbound = await syncAmazonMcfOrders(50);
    const tracking = await syncAmazonMcfPackageTracking(50);

    const admin = createAdminClient();
    const { data: returns } = await admin
      .from("return_requests")
      .select("id")
      .eq("fulfillment_provider", "amazon_mcf")
      .not("amazon_rma_id", "is", null)
      .not("amazon_return_status", "in", '("received","completed","cancelled")')
      .order("amazon_return_synced_on", { ascending: true, nullsFirst: true })
      .limit(50);

    let returnSynced = 0;
    let returnFailed = 0;
    for (const row of returns ?? []) {
      try {
        await syncAmazonMcfReturn(String(row.id));
        returnSynced += 1;
      } catch (error) {
        returnFailed += 1;
        console.error("Amazon MCF return sync failed:", row.id, error);
      }
    }

    return NextResponse.json({
      queue: queued,
      outbound,
      tracking,
      returns: {
        processed: (returns ?? []).length,
        synced: returnSynced,
        failed: returnFailed,
      },
    });
  } catch (error) {
    console.error("Fulfillment queue processing failed:", error);
    return NextResponse.json({ error: "Fulfillment processing failed" }, { status: 500 });
  }
}
