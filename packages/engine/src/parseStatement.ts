/**
 * packages/engine/src/parseStatement.ts
 * Reads an M-Pesa statement CSV. Column order and header wording vary by export,
 * so we match headers by meaning ("receipt", "paid", "completion") rather than position.
 * PDF extracts often put each cell on its own line; the plain reader joins those windows.
 */
import { StatementRow } from "./types.js";

const RECEIPT = /\b([A-Z][A-Z0-9]{9})\b/g;
const MONEY = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/g;
const WHEN =
  /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i;

/**
 * Parse a statement from CSV, a spreadsheet dump, or plain text pulled from a PDF.
 * CSV is tried first; if there is no receipt column, we scan for M-Pesa codes.
 *
 * @param text - Untrusted statement contents
 * @returns Credit and debit rows. Unreadable rows are skipped, never thrown.
 */
export function parseStatement(text: string): StatementRow[] {
  const normalized = normalizeStatementText(text);
  const csv = parseStatementCsv(normalized);
  if (csv.length > 0) return csv;
  return parseStatementPlain(normalized);
}

/**
 * Glue OCR-split receipt codes and unify line endings so later parsers see one token.
 *
 * @param text - Untrusted statement contents
 * @returns The same text with receipts collapsed to 10 characters
 */
export function normalizeStatementText(text: string): string {
  const unified = (text ?? "").replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  return unified.replace(/\b([A-Z](?:[ \t]?[A-Z0-9]){9})\b/g, (match) => {
    const compact = match.replace(/[ \t]/g, "");
    return isReceiptCode(compact) ? compact : match;
  });
}

/**
 * Parse a statement CSV into rows.
 * @param csv - Raw CSV text, including the header row
 * @returns Credit and debit rows. Unreadable rows are skipped, never thrown.
 */
export function parseStatementCsv(csv: string): StatementRow[] {
  const lines = splitCsvLines(csv);
  if (lines.length < 2) return [];
  const headerIndex = findCsvHeaderIndex(lines);
  if (headerIndex < 0) return [];
  const headerLine = lines[headerIndex] ?? "";
  const header = parseCsvRow(headerLine);
  const columns = mapColumns(header);
  if (columns.receipt === undefined) return [];
  const rows: StatementRow[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (!line.trim()) continue;
    const cells = parseCsvRow(line);
    const receipt = cell(cells, columns.receipt).replace(/\s+/g, "").toUpperCase();
    if (!isReceiptCode(receipt)) continue;
    rows.push({
      receiptNo: receipt,
      completedAt: parseCompletion(cell(cells, columns.time)),
      details: cell(cells, columns.details),
      status: cell(cells, columns.status),
      paidInKes: parseMoney(cell(cells, columns.paid)),
      withdrawnKes: parseMoney(cell(cells, columns.withdrawn)),
    });
  }
  return rows;
}

interface Columns {
  receipt?: number;
  time?: number;
  details?: number;
  status?: number;
  paid?: number;
  withdrawn?: number;
}

function mapColumns(header: string[]): Columns {
  const columns: Columns = {};
  header.forEach((name, index) => {
    const key = name.toLowerCase().replace(/[^a-z]/g, "");
    if (key.includes("receipt")) columns.receipt = index;
    else if (key.includes("completion") || key === "time" || key.includes("datetime")) columns.time = index;
    else if (key.includes("detail")) columns.details = index;
    else if (key.includes("status")) columns.status = index;
    else if (key.includes("paid")) columns.paid = index;
    else if (key.includes("withdraw")) columns.withdrawn = index;
  });
  return columns;
}

function findCsvHeaderIndex(lines: string[]): number {
  const limit = Math.min(lines.length, 50);
  for (let i = 0; i < limit; i++) {
    const line = lines[i] ?? "";
    if (!line.includes(",") && !line.includes("\t")) continue;
    const header = parseCsvRow(line.replace(/\t/g, ","));
    const columns = mapColumns(header);
    if (columns.receipt !== undefined && header.length > 1) return i;
  }
  return -1;
}

function cell(cells: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

function parseMoney(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function parseCompletion(raw: string): Date | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    return new Date(
      Date.UTC(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3]),
        Number(iso[4]),
        Number(iso[5]),
        iso[6] ? Number(iso[6]) : 0,
      ) - 3 * 60 * 60 * 1000,
    );
  }
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
  if (!dmy) return null;
  let year = Number(dmy[3]);
  if (year < 100) year += 2000;
  let hours = Number(dmy[4]);
  const ampm = dmy[7]?.toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(
    Date.UTC(year, Number(dmy[2]) - 1, Number(dmy[1]), hours, Number(dmy[5]), dmy[6] ? Number(dmy[6]) : 0) -
      3 * 60 * 60 * 1000,
  );
}

