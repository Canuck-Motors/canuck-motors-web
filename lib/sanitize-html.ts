// Keeps AI-written article HTML to a small safe set of tags before it is saved or shown.
const ALLOWED = new Set([
  "p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "b", "i", "a", "br", "hr",
  "table", "thead", "tbody", "tr", "th", "td", "blockquote", "figure", "figcaption", "img",
]);

function safeHref(raw: string) {
  const v = raw.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  if (/^https:\/\//i.test(v) || /^mailto:/i.test(v) || /^tel:/i.test(v)) return v;
  return null;
}

export function sanitizeHtml(input: string): string {
  let html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|form)[\s\S]*?<\/\1\s*>/gi, "");

  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (full, tagRaw: string, attrs: string) => {
    const tag = tagRaw.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    if (full.startsWith("</")) return tag === "img" || tag === "br" || tag === "hr" ? "" : `</${tag}>`;
    if (tag === "img") {
      const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/`;
      const src = attrs.match(/src\s*=\s*"([^"]*)"/i)?.[1] ?? "";
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !src.startsWith(base)) return "";
      const alt = (attrs.match(/alt\s*=\s*"([^"]*)"/i)?.[1] ?? "").replace(/[<>"]/g, "");
      return `<img src="${src}" alt="${alt}" loading="lazy">`;
    }
    if (tag === "a") {
      const m = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
      const href = m ? safeHref(m[2] ?? m[3] ?? "") : null;
      if (!href) return "";
      // only links to our own pages (or our contact email / phone): outside links are dropped
      if (/^https?:/i.test(href)) return "";
      return `<a href="${href.replace(/"/g, "&quot;")}">`;
    }
    if (tag === "h2" || tag === "h3") {
      const m = attrs.match(/id\s*=\s*"([a-z0-9-]{1,60})"/i);
      return m ? `<${tag} id="${m[1]}">` : `<${tag}>`;
    }
    return `<${tag}>`;
  });

  // a link we dropped leaves a stray </a>; balance them
  const open = (html.match(/<a /g) ?? []).length;
  let close = (html.match(/<\/a>/g) ?? []).length;
  while (close > open) {
    html = html.replace(/<\/a>/, "");
    close--;
  }
  return html.trim();
}

// Pulls "question / answer" pairs from the article's FAQ section (used for FAQ rich results).
export function extractFaq(html: string): { q: string; a: string }[] {
  const start = html.search(/<h2[^>]*id="faq"[^>]*>/i);
  if (start === -1) return [];
  const section = html.slice(start);
  const out: { q: string; a: string }[] = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*((?:<p>[\s\S]*?<\/p>\s*)+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section))) {
    const q = m[1].replace(/<[^>]+>/g, "").trim();
    const a = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (q && a) out.push({ q, a });
  }
  return out.slice(0, 8);
}
