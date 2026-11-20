/**
 * packages/engine/src/parseStatement.ts
 * Reads an M-Pesa statement CSV. Column order and header wording vary by export,
 * so we match headers by meaning ("receipt", "paid", "completion") rather than position.
 */
import { StatementRow } from "./types.js";

/**
 * Parse a statement CSV into rows.
 * @param csv - Raw CSV text, including the header row
 * @returns Credit and debit rows. Unreadable rows are skipped, never thrown.
 */
export function parseStatementCsv(csv: string): StatementRow[] {
  const lines = splitCsvLines(csv);
  if (lines.length < 2) return [];
  const header = parseCsvRow(lines[0] ?? "");
  const columns = mapColumns(header);
  if (columns.receipt === undefined) return [];
  const rows: StatementRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvRow(line);
    const receipt = cell(cells, columns.receipt);
    if (!receipt) continue;
    rows.push({
      receiptNo: receipt.replace(/\s+/g, "").toUpperCase(),
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
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
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