function splitCsvLines(csv: string): string[] {
  return csv.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "").split("\n");
}

function isReceiptCode(value: string): boolean {
  return /^[A-Z][A-Z0-9]{9}$/.test(value) && /\d/.test(value);
}

/**
 * Read receipt rows from statement text that is not a CSV, such as a PDF extract.
 * Safaricom PDFs often emit one table cell per line, so each receipt owns the
 * text until the next receipt rather than a single physical line.
 *
 * @param text - Untrusted plain text
 * @returns Rows keyed by receipt number
 */
export function parseStatementPlain(text: string): StatementRow[] {
  const source = normalizeStatementText(text);
  const rows: StatementRow[] = [];
  const seen = new Set<string>();
  const matches = [...source.matchAll(RECEIPT)].filter((item) => isReceiptCode(item[1] ?? ""));
  for (let i = 0; i < matches.length; i++) {
    const receiptNo = matches[i]?.[1];
    if (!receiptNo || seen.has(receiptNo)) continue;
    const start = matches[i]?.index ?? 0;
    const next = matches[i + 1]?.index;
    const end = next !== undefined ? next : Math.min(source.length, start + 500);
    seen.add(receiptNo);
    rows.push(rowFromWindow(receiptNo, source.slice(start, end)));
  }
  return rows;
}

function rowFromWindow(receiptNo: string, window: string): StatementRow {
  const amounts = [...window.matchAll(MONEY)].map((item) => parseMoney(item[1] ?? ""));
  const paidInKes =
    amounts.length >= 3 ? (amounts[amounts.length - 3] ?? null) : (amounts[0] ?? null);
  const withdrawnKes =
    amounts.length >= 3
      ? (amounts[amounts.length - 2] ?? null)
      : amounts.length === 2
        ? (amounts[1] ?? null)
        : null;
  const timeMatch = window.match(WHEN);
  const status = /fail/i.test(window) ? "Failed" : /complete/i.test(window) ? "Completed" : "";
  return {
    receiptNo,
    completedAt: parseCompletion(timeMatch?.[1] ?? ""),
    details: window.replace(/\s+/g, " ").trim().slice(0, 240),
    status,
    paidInKes,
    withdrawnKes: amounts.length >= 2 ? withdrawnKes : null,
  };
}

/**
 * Turn a paid-in statement row into SMS-shaped text the existing M-Pesa parser can read.
 * The numbers come from the statement; this does not invent a receipt or an amount.
 *
 * @param row - One statement row
 * @returns A single confirmation-shaped message
 */
export function statementRowToMpesaText(row: StatementRow): string {
  const amount = row.paidInKes ?? 0;
  const name = senderFromDetails(row.details) ?? "Customer";
  const when = formatWhen(row.completedAt);
  const money = amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const head = `${row.receiptNo} Confirmed. Ksh${money}.00 received from ${name}`;
  return when ? `${head} on ${when}.` : `${head}.`;
}

function senderFromDetails(details: string): string | null {
  const match = details.match(
    /(?:received from|transfer from|payment from|from)\s*[:\-–]?\s*(?:\d{6,12}\s*[:\-–]?\s*)?([A-Za-z][A-Za-z .']{1,50})/i,
  );
  const name = match?.[1]?.replace(/\s+/g, " ").trim().replace(/[.-]+$/, "");
  if (!name || name.length < 2) return null;
  if (/^(completed|failed|customer|pay|bill|funds)$/i.test(name)) return null;
  return name;
}

function formatWhen(at: Date | null): string | null {
  if (!at) return null;
  // Statement times were stored as UTC-from-Nairobi; print them back as Nairobi civil time.
  const nairobi = new Date(at.getTime() + 3 * 60 * 60 * 1000);
  const day = String(nairobi.getUTCDate()).padStart(2, "0");
  const month = String(nairobi.getUTCMonth() + 1).padStart(2, "0");
  const year = nairobi.getUTCFullYear();
  let hours = nairobi.getUTCHours();
  const minutes = String(nairobi.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}/${month}/${year} at ${hours}:${minutes} ${ampm}`;
}

/**
 * Minimal CSV row splitter that honours double quotes. Statement exports quote fields that contain commas.
 * @param line - One physical line
 * @returns Cells with quotes removed
 */
export function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}
