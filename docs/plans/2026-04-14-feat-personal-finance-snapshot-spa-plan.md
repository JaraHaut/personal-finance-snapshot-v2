---
title: "feat: Build Personal Finance Snapshot SPA"
type: feat
status: active
date: 2026-04-14
deepened: 2026-04-14
origin: docs/brainstorms/2026-04-14-personal-finance-snapshot-brainstorm.md
---

# feat: Build Personal Finance Snapshot SPA

## Enhancement Summary

**Deepened on:** 2026-04-14
**Agents run:** architecture-strategist, kieran-typescript-reviewer, performance-oracle,
security-sentinel, julik-frontend-races-reviewer, code-simplicity-reviewer,
data-integrity-guardian, design-implementation-reviewer, best-practices-researcher,
framework-docs-researcher (10 total)

### Key Improvements Added

1. **Schema versioning + Zod validation** — `AppStorage.schemaVersion` field + migration
   chain + Zod parse on every load; prevents silent data corruption after model changes
2. **Import state machine** — `IDLE → READING → LABELLING → CONFIRMING` state replaces
   ad-hoc async flow; blocks concurrent imports and coordinates PDF export locking
3. **TanStack Virtual** — Added for table virtualization (required at 500+ rows)
4. **Papa Parse `worker: true`** — Offload CSV parsing to Web Worker for files >1MB
5. **Split State/Dispatch contexts** — Separate `StateCtx` and `DispatchCtx` prevents
   dispatch-only consumers from re-rendering on state changes
6. **Explicit `import-pipeline.ts`** — Named orchestrator for the multi-step import
   pipeline keeps component files thin and import logic testable
7. **localStorage write debounce** — Debounce 300ms on category overrides; immediate
   write only on import/delete to prevent main-thread blocking
8. **Branded TypeScript types** — ISODate, TransactionId, ImportId prevent id confusion
9. **Ref-based PDF target** — Pass `RefObject<HTMLElement>` instead of querying `#pdf-snapshot`
10. **Derive `transactionCount`** — Computed from actual transactions, not stored as metadata

### New Considerations Discovered

- `transactionCount` on `ImportedFile` is a data integrity hazard — derive it instead
- Orphan transactions (missing importId) must be filtered on load
- `ImportSummaryModal` UX is at risk of cognitive overload — consider stepped flow
- File size guard (10MB) must happen before `FileReader` to prevent tab crash
- CSS custom properties not captured by html2canvas — inline critical colors on the snapshot div
- `delimitersToGuess` is the correct Papa Parse API name (confirmed)

## Overview

Build a browser-based personal finance tool from scratch. The user uploads one or
more CSV bank statement files, the app auto-categorizes transactions by description
keyword rules, displays an interactive table and three charts, and exports a monthly
snapshot PDF — all without a backend, using only `localStorage`.

> **Origin:** See brainstorm at `docs/brainstorms/2026-04-14-personal-finance-snapshot-brainstorm.md`
> for rationale behind all major decisions.

---

## Problem Statement / Motivation

Raw bank CSVs are unreadable noise. This tool turns them into actionable insight:
spending by category, income vs. expense trends over time, and a shareable monthly
snapshot — with zero infrastructure and zero sign-in friction.

---

## Tech Stack

| Concern        | Library/Tool             | Notes                                              |
|----------------|--------------------------|----------------------------------------------------|
| Scaffold       | Vite 5 + React 18 + TS 5 | `pnpm create vite` with `react-ts` template        |
| CSV parsing    | Papa Parse 5             | `worker: true` for files >1MB; autodetect delimiter|
| State          | React Context + useReducer | Split StateCtx + DispatchCtx (see Research Insights) |
| Storage        | `localStorage`           | ~5MB limit; Zod validation on read; schema versioning |
| Charts         | Recharts 2               | Bar, Pie/Donut, Line; `isAnimationActive={false}` for perf |
| Table          | TanStack Virtual v3      | Virtualize rows; pairs with TanStack Table v8 for sort/filter |
| Schema validation | Zod (or Valibot)      | Runtime validation of localStorage deserialization |
| PDF export     | jsPDF 2 + html2canvas 1  | Capture DOM snapshot; pass `ref`, not `#id`        |
| IDs            | `crypto.randomUUID()`    | No uuid library needed (built-in browser API)      |
| Package mgr    | pnpm                     | Global preference (see CLAUDE.md)                  |

### Research Insights — Tech Stack

**Split State/Dispatch contexts** prevent unnecessary re-renders. Components that only
dispatch (e.g. `TransactionRow` category override) will not re-render on state changes:

```tsx
const StateCtx = createContext<AppState | null>(null);
const DispatchCtx = createContext<Dispatch<AppAction> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <DispatchCtx.Provider value={dispatch}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </DispatchCtx.Provider>
  );
}
```

**Code splitting** for heavy libraries (Recharts ~200KB, html2canvas ~100KB, jsPDF ~200KB
— ~500KB gzipped total). Use dynamic imports to load them only when needed:

```ts
// pdf-export.ts
const exportPDF = async (el: HTMLElement, filename: string) => {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  // ...
};
```

---

## Data Model

### `src/types/index.ts`

