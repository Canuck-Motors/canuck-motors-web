"use server";

import { createClient } from "@/lib/supabase/server";
import { createUberDelivery, getUberQuote, type UberAddress } from "@/lib/uber-direct";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("current_user_staff_role");
  if (error || role !== "admin") throw new Error("Admin access is required.");
}

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function readAddress(f: FormData): UberAddress {
  return { street: clean(f.get("street")), city: clean(f.get("city")), state: clean(f.get("state")), zip: clean(f.get("zip")) };
}

export type UberTestResult = { ok: boolean; message: string; trackingUrl?: string };

export async function testUberQuote(_prev: UberTestResult | null, f: FormData): Promise<UberTestResult> {
  try {
    await requireAdmin();
    const q = await getUberQuote(readAddress(f));
    return { ok: true, message: `Quote OK: $${(q.feeCents / 100).toFixed(2)} ${q.currency}, about ${q.etaMinutes ?? "?"} min. Quote id: ${q.id}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Quote failed." };
  }
}

export async function testUberDelivery(_prev: UberTestResult | null, f: FormData): Promise<UberTestResult> {
  try {
    await requireAdmin();
    const dropoff = readAddress(f);
    const q = await getUberQuote(dropoff);
    const d = await createUberDelivery({
      quoteId: q.id,
      dropoff,
      customerName: clean(f.get("name")) || "Test Customer",
      customerPhone: clean(f.get("phone")) || "+16045550101",
      orderNumber: `TEST-${Date.now()}`,
      items: [{ name: "Water pump (test)", quantity: 1 }],
    });
    return { ok: true, message: `Test delivery created (${d.status}). Fee $${(q.feeCents / 100).toFixed(2)}.`, trackingUrl: d.trackingUrl };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Delivery failed." };
  }
}
