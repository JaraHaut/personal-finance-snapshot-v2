import { z } from 'zod';
import type { AppStorage, ImportedFile, Transaction, ImportId, TransactionId, ISODate } from '../types';

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

const CURRENT_SCHEMA_VERSION = 1;
const STORAGE_KEY = 'finance-snapshot';
/** Warn when localStorage usage exceeds this fraction (~4MB of ~5MB). */
const STORAGE_WARN_FRACTION = 0.80;

// ---------------------------------------------------------------------------
// Zod schemas (classic v3-compatible API)
// ---------------------------------------------------------------------------

const CategorySchema = z.enum([
  'Groceries', 'Dining', 'Transport', 'Subscriptions', 'Utilities',
  'Shopping', 'Health', 'Travel', 'Income', 'Transfers', 'Other',
]);

const TransactionTypeSchema = z.enum(['income', 'expense']);

const TransactionSchema = z.object({
  id: z.string(),
  importId: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number().nonnegative(),
  type: TransactionTypeSchema,
  category: CategorySchema,
  isManualCategory: z.boolean(),
});

const ImportedFileSchema = z.object({
  id: z.string(),
  label: z.string(),
  importedAt: z.string(),
  fileName: z.string(),
  skippedCount: z.number(),
});

const AppStorageSchema = z.object({
  schemaVersion: z.number(),
  imports: z.array(ImportedFileSchema),
  transactions: z.array(TransactionSchema),
});

// ---------------------------------------------------------------------------
// Migration chain
// ---------------------------------------------------------------------------

/** Run schema migrations. Add future migrations here as `if (v < N)` blocks. */
function migrate(data: unknown): AppStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const v: number = d?.schemaVersion ?? 0;
  // Future: if (v < 2) d = migrateV1toV2(d);
  void v; // suppress unused-variable warning until migrations are needed
  return { ...d, schemaVersion: CURRENT_SCHEMA_VERSION } as AppStorage;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return an empty default AppStorage. */
export function defaultAppStorage(): AppStorage {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, imports: [], transactions: [] };
}

/**
 * Load and validate data from localStorage.
 * Returns defaultAppStorage() if missing, corrupted, or schema-incompatible.
 * Runs migration chain and orphan detection on every load.
 */
export function loadAppData(): AppStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppStorage();

    const parsed = AppStorageSchema.parse(JSON.parse(raw));
    const migrated = migrate(parsed);

    // Orphan detection: remove transactions whose importId has no matching import
    const importIds = new Set(migrated.imports.map((i) => i.id));
    migrated.transactions = migrated.transactions.filter((t) =>
      importIds.has(t.importId)
    );

    return migrated;
  } catch (err) {
    console.warn('[finance-snapshot] localStorage data corrupted or incompatible. Starting fresh.', err);
    return defaultAppStorage();
  }
}

/**
 * Atomically write AppStorage to localStorage.
 * Throws StorageFullError if quota is exceeded.
 * Warns in console if approaching 80% of the estimated 5MB limit.
 */
export function saveAppData(data: AppStorage): void {
  const serialized = JSON.stringify(data);

  // Rough usage estimate (UTF-16 encoding: 2 bytes/char)
  const estimatedBytes = serialized.length * 2;
  const ESTIMATED_MAX = 5 * 1024 * 1024;
  if (estimatedBytes > ESTIMATED_MAX * STORAGE_WARN_FRACTION) {
    console.warn(
      `[finance-snapshot] localStorage usage is high (~${Math.round(estimatedBytes / 1024)}KB). Consider deleting old imports.`
    );
  }

  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new StorageFullError();
    }
    throw err;
  }
}

/** Debounce state for category override writes. */
let _writeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a debounced save (300ms). Use for high-frequency writes like
 * category overrides — prevents blocking the main thread on every click.
 */
export function scheduleSave(data: AppStorage): void {
  if (_writeTimer) clearTimeout(_writeTimer);
  _writeTimer = setTimeout(() => {
    saveAppData(data);
    _writeTimer = null;
  }, 300);
}

/**
 * Cancel any pending debounced save and write immediately.
 * Use for import/delete operations where immediate persistence is required.
 */
export function saveImmediately(data: AppStorage): void {
  if (_writeTimer) {
    clearTimeout(_writeTimer);
    _writeTimer = null;
  }
  saveAppData(data);
}

/** Thrown when localStorage quota is exceeded during a save. */
export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full. Delete an older import to continue.');
    this.name = 'StorageFullError';
  }
}

// ---------------------------------------------------------------------------
// Type cast helpers (brand coercions at trust boundaries)
// ---------------------------------------------------------------------------

export function asImportId(s: string): ImportId {
  return s as ImportId;
}

export function asTransactionId(s: string): TransactionId {
  return s as TransactionId;
}

export function asISODate(s: string): ISODate {
  return s as ISODate;
}

// Re-export for convenience
export type { ImportedFile, Transaction };
