import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Street suggestions for Uber same-day delivery (Vancouver and Burnaby only).
// The Mapbox token stays on the server.
const BBOX = "-123.27,49.18,-122.89,49.32";

const NAMES: Record<string, string> = {
  alberta: "AB", "british columbia": "BC", manitoba: "MB", "new brunswick": "NB",
  "newfoundland and labrador": "NL", "nova scotia": "NS", "northwest territories": "NT",
  nunavut: "NU", ontario: "ON", "prince edward island": "PE", quebec: "QC", "québec": "QC",
  saskatchewan: "SK", yukon: "YT",
};
const POSTAL: Record<string, string> = {
  A: "NL", B: "NS", C: "PE", E: "NB", G: "QC", H: "QC", J: "QC", K: "ON", L: "ON", M: "ON",
  N: "ON", P: "ON", R: "MB", S: "SK", T: "AB", V: "BC", Y: "YT",
};

// Works out the province code even if Mapbox leaves some fields out.
function provinceOf(c: any, full: string, zip: string) {
  const code = String(c.region?.region_code ?? "").toUpperCase();
  if (code.length === 2) return code;
  const fullCode = String(c.region?.region_code_full ?? "").slice(-2).toUpperCase();
  if (fullCode.length === 2) return fullCode;
  const byName = NAMES[String(c.region?.name ?? "").toLowerCase()];
  if (byName) return byName;
  const lower = full.toLowerCase();
  for (const [name, abbr] of Object.entries(NAMES)) if (lower.includes(name)) return abbr;
  return POSTAL[zip.trim().charAt(0).toUpperCase()] ?? "";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ suggestions: [] }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const wholeCanada = params.get("scope") === "canada"; // account page: any Canadian address
  const token = process.env.MAPBOX_TOKEN;
  if (q.length < 3 || q.length > 120 || !token) return NextResponse.json({ suggestions: [] });

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", q);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("country", "ca");
  url.searchParams.set("types", "address");
  if (!wholeCanada) url.searchParams.set("bbox", BBOX);
  url.searchParams.set("limit", "6");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    const json = await res.json();

    const suggestions = (json.features ?? [])
      .map((f: any) => {
        const p = f.properties ?? {};
        const c = p.context ?? {};
        const zip = String(c.postcode?.name ?? "");
        const label = String(p.full_address ?? p.name ?? "");
        return {
          street: String(p.name ?? ""),
          city: String(c.place?.name ?? ""),
          zip,
          province: provinceOf(c, label, zip),
          label,
        };
      })
      .filter(
        (s: { street: string; city: string }) =>
          s.street && (wholeCanada ? !!s.city : ["vancouver", "burnaby"].includes(s.city.toLowerCase())),
      );

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
