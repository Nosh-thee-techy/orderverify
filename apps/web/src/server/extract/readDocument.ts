/**
 * apps/web/src/server/extract/readDocument.ts
 * Pulls plain text out of an uploaded file. Chat and statement parsers then
 * treat that text as untrusted input, the same as a paste box.
 */
import "server-only";

const MAX_CHARS = 1_000_000;

/**
 * Extract readable text from a document buffer.
 *
 * @param bytes - File contents
 * @param fileName - Original name, used only to pick a reader
 * @param mime - Browser-supplied type, used as a fallback
 * @returns Extracted text, possibly empty
 */
export async function extractDocumentText(bytes: Uint8Array, fileName: string, mime: string): Promise<string> {
  const name = fileName.toLowerCase();
  const type = mime.toLowerCase();
  let text = "";

  if (isPdf(name, type)) {
    text = await readPdf(bytes);
  } else if (isDocx(name, type)) {
    text = await readDocx(bytes);
  } else if (isSpreadsheet(name, type)) {
    text = await readSpreadsheet(bytes);
  } else if (isZip(name, type)) {
    text = await readZip(bytes);
  } else if (isImage(name, type)) {
    text = await readImage(bytes);
  } else if (isHtml(name, type)) {
    text = stripTags(decodeUtf8(bytes));
  } else if (isRtf(name, type)) {
    text = stripRtf(decodeUtf8(bytes));
  } else {
    text = decodeUtf8(bytes);
    if (looksBinary(text) && isZipSignature(bytes)) {
      text = await readZip(bytes);
    }
  }

  return text.replace(/\u0000/g, "").slice(0, MAX_CHARS).trim();
}

function isPdf(name: string, type: string): boolean {
  return name.endsWith(".pdf") || type.includes("pdf");
}

function isDocx(name: string, type: string): boolean {
  return name.endsWith(".docx") || type.includes("wordprocessingml");
}

function isSpreadsheet(name: string, type: string): boolean {
  return (
    /\.(xlsx|xls|xlsm|xlsb|ods|csv|tsv)$/.test(name) ||
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "text/csv"
  );
}

function isZip(name: string, type: string): boolean {
  return name.endsWith(".zip") || type.includes("zip");
}

function isImage(name: string, type: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(name) || type.startsWith("image/");
}

function isHtml(name: string, type: string): boolean {
  return /\.(html?|xhtml)$/.test(name) || type.includes("html");
}

function isRtf(name: string, type: string): boolean {
  return name.endsWith(".rtf") || type.includes("rtf");
}

function isZipSignature(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

async function readPdf(bytes: Uint8Array): Promise<string> {
  const { extractText } = await import("unpdf");
  const result = await extractText(bytes, { mergePages: true });
  return Array.isArray(result.text) ? result.text.join("\n") : String(result.text ?? "");
}

async function readDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result.value ?? "";
}

async function readSpreadsheet(bytes: Uint8Array): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, { type: "array" });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return "";
    return XLSX.utils.sheet_to_csv(sheet);
  })
    .filter(Boolean)
    .join("\n");
}

async function readZip(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).sort();
  const preferred =
    names.find((name) => name.toLowerCase().endsWith("_chat.txt")) ??
    names.find((name) => name.toLowerCase().endsWith(".txt") && !name.startsWith("__")) ??
    names.find((name) => name.toLowerCase().endsWith(".csv"));
  const chosen = preferred ? zip.files[preferred] : null;
  if (!chosen || chosen.dir) return "";
  return chosen.async("string");
}

async function readImage(bytes: Uint8Array): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(Buffer.from(bytes));
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return Buffer.from(bytes).toString("latin1");
  }
}

function looksBinary(text: string): boolean {
  const sample = text.slice(0, 800);
  let odd = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code === 0 || (code < 9 && code !== 10 && code !== 13)) odd += 1;
  }
  return odd > 8;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
}

function stripRtf(rtf: string): string {
  return rtf
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-z]+-?\d* ?/gi, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ");
}
