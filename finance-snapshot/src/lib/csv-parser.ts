import Papa from 'papaparse';
import { categorize } from './categorizer';
import { asISODate } from './storage';
import type { ParsedRow, SkippedRow, DuplicateRow, Transaction, ISODate } from '../types';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ParseCSVResult {
  valid: ParsedRow[];
  skipped: SkippedRow[];
  duplicates: DuplicateRow[];
}

/**
 * Validate file size before reading.
 * Throws an Error with a user-friendly message if the file is too large.
 */
export function validateFileSize(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is 10MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB).`);
  }
}

/**
 * Normalize a date string to ISO format (YYYY-MM-DD).
 * Supports: MM/DD/YYYY, M/D/YYYY, YYYY-MM-DD
 * Returns null if the format is unrecognized.
 */
export function normalizeDate(raw: string): ISODate | null {
  const s = raw.trim();
  if (!s) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [year, month, day] = s.split('-').map(Number);
    if (isValidDate(year, month, day)) {
      return asISODate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    return null;
  }

  // MM/DD/YYYY or M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [month, day, year] = s.split('/').map(Number);
    if (isValidDate(year, month, day)) {
      return asISODate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    return null;
  }

  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Parse an amount string to a positive number.
 * Strips leading $, commas, and whitespace.
 * Returns null if the result is NaN.
 */
export function parseAmount(raw: string): number | null {
  const stripped = raw.trim().replace(/[$,\s]/g, '');
  if (!stripped) return null;
  const n = parseFloat(stripped);
  if (isNaN(n)) return null;
  return Math.round(Math.abs(n) * 100) / 100;
}

/**
 * Sanitize description: strip leading CSV-injection trigger characters.
 * Protects against downstream formula injection if data is exported to spreadsheets.
 */
export function sanitizeDescription(raw: string): string {
  return raw.replace(/^[=+\-@|;\t\r]+/, '').trim();
}

/**
 * Parse a CSV File and return categorized valid rows, skipped rows, and duplicates.
 * Uses Papa Parse with worker mode for large files.
 * Amount sign is ignored — type comes from categorizer rules.
 */
export function parseCSV(
  file: File,
  existingTransactions: Transaction[]
): Promise<ParseCSVResult> {
  return new Promise((resolve, reject) => {
    const valid: ParsedRow[] = [];
    const skipped: SkippedRow[] = [];
    let rowIndex = 0; // 0-based after header

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimitersToGuess: [',', '\t', ';', '|'],
      worker: false, // worker: true causes issues with some bundler setups; disable for compatibility
      complete(results) {
        for (const row of results.data) {
          rowIndex++;
          const rawLine = Object.values(row).join(',');

          // Determine field names (case-insensitive header matching)
          const keys = Object.keys(row).map((k) => k.toLowerCase().trim());
          const dateKey = Object.keys(row)[keys.indexOf('date')] ?? '';
          const descKey = Object.keys(row)[keys.indexOf('description')] ?? '';
          const amtKey = Object.keys(row)[keys.indexOf('amount')] ?? '';

          const rawDate = (row[dateKey] ?? '').trim();
          const rawDesc = (row[descKey] ?? '').trim();
          const rawAmt = (row[amtKey] ?? '').trim();

          // Validate date
          if (!rawDate) {
            skipped.push({ rowNumber: rowIndex, rawLine, reason: 'missing_date' });
            continue;
          }
          const date = normalizeDate(rawDate);
          if (!date) {
            skipped.push({ rowNumber: rowIndex, rawLine, reason: 'invalid_date_format' });
            continue;
          }

          // Validate amount
          if (!rawAmt) {
            skipped.push({ rowNumber: rowIndex, rawLine, reason: 'missing_amount' });
            continue;
          }
          const amount = parseAmount(rawAmt);
          if (amount === null) {
            skipped.push({ rowNumber: rowIndex, rawLine, reason: 'non_numeric_amount' });
            continue;
          }

          const description = sanitizeDescription(rawDesc);
          const { category, type } = categorize(description);

          valid.push({ date, description, amount, category, type });
        }

        // Detect exact duplicates: same date + description + amount vs existing transactions
        const duplicates: DuplicateRow[] = [];
        const dedupedValid: ParsedRow[] = [];

        for (const row of valid) {
          const existing = existingTransactions.find(
            (t) =>
              t.date === row.date &&
              t.description === row.description &&
              Math.round(t.amount * 100) === Math.round(row.amount * 100)
          );
          if (existing) {
            duplicates.push({ existing, incoming: row, rawLine: `${row.date},${row.description},${row.amount}` });
          } else {
            dedupedValid.push(row);
          }
        }

        resolve({ valid: dedupedValid, skipped, duplicates });
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`));
      },
    });
  });
}
