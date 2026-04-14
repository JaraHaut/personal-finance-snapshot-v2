import { parseCSV, validateFileSize } from './csv-parser';
import { asImportId, asTransactionId } from './storage';
import type {
  ParsedRow,
  SkippedRow,
  DuplicateRow,
  Transaction,
  TransferRow,
  ImportedFile,
  ImportId,
} from '../types';

export interface ImportPipelineResult {
  /** Valid, non-transfer, non-duplicate rows, ready for review. */
  valid: ParsedRow[];
  /** Rows that failed parsing. */
  skipped: SkippedRow[];
  /** Exact duplicate rows (same date+description+amount vs existing). */
  duplicates: DuplicateRow[];
  /** Transfer-detected rows requiring user income/expense classification. */
  transfers: TransferRow[];
}

/**
 * Run the full import pipeline for a CSV file.
 * - Validates file size
 * - Parses with Papa Parse
 * - Auto-categorizes each row
 * - Splits transfers into a separate list for user classification
 * - Detects exact duplicates against existing transactions
 */
export async function runImportPipeline(
  file: File,
  existingTransactions: Transaction[]
): Promise<ImportPipelineResult> {
  validateFileSize(file);

  const { valid: allValid, skipped, duplicates } = await parseCSV(file, existingTransactions);

  // Separate transfers (require user to choose income/expense) from regular rows
  const transfers: TransferRow[] = allValid
    .filter((r) => r.category === 'Transfers')
    .map((r) => ({ row: r, chosenType: null }));

  const valid: ParsedRow[] = allValid.filter((r) => r.category !== 'Transfers');

  return { valid, skipped, duplicates, transfers };
}

export interface FinalizeImportParams {
  fileName: string;
  label: string;
  validRows: ParsedRow[];
  resolvedTransfers: TransferRow[];   // only those with chosenType !== null
  acceptedDuplicates: ParsedRow[];    // duplicates user chose to keep
  skippedCount: number;
}

/**
 * Finalize an import after the user has reviewed the summary modal.
 * Converts ParsedRows + resolved transfers + accepted duplicates into
 * Transaction[] and an ImportedFile record.
 */
export function finalizeImport(params: FinalizeImportParams): { file: ImportedFile; transactions: Transaction[] } {
  const importId: ImportId = asImportId(crypto.randomUUID());
  const importedAt = new Date().toISOString();

  const allRows: ParsedRow[] = [
    ...params.validRows,
    ...params.resolvedTransfers
      .filter((t) => t.chosenType !== null)
      .map((t) => ({ ...t.row, type: t.chosenType! })),
    ...params.acceptedDuplicates,
  ];

  const transactions: Transaction[] = allRows.map((row) => ({
    id: asTransactionId(crypto.randomUUID()),
    importId,
    date: row.date,
    description: row.description,
    amount: row.amount,
    type: row.type,
    category: row.category,
    isManualCategory: false,
  }));

  const file: ImportedFile = {
    id: importId,
    label: params.label,
    importedAt,
    fileName: params.fileName,
    skippedCount: params.skippedCount,
  };

  return { file, transactions };
}