```typescript
// --- Branded primitive types ---
declare const _brand: unique symbol;
type Brand<T, B> = T & { readonly [_brand]: B };
export type ISODate       = Brand<string, 'ISODate'>;       // "YYYY-MM-DD"
export type TransactionId = Brand<string, 'TransactionId'>;
export type ImportId      = Brand<string, 'ImportId'>;
// PositiveNumber enforced by constructor, not type (runtime only)

/** 11 categories: 10 from brainstorm + 'Transfers' for transfer-type rows. */
export type Category =
  | 'Groceries' | 'Dining' | 'Transport' | 'Subscriptions'
  | 'Utilities' | 'Shopping' | 'Health' | 'Travel'
  | 'Income' | 'Transfers' | 'Other';

export type TransactionType = 'income' | 'expense';
/**
 * Transfers (credit card autopay, Venmo, Zelle, Cash App, etc.) are represented
 * as category: 'Transfers' with a user-chosen type of 'income' or 'expense'.
 * The 'transfer' string is NOT a TransactionType — type is always income or expense.
 */

export interface Transaction {
  id: TransactionId;        // crypto.randomUUID() as TransactionId
  importId: ImportId;       // FK → ImportedFile.id
  date: ISODate;            // Normalized to ISO: YYYY-MM-DD
  description: string;
  amount: number;           // Always positive absolute value
  type: TransactionType;    // Derived by categorization rules
  category: Category;       // Derived by categorization rules
  isManualCategory: boolean; // true if user overrode the auto-category
}

export interface SkippedRow {
  rowNumber: number;
  rawLine: string;
  reason: 'missing_date' | 'invalid_date_format' | 'missing_amount'
        | 'non_numeric_amount' | 'empty_row';
}

export interface DuplicateRow {
  existing: Transaction;
  incoming: Omit<Transaction, 'id' | 'importId'>;
  rawLine: string;
}

export interface ImportedFile {
  id: ImportId;
  label: string;            // User-assigned: "January 2026"
  importedAt: ISODate;      // ISO timestamp
  fileName: string;         // Original file name
  // NOTE: Do NOT store transactionCount here — derive it:
  // transactions.filter(t => t.importId === file.id).length
  // Stored counts drift from reality; derived counts are always correct.
  skippedCount: number;
}

/** localStorage key → all imports metadata. Transactions stored separately. */
export interface AppStorage {
  schemaVersion: number;    // Current: 1. Bump on any breaking model change.
  imports: ImportedFile[];
  transactions: Transaction[];
}

// Explicit intermediate type returned by csv-parser before IDs are assigned
export interface ParsedRow {
  date: ISODate;
  description: string;
  amount: number;           // Always positive (abs value)
  type: TransactionType;    // From categorizer
  category: Category;       // From categorizer
}
```

### Research Insights — Data Model

**Discriminated union for reducer actions** (TypeScript reviewer):

```typescript
// src/context/actions.ts
type AppAction =
  | { type: 'ADD_IMPORT'; payload: { file: ImportedFile; transactions: Transaction[] } }
  | { type: 'DELETE_IMPORT'; payload: { importId: ImportId } }
  | { type: 'OVERRIDE_CATEGORY'; payload: { transactionId: TransactionId; category: Category } };
```

**Zod validation for localStorage** (best practices researcher + TypeScript reviewer).
`JSON.parse` returns `any` — the type annotation is a lie without runtime validation.
Use Zod or Valibot (smaller bundle, ~1KB vs ~12KB) to validate on every load:

```typescript
// src/lib/storage.ts
import { z } from 'zod';

const AppStorageSchema = z.object({
  schemaVersion: z.number(),
  imports: z.array(/* ImportedFileSchema */),
  transactions: z.array(/* TransactionSchema */),
});

export function loadAppData(): AppStorage | null {
  try {
    const raw = localStorage.getItem('finance-snapshot');
    if (!raw) return null;
    const parsed = AppStorageSchema.parse(JSON.parse(raw));
    return migrate(parsed); // run schema migrations
  } catch {
    return null; // corrupt or outdated — start fresh
  }
}
```

**Schema migration chain** (data integrity guardian + best practices researcher):

```typescript
const CURRENT_VERSION = 1;

function migrate(data: any): AppStorage {
  let v = data.schemaVersion ?? 0;
  // if (v < 2) data = migrateV1toV2(data);  // add future migrations here
  return { ...data, schemaVersion: CURRENT_VERSION };
}
```

**Orphan detection on load** (data integrity guardian):
Transactions whose `importId` references a deleted import must be filtered on load.
Run this check inside `loadAppData()` after Zod parse + migration:

```typescript
const importIds = new Set(data.imports.map(i => i.id));
data.transactions = data.transactions.filter(t => importIds.has(t.importId));
```

---

## Categorization Rules

### `src/constants/categories.ts`

