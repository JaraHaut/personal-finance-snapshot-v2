/**
 * Core domain types for the Personal Finance Snapshot app.
 *
 * Branded primitive types prevent accidental id/date confusion at compile time.
 */

// --- Branded primitives ---
declare const _brand: unique symbol;
type Brand<T, B> = T & { readonly [_brand]: B };

/** ISO date string: "YYYY-MM-DD" */
export type ISODate = Brand<string, 'ISODate'>;
/** Transaction UUID */
export type TransactionId = Brand<string, 'TransactionId'>;
/** Import UUID */
export type ImportId = Brand<string, 'ImportId'>;

// --- Domain enums ---

/**
 * 11 categories: 10 from brainstorm + 'Transfers' for transfer-detected rows.
 * 'Transfers' is the category; type is still 'income' | 'expense' (user-chosen).
 */
export type Category =
  | 'Groceries'
  | 'Dining'
  | 'Transport'
  | 'Subscriptions'
  | 'Utilities'
  | 'Shopping'
  | 'Health'
  | 'Travel'
  | 'Income'
  | 'Transfers'
  | 'Other';

/**
 * Transactions are always income or expense.
 * 'Transfers' is a category, not a type — the type of a transfer row is
 * assigned by the user in ImportSummaryModal.
 */
export type TransactionType = 'income' | 'expense';

// --- Core entities ---

export interface Transaction {
  id: TransactionId;
  importId: ImportId;
  date: ISODate;        // Normalized to YYYY-MM-DD
  description: string;
  amount: number;       // Always positive (absolute value)
  type: TransactionType;
  category: Category;
  isManualCategory: boolean; // true if user overrode auto-categorization
}

/** Row that failed parsing — shown in ImportSummaryModal. */
export interface SkippedRow {
  rowNumber: number;
  rawLine: string;
  reason:
    | 'missing_date'
    | 'invalid_date_format'
    | 'missing_amount'
    | 'non_numeric_amount'
    | 'empty_row';
}

/** Exact duplicate detected on import (same date+description+amount). */
export interface DuplicateRow {
  existing: Transaction;
  incoming: ParsedRow;
  rawLine: string;
}

/** A transfer-detected row requiring user classification before saving. */
export interface TransferRow {
  row: ParsedRow;
  chosenType: TransactionType | null; // null until user picks income/expense
}

/**
 * Intermediate type returned by csv-parser before IDs are assigned.
 * Amount is always positive; type comes from categorizer rules.
 */
export interface ParsedRow {
  date: ISODate;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
}

/** Metadata about a stored import (transactions stored separately). */
export interface ImportedFile {
  id: ImportId;
  label: string;       // User-assigned: "January 2026"
  importedAt: string;  // ISO timestamp
  fileName: string;
  skippedCount: number;
  // NOTE: transactionCount is intentionally NOT stored here.
  // Derive it: transactions.filter(t => t.importId === id).length
}

/** Shape of data in localStorage. */
export interface AppStorage {
  schemaVersion: number; // Bump on any breaking model change. Current: 1.
  imports: ImportedFile[];
  transactions: Transaction[];
}

/** Active filter state shared across Dashboard and Transactions pages. */
export interface Filters {
  selectedMonth: string | null; // "YYYY-MM" or null for all
  selectedCategories: Category[];
  selectedType: TransactionType | 'all';
}
