// One branded layout for every customer email (orders, shipping, returns, labels), matching the site:
// dark header with the logo, red stripe, white card, red buttons. Table-based and inline-styled so it
// renders the same in Gmail, Outlook and Apple Mail. Every piece of text is escaped here.

export const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const BRAND = "#d62828";
const INK = "#0b0b0c";

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export type EmailBlock =
  | { type: "text"; text: string }
  | { type: "rows"; rows: [string, string][]; strongLast?: boolean }
  | { type: "items"; items: { name: string; sub?: string; amount?: string }[] }
  | { type: "box"; title?: string; lines: string[]; tone?: "neutral" | "warn" }
  | { type: "steps"; steps: string[] }
  | { type: "button"; label: string; url: string; dark?: boolean }
  | { type: "note"; text: string };

function block(b: EmailBlock): string {
  switch (b.type) {
    case "text":
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444444">${esc(b.text).replace(/\n/g, "<br>")}</p>`;
    case "note":
      return `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#777777">${esc(b.text).replace(/\n/g, "<br>")}</p>`;
    case "rows":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">${b.rows
        .map(([k, v], i) => {
          const last = b.strongLast && i === b.rows.length - 1;
          return `<tr><td style="padding:10px 0;border-bottom:1px solid #eeeeee;font-size:14px;color:#777777">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #eeeeee;font-size:${last ? 17 : 14}px;text-align:right;font-weight:bold;color:${last ? BRAND : "#111111"}">${esc(v)}</td></tr>`;
        })
        .join("")}</table>`;
    case "items":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px">${b.items
        .map(
          (i) =>
            `<tr><td style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:14px;color:#111111"><b>${esc(i.name)}</b>${i.sub ? `<div style="margin-top:2px;font-size:12px;color:#888888">${esc(i.sub)}</div>` : ""}</td>${i.amount ? `<td style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:14px;text-align:right;white-space:nowrap;color:#111111">${esc(i.amount)}</td>` : ""}</tr>`
        )
        .join("")}</table>`;
    case "box": {
      const warn = b.tone === "warn";
      return `<div style="margin:0 0 20px;padding:16px 18px;border-radius:14px;background:${warn ? "#fff7ed" : "#f7f7f8"};border:1px solid ${warn ? "#fed7aa" : "#e8e8ea"}">${b.title ? `<div style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND}">${esc(b.title)}</div>` : ""}<div style="font-size:14px;line-height:1.6;color:#111111">${b.lines.map(esc).join("<br>")}</div></div>`;
    }
    case "steps":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${b.steps
        .map(
          (s, i) =>
            `<tr><td valign="top" style="width:34px;padding:6px 0"><div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:${BRAND};color:#ffffff;font-size:12px;font-weight:bold;text-align:center">${i + 1}</div></td><td style="padding:6px 0;font-size:14px;line-height:1.6;color:#333333">${esc(s)}</td></tr>`
        )
        .join("")}</table>`;
    case "button":
      return /^https?:\/\//i.test(b.url)
        ? `<p style="margin:8px 0 24px;text-align:center"><a href="${esc(b.url)}" style="display:inline-block;background:${b.dark ? INK : BRAND};color:#ffffff;padding:14px 30px;border-radius:999px;text-decoration:none;font-weight:bold;font-size:15px">${esc(b.label)}</a></p>`
        : "";
  }
}

export function brandedEmail(opts: { preheader?: string; title: string; blocks: EmailBlock[] }): string {
  const site = siteUrl();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f4f5">${esc(opts.preheader)}</div>` : ""}
<div style="background:#f4f4f5;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e5e5">
    <div style="background:#ffffff;padding:22px 24px 20px;text-align:center">
      <a href="${esc(site)}" style="text-decoration:none"><img src="${esc(site)}/logo/Canuck-Motors.png" alt="Canuck Motors" height="44" style="height:44px;max-width:220px;border:0"></a>
    </div>
    <div style="height:4px;background:${BRAND}"></div>
    <div style="padding:32px 28px;color:#111111">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111111">${esc(opts.title)}</h1>
      ${opts.blocks.map(block).join("\n      ")}
    </div>
    <div style="background:#f4f4f5;padding:18px 16px;text-align:center;font-size:12px;line-height:1.7;color:#888888">
      Canuck Motors &middot; Quality auto parts across Canada<br>
      Questions? Reply to this email or call <a href="tel:+16044450147" style="color:#888888">604-445-0147</a>
    </div>
  </div>
</div>
</body></html>`;
}