```typescript
export interface CategoryRule {
  keywords: string[];     // Case-insensitive substring match on description
  category: Category;
  type: TransactionType;
}

/** First matching rule wins. Order matters. */
export const DEFAULT_RULES: CategoryRule[] = [
  // Income — checked first so payroll/deposit never mis-fires as expense
  { keywords: ['DIRECT DEPOSIT', 'PAYROLL', 'PAYROLL CORRECTION', 'SALARY', 'ACH CREDIT'],
    category: 'Income', type: 'income' },
  // Refunds / credits — income type, Other category
  { keywords: ['REFUND', 'CASHBACK', 'INSURANCE REFUND'],
    category: 'Other', type: 'income' },
  // Transfers — category: 'Transfers'; type is UNRESOLVED until user decides in ImportSummaryModal
  // The rule marks category only; type defaults to null and must be resolved before saving.
  { keywords: ['CARD AUTOPAY', 'AUTOPAY', 'CARD PAYMENT'],
    category: 'Transfers', type: 'expense' }, // type placeholder; user will override in modal
  // Groceries
  { keywords: ['WHOLEFDS', 'WHOLE FOODS', 'TRADER JOE', 'SAFEWAY', 'KROGER', 'ALDI', 'COSTCO GROCERY'],
    category: 'Groceries', type: 'expense' },
  // Dining
  { keywords: ['CHIPOTLE', 'SWEETGREEN', 'STARBUCKS', 'BLUE BOTTLE', 'GOTHAM BAGELS',
               'MCDONALD', 'GRUBHUB', 'DOORDASH', 'UBEREATS', 'SEAMLESS'],
    category: 'Dining', type: 'expense' },
  // Transport
  { keywords: ['LYFT', 'UBER* TRIP', 'UBER *TRIP', 'MTA NYCT', 'TRANSIT'],
    category: 'Transport', type: 'expense' },
  // Subscriptions
  { keywords: ['NETFLIX', 'SPOTIFY', 'HULU', 'OPENAI', 'CHATGPT', 'AMAZON PRIME',
               'APPLE.COM/BILL', 'GOOGLE ONE', 'DISNEY+'],
    category: 'Subscriptions', type: 'expense' },
  // Utilities
  { keywords: ['CON EDISON', 'CONEDISON', 'PSEG', 'VERIZON', 'AT&T', 'COMCAST', 'SPECTRUM'],
    category: 'Utilities', type: 'expense' },
  // Shopping
  { keywords: ['AMZN MKTP', 'TARGET', 'WALMART', 'BESTBUY', 'COSTCO', 'ETSY'],
    category: 'Shopping', type: 'expense' },
  // Health
  { keywords: ['CVS', 'DUANE READE', 'WALGREENS', 'RITE AID', 'PHARMACY', 'DOCTOR',
               'DENTIST', 'HOSPITAL', 'URGENT CARE'],
    category: 'Health', type: 'expense' },
  // Travel
  { keywords: ['DELTA', 'UNITED AIRLINES', 'AMERICAN AIR', 'HOTEL', 'MARRIOTT',
               'HILTON', 'AIRBNB', 'BOOKING.COM', 'EXPEDIA'],
    category: 'Travel', type: 'expense' },
  // Peer-to-peer transfers — category: 'Transfers'; user sets income/expense in modal
  { keywords: ['VENMO', 'ZELLE', 'CASH APP', 'CASHAPP'],
    category: 'Transfers', type: 'expense' }, // type placeholder; user will override in modal
];

export const CATEGORIES: Category[] = [
  'Groceries', 'Dining', 'Transport', 'Subscriptions',
  'Utilities', 'Shopping', 'Health', 'Travel', 'Income', 'Transfers', 'Other',
];
```

---

## File Structure

```
finance-snapshot/
├── index.html
├── package.json               # pnpm; react, recharts, papaparse, jspdf, html2canvas, zod, @tanstack/react-virtual
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx                # Router: Dashboard | Transactions
    ├── types/
    │   └── index.ts           # All shared types (above)
    ├── constants/
    │   └── categories.ts      # DEFAULT_RULES + CATEGORIES list
    ├── lib/
    │   ├── csv-parser.ts      # Papa Parse wrapper + validation + normalization
    │   ├── categorizer.ts     # apply DEFAULT_RULES to a raw row
    │   ├── import-pipeline.ts # NEW: orchestrates parse → categorize → dedup → save
    │   ├── storage.ts         # localStorage read/write; Zod validation; migration
    │   └── pdf-export.ts      # html2canvas + jsPDF (dynamically imported)
    ├── context/
    │   ├── AppContext.tsx     # AppProvider (splits StateCtx + DispatchCtx)
    │   └── actions.ts         # AppAction discriminated union
    ├── hooks/
    │   └── useFilters.ts      # selectedMonth, selectedCategory, selectedType (shared in context)
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx     # Nav: Dashboard | Transactions
    │   │   └── Layout.tsx     # Page wrapper with collapsible sidebar
    │   ├── import/
    │   │   ├── ImportZone.tsx         # Drag-drop + click; enforces import state machine
    │   │   ├── LabelModal.tsx         # Ask user for import label (shown AFTER summary)
    │   │   ├── ImportSummaryModal.tsx # Stepped: skips → duplicates → transfers → label
    │   │   └── ImportsList.tsx        # List saved imports with delete button
    │   ├── table/
    │   │   ├── TransactionTable.tsx   # Virtualized with TanStack Virtual
    │   │   ├── TransactionRow.tsx     # Row with inline category dropdown
    │   │   └── TableFilters.tsx       # Month / Category / Type filters
    │   ├── charts/
    │   │   ├── MonthlyTotalsChart.tsx  # Bar: income vs expenses per month
    │   │   ├── CategoryPieChart.tsx    # Donut: expense share by category
    │   │   └── CategoryTrendChart.tsx  # Line: category spending over months
    │   └── export/
    │       └── ExportButton.tsx       # Passes snapshotRef down; disabled during import
    └── pages/
        ├── Dashboard.tsx   # 3 charts + summary cards; holds snapshotRef
        └── Transactions.tsx # Virtualized table + filters
```

### Research Insights — File Structure

**`import-pipeline.ts` is critical** (architecture strategist). Without it, the multi-step
import flow (parse → categorize → detect transfers → detect duplicates → resolve → save) ends
up in `ImportZone.tsx`, making it a 200-line component that is impossible to test in isolation.
`import-pipeline.ts` owns this orchestration; components just call it and handle UI state.

