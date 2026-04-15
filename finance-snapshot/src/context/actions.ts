import type {
  ImportedFile,
  Transaction,
  TransactionId,
  Category,
  Filters,
} from '../types';

/** Import pipeline phases — prevents concurrent imports and PDF races. */
export type ImportPhase = 'idle' | 'reading' | 'confirming';

/**
 * Discriminated union of all app actions.
 * Each action has a distinct `type` string and typed `payload`.
 */
export type AppAction =
  | {
      type: 'ADD_IMPORT';
      payload: { file: ImportedFile; transactions: Transaction[] };
    }
  | {
      type: 'DELETE_IMPORT';
      payload: { importId: string };
    }
  | {
      type: 'OVERRIDE_CATEGORY';
      payload: { transactionId: TransactionId; category: Category };
    }
  | {
      type: 'SET_IMPORT_PHASE';
      payload: ImportPhase;
    }
  | {
      type: 'SET_EXPORTING';
      payload: boolean;
    }
  | {
      type: 'SET_FILTERS';
      payload: Partial<Filters>;
    };
