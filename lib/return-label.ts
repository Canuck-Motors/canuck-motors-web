import "server-only";
import { pickup } from "@/lib/uber-direct";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliveryCarrierLabel } from "@/lib/delivery-carrier";

export type ReturnDestination = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export function returnDestination(): ReturnDestination {
  const p = pickup();
  return {
    name: process.env.RETURN_NAME || "UBER RETURN",
    street: process.env.RETURN_STREET || p.address.street,
    city: process.env.RETURN_CITY || p.address.city,
    state: process.env.RETURN_STATE || p.address.state,
    zip: process.env.RETURN_ZIP || p.address.zip,
    country: process.env.RETURN_COUNTRY || "CA",
  };
}

export function formatReturnAddress() {
  const d = returnDestination();
  return [d.name, d.street, `${d.city}, ${d.state} ${d.zip}`, d.country].join("\n");
}

/* ------------------------------------------------------------------ */
/* Label data                                                          */
/* ------------------------------------------------------------------ */

export type ReturnLabelData = {
  returnRef: string;
  orderNumber: string;
  createdOn: string;
  reason: string;
  from: { name: string; line1: string; line2: string; city: string; province: string; postal: string; country: string };
  to: ReturnDestination;
  items: { sku: string; name: string; qty: number; price?: number }[];
  deliveryCarrier?: string;
  weightKg: number | null; // estimated, incl. packaging; null when a product weight is missing
};

const PACKAGING_KG = 0.2;

export const returnRefFor = (requestId: string) => `RET-${String(requestId).replace(/-/g, "").slice(0, 8).toUpperCase()}`;

type Addr = Record<string, unknown> | null | undefined;
const str = (v: unknown) => (v == null ? "" : String(v).trim());

function pickAddress(shipTo: Addr, shipping: Addr, fallbackName: string) {
  const a = (shipTo && str(shipTo.line1) ? shipTo : shipping) ?? {};
  return {
    name: str(a.name) || fallbackName,
    line1: str(a.line1),
    line2: str(a.line2),
    city: str(a.city),
    province: str(a.province),
    postal: str(a.postal_code),
    country: str(a.country) || "CA",
  };
}

// Builds the label from live order data.
async function buildReturnLabelData(requestId: string): Promise<ReturnLabelData | null> {
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("return_requests")
    .select("id, order_id, reason_code, requested_on, return_request_items(quantity, order_items(product_id, product_name, sku, unit_price))")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return null;

  let order: Record<string, unknown> | null = null;
  for (const cols of [
    "order_number, customer_name, shipping_address, ship_to, delivery_method, fulfillment_provider",
    "order_number, customer_name, shipping_address, delivery_method, fulfillment_provider",
    "order_number, customer_name, shipping_address",
  ]) {
    const res = await admin.from("orders").select(cols).eq("id", request.order_id).maybeSingle();
    if (!res.error) {
      order = (res.data as unknown as Record<string, unknown> | null) ?? null;
      break;
    }
  }
  if (!order) return null;

  type OI = { product_id: number; product_name: string; sku: string; unit_price: number | null };
  type Row = { quantity: number; order_items: OI | OI[] | null };
  const rows = ((request.return_request_items ?? []) as unknown as Row[]).map((r) => {
    const oi = Array.isArray(r.order_items) ? r.order_items[0] : r.order_items;
    return { qty: Number(r.quantity) || 1, productId: oi?.product_id ?? null, sku: str(oi?.sku), name: str(oi?.product_name), price: oi?.unit_price == null ? undefined : Number(oi.unit_price) };
  });

  const ids = [...new Set(rows.map((r) => r.productId).filter((x): x is number => x != null))];
  const weights = new Map<number, number | null>();
  if (ids.length) {
    const { data: products } = await admin.from("products").select("id, weight_kg").in("id", ids);
    for (const p of products ?? []) weights.set(Number(p.id), p.weight_kg == null ? null : Number(p.weight_kg));
  }
  let weightKg: number | null = PACKAGING_KG;
  for (const r of rows) {
    const w = r.productId != null ? weights.get(r.productId) : null;
    if (w == null || !Number.isFinite(w)) {
      weightKg = null;
      break;
    }
    weightKg += w * r.qty;
  }

  // How the order was originally delivered.
  let deliveryCarrier = "";
  try {
    const { data: ship } = await admin.from("shipments").select("carrier, tracking_number").eq("order_id", request.order_id).limit(1).maybeSingle();
    deliveryCarrier = deliveryCarrierLabel({
      carrier: ship?.carrier,
      tracking: ship?.tracking_number,
      deliveryMethod: str(order.delivery_method),
      provider: str(order.fulfillment_provider),
    });
  } catch {
    deliveryCarrier = deliveryCarrierLabel({ deliveryMethod: str(order.delivery_method), provider: str(order.fulfillment_provider) });
  }

  return {
    returnRef: returnRefFor(requestId),
    orderNumber: str(order.order_number),
    createdOn: str(request.requested_on) || new Date().toISOString(),
    reason: str(request.reason_code).replaceAll("_", " "),
    from: pickAddress(order.ship_to as Addr, order.shipping_address as Addr, str(order.customer_name)),
    to: returnDestination(),
    items: rows.map((r) => ({ sku: r.sku, name: r.name, qty: r.qty, price: r.price })),
    deliveryCarrier,
    weightKg: weightKg == null ? null : Math.round(weightKg * 100) / 100,
  };
}