**`useFilters` must live in context, not per-component** (architecture strategist). If
`Dashboard.tsx` and `Transactions.tsx` each have their own `useFilters`, the month filter
will desync when navigating between pages. Move filter state into `AppContext` or a
dedicated `FiltersContext` so all consumers see the same selected month.

**`snapshotRef` threading** (architecture strategist). `pdf-export.ts` cannot query by
`#pdf-snapshot` id — that creates invisible coupling between lib and DOM. Instead:
- `Dashboard.tsx` creates `const snapshotRef = useRef<HTMLDivElement>(null)`
- Wraps the snapshot section: `<div ref={snapshotRef}>...charts...</div>`
- Passes `snapshotRef` to `<ExportButton snapshotRef={snapshotRef} />`
- `ExportButton` passes the ref's `current` element to `exportToPDF(el, month)`

---

## Implementation Phases

### Phase 1 — Foundation

**Goal:** Running Vite app with types, storage layer, and CSV parser.

**Tasks:**
- [x] `pnpm create vite finance-snapshot --template react-ts`
- [x] Install deps: `pnpm add recharts papaparse jspdf html2canvas` + `@types/papaparse`
- [x] Define `src/types/index.ts` with all types above
- [x] Implement `src/lib/storage.ts`:
  - `loadAppData(): AppStorage` — reads and parses from localStorage
  - `saveAppData(data: AppStorage): void` — writes; throws `StorageFullError` if quota exceeded (catch `DOMException: QuotaExceededError`)
  - Guard: warn in console if approaching 80% of estimated 5MB
- [x] Implement `src/lib/csv-parser.ts`:
  - Use Papa Parse with `header: true, skipEmptyLines: true, dynamicTyping: false`
  - Enable `delimitersToGuess` for auto-delimiter detection
  - Normalize dates: try `MM/DD/YYYY`, `YYYY-MM-DD`, `M/D/YYYY` — flag unrecognized formats as `invalid_date_format`
  - Strip currency symbols (`$`, `,`) before `parseFloat`
  - Skip rows where: date is empty → `missing_date`; date unrecognized → `invalid_date_format`; amount is empty → `missing_amount`; amount is non-numeric after stripping → `non_numeric_amount`
  - Empty description: valid — set `description = ''` and note in summary; categorizer falls through to "Other" expense
  - Detect exact duplicates: same `date + description + amount` (compare against existing transactions in storage)
  - Return: `{ valid: ParsedRow[], skipped: SkippedRow[], duplicates: DuplicateRow[] }`

**Acceptance criteria:**
- [x] Parser handles all data quality issues in `assets/sample-transactions.csv`
- [x] All 6 bad rows (row 13 empty desc, row 45 text amount, row 54 missing date, rows 14-15 and 31-32 duplicates) are detected

### Research Insights — Phase 1

**Papa Parse worker mode** (performance oracle + framework docs researcher).
At 5MB+ files the synchronous parse freezes the UI for 1-3 seconds. Use `worker: true`:

```typescript
import Papa, { ParseResult } from 'papaparse';

Papa.parse<RawCSVRow>(file, {
  header: true,
  skipEmptyLines: true,
  worker: true,               // offloads to inline Web Worker blob — no extra config needed
  delimitersToGuess: [',', '\t', ';', '|'],
  complete: (results: ParseResult<RawCSVRow>) => {
    processResults(results);
  },
  error: (err) => handleParseError(err),
});
```

**File size guard before FileReader** (security sentinel — medium risk):
```typescript
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE_BYTES) {
  showToast('File too large. Maximum size is 10MB.', 'error');
  return;
}
```

**Zod schema + migration in `storage.ts`** (data integrity guardian + best practices):
```typescript
const CURRENT_SCHEMA_VERSION = 1;

export function loadAppData(): AppStorage {
  try {
    const raw = localStorage.getItem('finance-snapshot');
    if (!raw) return defaultAppStorage();
    const parsed = AppStorageSchema.parse(JSON.parse(raw));
    const migrated = migrate(parsed);
    // Orphan detection: remove transactions whose importId has no matching import
    const importIds = new Set(migrated.imports.map(i => i.id));
    migrated.transactions = migrated.transactions.filter(t => importIds.has(t.importId));
    return migrated;
  } catch {
    console.warn('localStorage data corrupted or incompatible. Starting fresh.');
    return defaultAppStorage();
  }
}

function migrate(data: any): AppStorage {
  const v = data.schemaVersion ?? 0;
  // Future: if (v < 2) data = migrateV1toV2(data);
  return { ...data, schemaVersion: CURRENT_SCHEMA_VERSION };
}
```

**CSV injection sanitization** (security sentinel — low risk, downstream safety):
```typescript
// Strip leading formula-trigger characters from description before storing
function sanitizeDescription(raw: string): string {
  return raw.replace(/^[=+\-@\t\r]+/, '').trim();
}
```

---

### Phase 2 — Import Pipeline & State

**Goal:** Full import flow from file drop to localStorage.

**Tasks:**
- [x] Implement `src/constants/categories.ts` with DEFAULT_RULES (above)
- [x] Implement `src/lib/categorizer.ts`:
  - `categorize(description: string): { category: Category; type: TransactionType }`
  - Case-insensitive substring match; first rule wins; fallback: `{ category: 'Other', type: 'expense' }`
  - Amount sign is **ignored** — type comes from rule only
