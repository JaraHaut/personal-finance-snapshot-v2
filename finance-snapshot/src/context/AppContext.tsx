import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
} from 'react';
import { loadAppData, saveImmediately, scheduleSave } from '../lib/storage';
import type { AppStorage, Filters, Transaction, ImportedFile } from '../types';
import type { AppAction, ImportPhase } from './actions';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface AppState extends AppStorage {
  importPhase: ImportPhase;
  isExporting: boolean;
  filters: Filters;
}

const defaultFilters: Filters = {
  selectedMonth: null,
  selectedCategories: [],
  selectedType: 'all',
};

function makeInitialState(): AppState {
  const stored = loadAppData();
  return {
    ...stored,
    importPhase: 'idle',
    isExporting: false,
    filters: defaultFilters,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_IMPORT': {
      const { file, transactions } = action.payload;
      return {
        ...state,
        imports: [...state.imports, file],
        transactions: [...state.transactions, ...transactions],
        importPhase: 'idle',
      };
    }

    case 'DELETE_IMPORT': {
      const { importId } = action.payload;
      return {
        ...state,
        imports: state.imports.filter((i) => i.id !== importId),
        transactions: state.transactions.filter((t) => t.importId !== importId),
      };
    }

    case 'OVERRIDE_CATEGORY': {
      const { transactionId, category } = action.payload;
      return {
        ...state,
        transactions: state.transactions.map((t) => {
          if (t.id !== transactionId) return t;
          // Auto-update type based on category:
          //   Income → income
          //   Transfers → keep the user's import-time choice
          //   everything else → expense
          const type =
            category === 'Income'
              ? 'income'
              : category === 'Transfers'
              ? t.type
              : 'expense';
          return { ...t, category, type, isManualCategory: true };
        }),
      };
    }

    case 'SET_IMPORT_PHASE':
      return { ...state, importPhase: action.payload };

    case 'SET_EXPORTING':
      return { ...state, isExporting: action.payload };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Contexts — split State and Dispatch to avoid unnecessary re-renders.
// Components that only dispatch never re-render on state changes.
// ---------------------------------------------------------------------------

const StateCtx = createContext<AppState | null>(null);
const DispatchCtx = createContext<Dispatch<AppAction> | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  // Persist to localStorage on every state change that affects stored data.
  // Category overrides are debounced (300ms); import/delete write immediately.
  useEffect(() => {
    const storage: AppStorage = {
      schemaVersion: state.schemaVersion,
      imports: state.imports,
      transactions: state.transactions,
    };

    // Heuristic: if import phase changed to idle (just after ADD/DELETE),
    // write immediately. Otherwise debounce (handles category overrides).
    if (state.importPhase === 'idle') {
      saveImmediately(storage);
    } else {
      scheduleSave(storage);
    }
  }, [state.schemaVersion, state.imports, state.transactions, state.importPhase]);

  return (
    <DispatchCtx.Provider value={dispatch}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </DispatchCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAppState(): AppState {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider');
  return ctx;
}

/** Derived selector: transaction count for a specific import. */
export function useImportTransactionCount(importId: string): number {
  const { transactions } = useAppState();
  return transactions.filter((t) => t.importId === importId).length;
}

/** Derived selector: all unique YYYY-MM months across all transactions, sorted. */
export function useAvailableMonths(): string[] {
  const { transactions } = useAppState();
  const months = new Set(transactions.map((t) => t.date.slice(0, 7)));
  return Array.from(months).sort();
}

/** Derived selector: filtered transactions based on current filter state. */
export function useFilteredTransactions(): Transaction[] {
  const { transactions, filters } = useAppState();
  return transactions.filter((t) => {
    if (filters.selectedMonth && !t.date.startsWith(filters.selectedMonth)) return false;
    if (filters.selectedCategories.length > 0 && !filters.selectedCategories.includes(t.category)) return false;
    if (filters.selectedType !== 'all' && t.type !== filters.selectedType) return false;
    return true;
  });
}

/** Derived selector: all imports with their real transaction count. */
export function useImportsWithCount(): Array<ImportedFile & { transactionCount: number }> {
  const { imports, transactions } = useAppState();
  return imports.map((imp) => ({
    ...imp,
    transactionCount: transactions.filter((t) => t.importId === imp.id).length,
  }));
}

// Toast helper (simple event emitter pattern — no external library needed)
export type ToastType = 'success' | 'error' | 'info';

let _toastCallback: ((message: string, type: ToastType) => void) | null = null;

export function registerToastCallback(cb: (message: string, type: ToastType) => void) {
  _toastCallback = cb;
}

export function showToast(message: string, type: ToastType = 'info') {
  if (_toastCallback) {
    _toastCallback(message, type);
  } else {
    console.info(`[Toast ${type}] ${message}`);
  }
}

/** Convenience hook to get a stable dispatch function. */
export function useDispatchCallback<T>(
  actionCreator: (arg: T) => AppAction
): (arg: T) => void {
  const dispatch = useAppDispatch();
  return useCallback((arg: T) => dispatch(actionCreator(arg)), [dispatch, actionCreator]);
}
