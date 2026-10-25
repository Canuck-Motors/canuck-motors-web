"use server";

import { createClient } from "@/lib/supabase/server";
import { quoteStandardForCart } from "@/lib/standard-shipping";

export type StandardQuoteResult =
  | { ok: true; feeCents: number; zone: string }
  | { ok: false; message: string };

export async function quoteStandardShipping(postal: string): Promise<StandardQuoteResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "Please sign in first." };
  const q = await quoteStandardForCart(supabase, data.user.id, postal);
  return q.ok ? { ok: true, feeCents: q.cents, zone: q.zone } : { ok: false, message: q.message };
}