- [x] Implement `src/context/AppContext.tsx`:
  - State: `{ imports: ImportedFile[], transactions: Transaction[] }`
  - Actions: `ADD_IMPORT`, `DELETE_IMPORT`, `OVERRIDE_CATEGORY`
  - Init: `loadAppData()` on mount; persist to localStorage on every dispatch
- [x] Build `ImportZone.tsx`: drag-drop + file picker; calls Papa Parse on drop/select
- [x] Build `LabelModal.tsx`: shown after parse; user types label; validate uniqueness (warn if label already exists, allow suffix)
- [x] Build `ImportSummaryModal.tsx`:
  - Shows: X transactions imported, Y skipped (with reason list), Z duplicates found, W transfers detected
  - **Transfers section:** For each row with `category: 'Transfers'`, show description + amount and a 2-button inline selector: `Income` / `Expense`. No default pre-selection — user must actively choose. "Save Import" button disabled until all transfer rows have a type assigned.
  - Transfers saved with `category: 'Transfers'` and the user's chosen `type: 'income' | 'expense'`
  - For each duplicate: show existing vs. incoming row; buttons "Keep existing" / "Add anyway"
  - Duplicate resolution is per-row (not bulk)
- [x] Build `ImportsList.tsx`: list imports with label, file name, date, transaction count; delete button with confirmation dialog (warns that transactions will be lost)
- [x] `DELETE_IMPORT` action: remove import + all its transactions from state

**Acceptance criteria:**
- [x] Full import flow works end-to-end with sample CSV
- [x] Label modal blocks submission if label is blank
- [x] Deleting an import removes its transactions from all views

### Research Insights — Phase 2

**Import state machine is critical** (julik-frontend-races-reviewer). Without it, two
simultaneous drop events open overlapping modal stacks fighting over the same context
dispatch. A symbol-based state machine prevents all import races:

```typescript
// src/context/AppContext.tsx — add import state to AppState
type ImportPhase = 'idle' | 'reading' | 'labelling' | 'confirming';

interface AppState {
  imports: ImportedFile[];
  transactions: Transaction[];
  selectedMonth: string | null;
  importPhase: ImportPhase;
  isExporting: boolean;       // blocks DELETE_IMPORT + new imports during PDF export
}

// ImportZone.tsx
const { importPhase } = useAppState();
const handleDrop = (e: DragEvent) => {
  if (importPhase !== 'idle') return; // block concurrent imports
  dispatch({ type: 'SET_IMPORT_PHASE', payload: 'reading' });
  // ... proceed
};
```

**`import-pipeline.ts`** orchestrates the full flow (architecture strategist).
Move all multi-step logic OUT of components:

```typescript
// src/lib/import-pipeline.ts
export interface ImportPipelineResult {
  valid: ParsedRow[];
  skipped: SkippedRow[];
  duplicates: DuplicateRow[];
  transfers: ParsedRow[];    // rows auto-detected as transfer type
}

export async function runImportPipeline(
  file: File,
  existingTransactions: Transaction[],
): Promise<ImportPipelineResult> {
  const rows = await parseCSV(file);
  const categorized = rows.valid.map(r => ({ ...r, ...categorize(r.description) }));
  const transfers = categorized.filter(r => r.category === 'Transfers');
  const nonTransfers = categorized.filter(r => r.category !== 'Transfers');
  const duplicates = detectDuplicates(nonTransfers, existingTransactions);
  return { valid: nonTransfers, skipped: rows.skipped, duplicates, transfers };
}
```

**localStorage write debounce** (performance oracle). Every `OVERRIDE_CATEGORY` dispatch
doing a full JSON serialize + write blocks the main thread at 2000+ transactions (~40ms).
Debounce category override writes; write immediately only for import/delete:

```typescript
// src/lib/storage.ts
let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave(data: AppStorage): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => saveAppData(data), 300);
}

export function saveImmediately(data: AppStorage): void {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  saveAppData(data);
}
```

**UX: Label modal AFTER summary** (design reviewer). Users cannot meaningfully name an
import before seeing what it contains. Restructure the import modal flow:
1. `ImportSummaryModal` opens first (shows skips + transfers + duplicates)
2. On the final step, user types the label and clicks "Save Import"
3. `LabelModal` becomes the last step of `ImportSummaryModal`, not a separate modal

**UX: Stepped modal for ImportSummaryModal** (design reviewer). Three decision types
(skips, transfers, duplicates) in one modal causes cognitive overload. Consider a
3-step progress indicator: Step 1 (Review skipped rows) → Step 2 (Classify transfers)
→ Step 3 (Resolve duplicates + name import). Only show a step if it has items.

---

### Phase 3 — Transaction Table

**Goal:** Filterable table with inline category editing.

**Tasks:**
- [x] Build `TableFilters.tsx`:
  - Month picker: derived from all transaction dates; format `YYYY-MM` → display "January 2026"
  - Category multi-select dropdown
  - Type toggle: All / Income / Expenses (Transfers visible in both since they have income/expense type; filter by category 'Transfers' separately)
- [x] Build `TransactionTable.tsx`:
  - Columns: Date | Description | Amount | Type | Category | Source (import label)
  - Default sort: date descending
  - Applies active filters from `useFilters` hook
  - Empty state: "No transactions match your filters"
