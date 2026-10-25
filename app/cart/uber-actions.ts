"use server";

import { createClient } from "@/lib/supabase/server";
import { getUberQuote } from "@/lib/uber-direct";

export type UberQuoteResult =
  | { ok: true; feeCents: number; etaMinutes: number | null }
  | { ok: false; message: string };

export async function quoteUberDelivery(input: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): Promise<UberQuoteResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "Please sign in first." };

  const a = {
    street: input.street.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip.trim(),
  };
  if (!["vancouver", "burnaby"].includes(a.city.toLowerCase())) {
    return { ok: false, message: "Uber same-day delivery is only available in Vancouver and Burnaby. Please choose standard shipping." };
  }
  if (!a.street || !a.city || !a.state || !a.zip) {
    return { ok: false, message: "Please fill in the full delivery address." };
  }

  try {
    const q = await getUberQuote(a);
    return { ok: true, feeCents: q.feeCents, etaMinutes: q.etaMinutes ?? null };
  } catch (e) {
    // Out of range, store closed, or Uber busy: the customer keeps standard shipping.
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[uber] quote failed:", reason);
    return {
      ok: false,
      message:
        "Uber same-day delivery isn't available for this address or time right now. Please choose standard shipping." +
        (process.env.NODE_ENV !== "production" ? ` (Uber said: ${reason})` : ""),
    };
  }
}
