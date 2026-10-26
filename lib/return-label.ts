import "server-only";
import { pickup } from "@/lib/uber-direct";

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

const esc = (value: string) =>
  value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");

export function buildReturnLabelPdf(input: {
  orderNumber: string;
  requestId: string;
}) {
  const d = returnDestination();
  const lines = [
    { x: 54, y: 730, size: 22, text: "CANUCK MOTORS RETURN LABEL" },
    { x: 54, y: 695, size: 11, text: `Order: ${input.orderNumber}` },
    { x: 54, y: 678, size: 9, text: `Return ID: ${input.requestId}` },

    { x: 54, y: 620, size: 14, text: "FROM - CUSTOMER TO FILL IN" },
    { x: 54, y: 590, size: 11, text: "Name: ______________________________________________" },
    { x: 54, y: 566, size: 11, text: "Street: _____________________________________________" },
    { x: 54, y: 542, size: 11, text: "City/Province: ______________________________________" },
    { x: 54, y: 518, size: 11, text: "Postal code: ________________________________________" },

    { x: 54, y: 450, size: 14, text: "TO" },
    { x: 54, y: 420, size: 18, text: d.name },
    { x: 54, y: 392, size: 13, text: d.street },
    { x: 54, y: 370, size: 13, text: `${d.city}, ${d.state} ${d.zip}` },
    { x: 54, y: 348, size: 13, text: d.country },

    { x: 54, y: 270, size: 13, text: "PRINT THIS PAGE AND ATTACH IT FLAT TO THE OUTSIDE OF THE BOX." },
    { x: 54, y: 244, size: 13, text: "DO NOT WRITE ANYTHING ELSE ON THE BOX." },
    { x: 54, y: 218, size: 10, text: "Keep your carrier receipt and tracking number until the return is completed." },
  ];

  const stream = lines
    .map(({ x, y, size, text }) => `BT /F1 ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`)
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