- [x] Build `TransactionRow.tsx`:
  - Category cell: shows category badge; click opens inline dropdown of all 10 categories
  - On change: dispatches `OVERRIDE_CATEGORY`; sets `isManualCategory: true`; persists immediately
  - Visual indicator (e.g., pencil icon) on manually overridden rows
- [x] `useFilters.ts` hook: manages selectedMonth (null = all), selectedCategories, selectedType

**Acceptance criteria:**
- [x] Filtering by month shows only transactions from that month (across all imports)
- [x] Manual category override persists after page reload
- [x] Table is usable with 500+ rows (no visible lag)

### Research Insights — Phase 3

**TanStack Virtual v3 for table virtualization** (performance oracle + best practices):

```tsx
// src/components/table/TransactionTable.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function TransactionTable({ rows }: { rows: Transaction[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,   // row height px
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vRow => (
          <div
            key={vRow.key}
            style={{ position: 'absolute', top: vRow.start, width: '100%', height: vRow.size }}
          >
            <TransactionRow row={rows[vRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

At 500 rows this renders ~15 DOM nodes at any time. Without this, 500 rows = 500 DOM
nodes = 200-400ms paint times and sluggish scroll.

**Filter state belongs in context** (architecture strategist). `useFilters` must be a
context-level hook, not per-component state. The month selector on Dashboard must drive
the same filter that TableFilters reads. Simplest approach: add `filters` to `AppState`
alongside `imports` and `transactions`.

**Drag event cleanup** (julik-frontend-races-reviewer):
```tsx
// ImportZone.tsx — useEffect must return cleanup
useEffect(() => {
  const el = dropZoneRef.current;
  if (!el) return;
  el.addEventListener('dragover', handleDragOver);
  el.addEventListener('drop', handleDrop);
  return () => {                          // ← critical: prevents memory leaks on remount
    el.removeEventListener('dragover', handleDragOver);
    el.removeEventListener('drop', handleDrop);
  };
}, []);
```

**Export/import locking** (julik-frontend-races-reviewer). Charts may be mid-transition
when `html2canvas` captures the DOM — the PDF will show a partially-animated state.
Disable export during import; disable import during export; suppress chart animations
(`isAnimationActive={false}`) whenever `isExporting` is true in context.

---

### Phase 4 — Visualizations

**Goal:** Three charts on the Dashboard page.

**Tasks:**
- [x] Build `MonthlyTotalsChart.tsx`:
  - Recharts `BarChart` with two grouped bars per month: Income (green) and Expenses (red)
  - X axis: months sorted chronologically; Y axis: dollar amounts
  - Tooltip shows exact amounts
  - Data derived from all transactions regardless of active month filter (it IS the month explorer)
- [x] Build `CategoryPieChart.tsx`:
  - Recharts `PieChart` (donut style) for expense transactions in selected month (or all time if no month selected)
  - Excludes `Income` and `Transfers` categories (transfers don't represent pure spending — user may toggle Transfers visibility)
  - Legend with category names + dollar amounts
  - Empty state: "No expense data for this period"
- [x] Build `CategoryTrendChart.tsx`:
  - Recharts `LineChart` with one line per category (excludes 'Income' and 'Transfers' categories by default) over time
  - X axis: months; Y axis: total spend; one line per active category
  - Togglable categories via legend click
  - Shows all months, not filtered
- [x] Build `Dashboard.tsx`:
  - Summary cards: Total Income | Total Expenses | Net (this month or all time)
  - Arrange: MonthlyTotalsChart (full width), CategoryPieChart + summary cards (row), CategoryTrendChart (full width)
  - Month selector at top of page (shared with table filters via context)

**Acceptance criteria:**
- [x] Charts update immediately when month filter changes
- [x] Charts handle months with zero data (show $0 bar, skip line points)
- [x] Charts are readable without horizontal scrolling on 1280px viewport

### Research Insights — Phase 4

**Isolate useMemo per chart** (performance oracle). A single filter change currently
invalidates all three chart memos simultaneously, triggering three sequential expensive
computations + Recharts re-renders in the same frame. Each chart must have its own
independently-keyed selector:

```typescript
// Bad: one memo for all charts
const allChartData = useMemo(() => deriveAll(transactions, selectedMonth), [transactions, selectedMonth]);

// Good: isolated selectors
const monthlyTotals = useMemo(
  () => deriveMonthlyTotals(transactions),   // NOT filtered by month — it IS the month explorer
  [transactions]
);
const categorySlices = useMemo(
  () => deriveCategorySlices(transactions, selectedMonth),
  [transactions, selectedMonth]
);
const trendLines = useMemo(
  () => deriveTrendLines(transactions),      // shows all months, not filtered
  [transactions]
);
```

**Disable animations during export** (julik-frontend-races-reviewer):
```tsx
const { isExporting } = useAppState();
<Bar dataKey="income" isAnimationActive={!isExporting} />
<Line dataKey="amount" isAnimationActive={!isExporting} dot={!isExporting} />
```

**PieChart donut** — `innerRadius` goes on `<Pie>`, NOT on `<PieChart>` (framework docs):
```tsx
<PieChart>
  <Pie
    data={slices}
    dataKey="value"
    innerRadius="55%"    // ← here, NOT on PieChart
    outerRadius="80%"
  />
  <Tooltip />
  <Legend />
