import { NextResponse } from "next/server";
import { getVisibleCategories } from "@/lib/categories";
import { createPublicClient } from "@/lib/supabase/public";

// The part buttons Axel offers: only categories that are switched on and have products.
export async function GET() {
  try {
    const cats = await getVisibleCategories(createPublicClient());
    const options = cats.map((c) => ({
      label: c.category_name,
      text: `I'm looking for ${c.category_name.toLowerCase()}`,
    }));
    // the front/rear kit is a brake-pad product, so only offer it while brake pads are on
    if (cats.some((c) => /brake pad/i.test(c.category_name))) {
      options.push({ label: "Front and rear brake kit", text: "I'm looking for a front and rear brake kit" });
    }
    return NextResponse.json({ options }, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ options: [] });
  }
}