// Returns the label saved at approval time, or builds it live if none was saved.
export async function loadReturnLabelData(requestId: string): Promise<ReturnLabelData | null> {
  try {
    const { data } = await createAdminClient().from("return_requests").select("label_data").eq("id", requestId).maybeSingle();
    const saved = (data as { label_data?: ReturnLabelData | null } | null)?.label_data;
    if (saved && saved.returnRef && saved.to) return saved;
  } catch {
    // label_data column not installed yet: build live
  }
  return buildReturnLabelData(requestId);
}

// Saves the label details on the return so the customer and admin always get the same label.
export async function saveReturnLabelSnapshot(requestId: string): Promise<ReturnLabelData | null> {
  const data = await buildReturnLabelData(requestId);
  if (!data) return null;
  try {
    const { error } = await createAdminClient()
      .from("return_requests")
      .update({ label_data: data, label_created_on: new Date().toISOString() })
      .eq("id", requestId);
    if (error) console.warn("[return-label] could not save label snapshot (run database/return_labels.sql):", error.message);
  } catch (e) {
    console.warn("[return-label] could not save label snapshot:", e);
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* Code 128-B barcode                                                  */
/* ------------------------------------------------------------------ */

const CODE128 = ["11011001100","11001101100","11001100110","10010011000","10010001100","10001001100","10011001000","10011000100","10001100100","11001001000","11001000100","11000100100","10110011100","10011011100","10011001110","10111001100","10011101100","10011100110","11001110010","11001011100","11001001110","11011100100","11001110100","11101101110","11101001100","11100101100","11100100110","11101100100","11100110100","11100110010","11011011000","11011000110","11000110110","10100011000","10001011000","10001000110","10110001000","10001101000","10001100010","11010001000","11000101000","11000100010","10110111000","10110001110","10001101110","10111011000","10111000110","10001110110","11101110110","11010001110","11000101110","11011101000","11011100010","11011101110","11101011000","11101000110","11100010110","11101101000","11101100010","11100011010","11101111010","11001000010","11110001010","10100110000","10100001100","10010110000","10010000110","10000101100","10000100110","10110010000","10110000100","10011010000","10011000010","10000110100","10000110010","11000010010","11001010000","11110111010","11000010100","10001111010","10100111100","10010111100","10010011110","10111100100","10011110100","10011110010","11110100100","11110010100","11110010010","11011011110","11011110110","11110110110","10101111000","10100011110","10001011110","10111101000","10111100010","11110101000","11110100010","10111011110","10111101110","11101011110","11110101110","11010000100","11010010000","11010011100"];

export function code128Modules(text: string): string {
  const values = [...text].map((ch) => {
    const v = ch.charCodeAt(0) - 32;
    return v >= 0 && v <= 94 ? v : 31; // unsupported characters become '?'
  });
  const check = (104 + values.reduce((sum, v, i) => sum + v * (i + 1), 0)) % 103;
  return [104, ...values, check].map((v) => CODE128[v]).join("") + "1100011101011";
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

const toLatin1 = (s: string) => s.replace(/[^\x20-\xff]/g, "?");
const esc = (s: string) => toLatin1(s).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
const fit = (s: string, size: number, width: number, bold = false) => {
  const per = size * (bold ? 0.58 : 0.52);
  const max = Math.max(4, Math.floor(width / per));
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
};
const f = (n: number) => (Math.round(n * 100) / 100).toString();

export function buildReturnLabelPdf(data: ReturnLabelData) {
  const ops: string[] = [];
  const text = (x: number, y: number, size: number, value: string, bold = false) =>
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${f(x)} ${f(y)} Td (${esc(value)}) Tj ET`);
  const hline = (x1: number, x2: number, y: number, w = 0.6) => ops.push(`${w} w ${f(x1)} ${f(y)} m ${f(x2)} ${f(y)} l S`);

  // 4 x 6 inch label at the top-left of a Letter page.
  const bx = 36, by = 324, bw = 288, bh = 432, pad = 12;
  const inner = bw - pad * 2;
  ops.push(`1.6 w ${bx} ${by} ${bw} ${bh} re S`);

  const date = new Date(data.createdOn).toLocaleDateString("en-CA", { dateStyle: "medium", timeZone: "America/Vancouver" });
  text(bx + pad, 732, 17, "RETURN LABEL", true);
  text(bx + bw - pad - date.length * 4.2, 733, 8, date);
  text(bx + pad, 721, 7.5, "Canuck Motors - canuckmotors.ca");
  hline(bx, bx + bw, 714, 1.2);

  // FROM
  const f0 = data.from;
  text(bx + pad, 702, 7, "FROM", true);
  const cityLine = [f0.city, f0.province].filter(Boolean).join(", ") + (f0.postal ? `  ${f0.postal}` : "");
  const fromLines = [f0.name, f0.line1, f0.line2, cityLine.trim(), f0.country === "CA" ? "CANADA" : f0.country].filter(Boolean);
  fromLines.slice(0, 5).forEach((l, i) => text(bx + pad, 690 - i * 11.5, i === 0 ? 10 : 9, fit(l, i === 0 ? 10 : 9, inner, i === 0), i === 0));
  hline(bx, bx + bw, 618, 1.2);

  // TO
  const t = data.to;
  text(bx + pad, 604, 7, "SHIP TO", true);
  text(bx + pad, 582, 15, fit(t.name, 15, inner, true), true);
  text(bx + pad, 562, 13, fit(t.street, 13, inner));
  text(bx + pad, 544, 13, fit(`${t.city}, ${t.state}  ${t.zip}`, 13, inner));
  text(bx + pad, 526, 11, fit(t.country === "CA" ? "CANADA" : t.country, 11, inner));
  hline(bx, bx + bw, 512, 1.2);

  // Order / return / weight
  const colW = inner / 3;
  const meta = (x: number, yLabel: number, label: string, value: string, width: number) => {
    text(x, yLabel, 6.5, label, true);
    text(x, yLabel - 11, 8.5, fit(value, 8.5, width - 4, true), true);
  };
  meta(bx + pad, 500, "ORDER", data.orderNumber, colW);
  meta(bx + pad + colW, 500, "RETURN REF", data.returnRef, colW);
  meta(bx + pad + colW * 2, 500, "EST. WEIGHT", data.weightKg == null ? "Weigh at drop-off" : `${data.weightKg.toFixed(2)} kg`, colW);
  meta(bx + pad, 476, "REQUESTED ON", date, colW);
  meta(bx + pad + colW, 476, "ORIGINALLY DELIVERED BY", data.deliveryCarrier || "Standard shipping", colW * 2);
  hline(bx, bx + bw, 455, 0.8);

  // Items to return, with price
  text(bx + pad, 446, 6.5, "ITEMS TO RETURN", true);
  const shown = data.items.slice(0, 3);
  shown.forEach((it, i) => {
    const y = 435 - i * 11;
    const price = it.price == null ? "" : `$${(it.price * it.qty).toFixed(2)}`;
    text(bx + pad, y, 8.5, fit(`${it.qty} x ${it.sku}  ${it.name}`, 8.5, inner - 48));
    if (price) text(bx + bw - pad - price.length * 4.7, y, 8.5, price, true);
  });
  if (data.items.length > shown.length) text(bx + pad, 435 - shown.length * 11, 8, `+ ${data.items.length - shown.length} more item(s)`);
  hline(bx, bx + bw, 394, 1.2);

  // Barcode (Code 128-B of the return reference)
  const modules = code128Modules(data.returnRef);
  const mw = Math.min(1.5, (inner - 28) / modules.length);
  const barW = modules.length * mw;
  const x0 = bx + (bw - barW) / 2;
  let path = "";
  for (let i = 0; i < modules.length; ) {
    if (modules[i] === "1") {
      let j = i;
      while (j < modules.length && modules[j] === "1") j++;
      path += `${f(x0 + i * mw)} 350 ${f((j - i) * mw)} 36 re `;
      i = j;
    } else i++;
  }
  ops.push(`${path}f`);
  const label = data.returnRef;
  text(bx + (bw - label.length * 5.2) / 2, 338, 10, label, true);
  text(bx + pad, 328, 6, "Return authorization label. Postage is not included. Ship with any carrier.");

  // Instructions under the label
  text(bx, 300, 11, "How to use this label", true);
  [
    "1. Print this page at 100% (do not scale it to fit).",
    "2. Pack the part in its original packaging and put your order number inside the box.",
    "3. Attach the label flat on the outside of the box. Do not cover the barcode.",
    "4. Drop the box off with any carrier. Postage is not included in this label.",
    "5. Keep your carrier receipt and tracking number, and email it to contactus@canuckmotors.ca.",
  ].forEach((l, i) => text(bx, 282 - i * 15, 10, l));
  text(bx, 195, 8.5, "This is a return authorization label with a scannable return reference. It does not contain carrier postage or a carrier tracking number.");
  text(bx, 183, 8.5, "Questions? Email contactus@canuckmotors.ca or call 604-445-0147.");

  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