</PieChart>
```

**Wrap charts in React.memo** (best practices) to prevent parent re-renders from
re-drawing unchanged charts. Pass only the derived data slice, not the full transaction array.

**Month filter scope clarification** (design reviewer). Define explicitly:
- `selectedMonth` affects: `CategoryPieChart` (shows only that month's expenses) and the summary cards
- `selectedMonth` does NOT affect: `MonthlyTotalsChart` (shows all months — it IS the month selector) and `CategoryTrendChart` (shows all months by design)

**Legend empty state for CategoryTrendChart** (design reviewer). When the user
deselects all legend items, render: "Select a category above to see its trend."

---

### Phase 5 — PDF Export & Polish

**Goal:** PDF export and final UI polish.

**Tasks:**
- [x] Implement `src/lib/pdf-export.ts`:
  - `exportMonthlySnapshot(month: string | null): Promise<void>`
  - Target a `<div id="pdf-snapshot">` wrapper that contains: month title, summary cards, CategoryPieChart, top-10 expense table
  - Use `html2canvas` to render to canvas; embed in jsPDF A4 page
  - Filename: `finance-snapshot-${month ?? 'all'}.pdf`
  - Handle empty state: include "No transactions for this period" text
- [x] Build `ExportButton.tsx`: "Export PDF" button; shows loading spinner during export; disabled if no transactions
- [x] Handle `StorageFullError` in ImportZone: show user-facing error toast "Import failed: browser storage is full. Delete an older import to continue."
- [x] Add empty states throughout: no imports yet → welcome screen with upload CTA
- [x] Error boundaries for chart failures
- [x] Final responsive layout check (desktop 1280px, tablet 768px)

**Acceptance criteria:**
- [x] PDF renders cleanly with correct month label and data
- [x] PDF filename includes the month slug
- [x] Export button is disabled when no transactions exist
- [x] App shows a clear CTA when no data has been imported

### Research Insights — Phase 5

**html2canvas pitfalls** (best practices researcher + framework docs researcher):

```typescript
// src/lib/pdf-export.ts — dynamically imported for code splitting
export async function exportMonthlySnapshot(
  el: HTMLElement,
  month: string | null,
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] =
    await Promise.all([import('html2canvas'), import('jspdf')]);

  // 1. Ensure web fonts are loaded before capture
  await document.fonts.ready;

  // 2. Force light theme on capture (avoids dark-mode PDF)
  const prevColorScheme = el.style.colorScheme;
  el.style.colorScheme = 'light';

  const canvas = await html2canvas(el, {
    scale: 2,           // 2x for sharpness on retina
    useCORS: true,      // required if any chart images are cross-origin
    logging: false,
    backgroundColor: '#ffffff',
  });

  el.style.colorScheme = prevColorScheme; // restore

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth(); // 210mm
  const imgH = (canvas.height * pageW) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
  pdf.save(`finance-snapshot-${month ?? 'all'}.pdf`);
}
```

**Known html2canvas issues to design around** (framework docs researcher):

| Issue | Mitigation |
|-------|-----------|
| CSS custom properties (`--color-*`) not resolved | Set `backgroundColor` explicitly on snapshot div; avoid relying on CSS vars for colors in the snapshot section |
| Web fonts not rendered | Use system font stack (`font-family: system-ui, sans-serif`) in snapshot section; or call `document.fonts.ready` |
| Output is rasterized — no selectable text | Acceptable for this use case |
| Multi-page content cut | Limit snapshot content to summary cards + pie chart — not the full transaction table |

**PDF performance** (performance oracle). Capturing a div with 500+ visible table rows
takes 3-8 seconds and blocks the main thread. Solution: the `#pdf-snapshot` div should
contain only the **summary view** (cards + pie chart + top-10 table), NOT the full
transaction table. During export, set `isExporting: true` in context — this can also
trigger a compact "print layout" in the snapshot div.

**Global toast system** (design reviewer). Define a toast context and `useToast()` hook
**in Phase 1** before building individual components. Every Phase 2-5 component that
shows errors (StorageFullError, import errors, export errors, save confirmations) should
use `showToast()` from this hook — not inline alert/div state.

**JSON export/recovery button** (data integrity guardian). A simple "Download data as
JSON" button in the sidebar provides a recovery path if localStorage is cleared. This is
a 5-line feature that prevents total data loss for real users:
```typescript
const blob = new Blob([JSON.stringify(appData)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// trigger download...
```

---

## Edge Cases & SpecFlow Resolutions

These gaps were identified by SpecFlow analysis and are now resolved:

| Gap | Resolution |
|-----|-----------|
| Unknown date format | Flag as `invalid_date_format` skipped row |
| Empty description | Import row; categorizer assigns "Other" expense; shown in summary |
| Same label re-import | Warn user; allow with auto-suffix (e.g. "January 2026 (2)") |
| Non-standard delimiter | Papa Parse `delimitersToGuess` handles tabs, semicolons |
| Negative amounts | Sign is ignored; type comes from description rules only |
| Refund/credit classification | "REFUND", "CASHBACK" → `Other, income` type |
| Credit card autopay | "CARD AUTOPAY" → `category: 'Transfers'`; user chooses income/expense in ImportSummaryModal |
| Manual override after re-import | Overrides are lost — acceptable; user re-imports = fresh data |
| Keyword case sensitivity | Case-insensitive substring match |
| Rule conflicts | First matching rule wins; income rules listed first in DEFAULT_RULES |
| Duplicate decision UX | Per-row in ImportSummaryModal: "Keep existing" / "Add anyway" |
| Same file, different label | Duplicates flagged per-row in summary |
| localStorage full | `QuotaExceededError` caught; abort import; show error toast |
| PDF date range | Covers currently selected month filter (or "all" if none selected) |
| PDF empty state | Renders "No transactions for this period" message in PDF |
| No data recovery | Out of scope (YAGNI) |

