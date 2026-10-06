import { inflateRawSync } from "node:zlib";

type ImportRow = {
  row_number: number;
  sku: string;
  quantity: number;
};

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

function columnIndex(ref: string) {
  let result = 0;
  for (const ch of ref) {
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return result - 1;
}

function unzipEntries(buffer: Buffer) {
  const files = new Map<string, Buffer>();
  let eocd = -1;

  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }

  if (eocd < 0) {
    throw new Error("Invalid XLSX file.");
  }

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);

  for (let i = 0; i < totalEntries; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Invalid XLSX central directory.");
    }

    const compression = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8");

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("Invalid XLSX local file header.");
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    let data: Buffer;
    if (compression === 0) {
      data = Buffer.from(compressed);
    } else if (compression === 8) {
      data = inflateRawSync(compressed);
    } else {
      throw new Error("Unsupported XLSX compression method.");
    }

    files.set(name, data);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return files;
}

function parseSheetXml(files: Map<string, Buffer>) {
  const shared: string[] = [];
  const sharedXml = files.get("xl/sharedStrings.xml")?.toString("utf8");

  if (sharedXml) {
    for (const match of sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      const parts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(
        (part) => decodeXml(part[1])
      );
      shared.push(parts.join(""));
    }
  }

  const sheetXml = files.get("xl/worksheets/sheet1.xml")?.toString("utf8");
  if (!sheetXml) {
    throw new Error("The workbook does not contain a first worksheet.");
  }

  const rows: string[][] = [];

  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref) continue;

      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const col = columnIndex(ref);
      const rawValue =
        type === "inlineStr"
          ? body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? ""
          : body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";

      let value = decodeXml(rawValue);
      if (type === "s" && /^\d+$/.test(value)) {
        value = shared[Number(value)] ?? "";
      }

      row[col] = value;
    }

    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === "\"") {
      if (quoted && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  cells.push(current.trim());
  return cells;
}

function normalizeRows(rows: string[][]): ImportRow[] {
  if (rows.length < 2) {
    throw new Error("Inventory file must include a header row and at least one data row.");
  }

  const headers = rows[0].map((value) => value?.trim().toLowerCase());
  const skuIndex = headers.findIndex((value) =>
    ["sku", "part_number", "part number", "partnumber"].includes(value)
  );
  const quantityIndex = headers.findIndex((value) =>
    ["quantity", "qty", "stock", "on_hand", "on hand"].includes(value)
  );

  if (skuIndex < 0 || quantityIndex < 0) {
    throw new Error("Inventory file must contain SKU and Quantity columns.");
  }

  return rows
    .slice(1)
    .map((row, index) => {
      const sku = String(row[skuIndex] ?? "").trim();
      const quantityText = String(row[quantityIndex] ?? "").trim();
      const quantity = Number(quantityText);

      if (!sku && !quantityText) {
        return null;
      }

      if (!Number.isInteger(quantity)) {
        throw new Error(\`Row \${index + 2}: quantity must be a whole number.\`);
      }

      return {
        row_number: index + 2,
        sku,
        quantity,
      };
    })
    .filter((row): row is ImportRow => row !== null);
}

export function parseInventoryFile(fileName: string, bytes: ArrayBuffer) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/, "");
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map(parseCsvLine);

    return normalizeRows(rows);
  }

  if (lower.endsWith(".xlsx")) {
    const files = unzipEntries(Buffer.from(bytes));
    return normalizeRows(parseSheetXml(files));
  }

  throw new Error("Please upload a .xlsx or .csv inventory file.");
}