---

## Acceptance Criteria

### Functional

- [x] Upload a CSV via drag-drop or file picker
- [x] CSV is parsed; bad rows skipped with specific reasons shown in summary modal
- [x] Duplicate rows (same date+description+amount) flagged per-row; user decides
- [x] Each import stored with user-assigned label; multiple imports coexist
- [x] All transactions auto-categorized using DEFAULT_RULES on import
- [x] Income vs. expense classification is description-rule-based (not amount sign)
- [x] Transfers (credit card autopay, Venmo, Zelle, Cash App) detected on import (category = 'Transfers') and shown in ImportSummaryModal; user must choose Income or Expense before saving
- [x] 'Transfers' category excluded from spending charts (pie + trend) by default
- [x] User can override a transaction's category inline (including changing from/to 'Transfers'); change persists after reload
- [x] Transaction table filterable by month, category (including 'Transfers'), and type
- [x] Table sorted by date descending by default
- [x] Monthly totals bar chart shows income vs. expenses per month across all data
- [x] Category donut chart reflects selected month filter (or all time)
- [x] Category trend line chart shows month-over-month spend per category
- [x] "Export PDF" produces a named PDF of the selected month's snapshot
- [x] Deleting an import removes it and all its transactions from all views
- [x] StorageFullError surfaced as user-facing toast; import aborted

### Non-Functional

- [x] All data in `localStorage`; zero network requests for data operations
- [x] Works in Chrome, Firefox, Safari (latest)
- [x] Usable on 768px+ viewport width
- [x] Table handles 500+ rows without visible lag (TanStack Virtual)
- [x] TypeScript strict mode; no `any` types in business logic
- [x] localStorage data validated with Zod on every load (no silent corruption)
- [x] `schemaVersion` present in stored data; migration chain runs on load
- [x] CSV files > 10MB rejected before FileReader with user-facing message
- [x] Import state machine prevents concurrent import operations
- [x] PDF export disabled while import is in progress (and vice versa)
- [x] A JSON data export/recovery button exists in the sidebar

---

## System-Wide Impact

### State Lifecycle Risks

- **Partial import write:** If `saveAppData` throws `QuotaExceededError` mid-import,
  the write is aborted atomically (all-or-nothing: only write after all transactions
  are built in memory). Never write partial state.
- **Category override:** `OVERRIDE_CATEGORY` dispatches update + immediate `saveAppData`.
  If save fails (quota), dispatch is rolled back via error boundary and user is
  shown a toast.

### Interaction Graph

1. User drops CSV → `ImportZone` calls `csv-parser.ts`
2. Parser → `categorizer.ts` for each valid row → returns `Transaction[]`
3. `LabelModal` collects label
4. `ImportSummaryModal` resolves duplicates → final `Transaction[]` confirmed
5. `ADD_IMPORT` dispatched → `AppContext` reducer appends to state →
   `saveAppData()` writes to localStorage
6. All charts + table recompute derived data via `useMemo` from context state

### Integration Test Scenarios

1. Import `sample-transactions.csv` → verify 46 valid rows, 6 skipped/flagged, 2 duplicate pairs detected, transfers shown in modal
2. Import two CSVs → bar chart shows data from both; deleting one removes its bars
3. Override transaction category → reload page → override persists; isManualCategory shows pencil icon
4. Attempt import when localStorage is ~100% full → QuotaExceededError toast shown, data unchanged, storageVersion intact
5. Export PDF for "January 2026" filter → file downloads with correct name and data; was disabled during import
6. Drop two CSV files simultaneously → second drop ignored (importPhase !== 'idle'); no overlapping modals
7. Load app with manually corrupted localStorage → Zod parse fails → app starts fresh with empty state + console warning
8. Load app after schema version bump → migration runs → data shape updated correctly

---

## Dependencies & Prerequisites

- Node.js 20+ and pnpm installed
- No backend, database, or CI pipeline needed
- Browser APIs: `localStorage`, `File API`, `Blob`, `URL.createObjectURL`, `crypto.randomUUID`

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-04-14-personal-finance-snapshot-brainstorm.md](../brainstorms/2026-04-14-personal-finance-snapshot-brainstorm.md)
  Key decisions carried forward: Vite+React+TS SPA, localStorage-only, rule-based
  income/expense classification (not sign-based), multi-file named imports.

### Sample Data

- `assets/sample-transactions.csv` — 54 rows with intentional data quality issues
  for testing the parser

### External References

- [Papa Parse docs](https://www.papaparse.com/docs) — CSV parsing; `worker: true` for large files
- [Recharts docs](https://recharts.org/en-US/api) — note: `innerRadius` on `<Pie>`, not `<PieChart>`
- [jsPDF docs](https://rawgit.com/MrRio/jsPDF/master/docs/) — PDF generation
- [html2canvas docs](https://html2canvas.hertzen.com/configuration) — DOM-to-canvas; CSS vars not resolved
- [TanStack Virtual v3](https://tanstack.com/virtual/latest) — row virtualization for 500+ rows
- [Zod docs](https://zod.dev) — runtime schema validation for localStorage deserialization
- [Valibot](https://valibot.dev) — alternative to Zod; ~1KB vs ~12KB gzipped
- [React: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) — split StateCtx + DispatchCtx pattern
