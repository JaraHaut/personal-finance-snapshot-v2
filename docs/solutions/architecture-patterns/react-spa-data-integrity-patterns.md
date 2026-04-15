---
title: "React SPA Data Integrity Patterns — Persistence, Schema Migration, Float Money, Singleton Cleanup"
category: architecture-patterns
tags: [react, typescript, localStorage, zod, migration, float-equality, dead-code, useEffect, useRef, financial-calculations, data-flow, singleton]
module: personal-finance-spa
symptom: "Silent data loss on schema migration; synchronous localStorage write on every user interaction; duplicate transactions not detected due to float precision; toast messages silently dropped after component unmount; chart filters ignored for some charts"
root_cause: "Multiple foundational React/TypeScript patterns applied incorrectly: Zod validation ran before migration pipeline, save heuristic checked state flags instead of data references, raw float comparison used for money equality, module-level singleton had no deregistration path, data pipeline discarded existing-record metadata"
date: 2026-04-15
---

# React SPA Data Integrity Patterns

Patterns discovered and fixed during a full build cycle on a personal finance SPA (React 18 + TypeScript + Vite + Zod). All 5 patterns are foundational and recur across React/TypeScript projects beyond this specific app.

---

## Solutions

### 1. Ref-based change detection for selective persistence

Use a `useRef` snapshot to distinguish structural mutations (new array reference) from in-place mutations (same reference) in a `useEffect`.

**Wrong pattern** — fires `saveImmediately` on every idle state change, including category overrides and filter changes:
```ts
useEffect(() => {
  if (state.importPhase === 'idle') {
    saveImmediately(storage); // fires on EVERY interaction when idle
  } else {
    scheduleSave(storage);
  }
}, [state.schemaVersion, state.imports, state.transactions, state.importPhase]);
```

**Correct pattern** — uses reference equality to detect structural changes:
```ts
const prevImportsRef = useRef(state.imports);

useEffect(() => {
  const storage: AppStorage = {
    schemaVersion: state.schemaVersion,
    imports: state.imports,
    transactions: state.transactions,
  };
  const importsChanged = state.imports !== prevImportsRef.current;
  prevImportsRef.current = state.imports;

  if (importsChanged) {
    saveImmediately(storage); // only on ADD/DELETE — reference changes
  } else {
    scheduleSave(storage);    // debounce for overrides, filters, etc.
  }
}, [state.schemaVersion, state.imports, state.transactions]);
```

**Why this matters.** React reducers that handle ADD/DELETE return a new array reference; reducers that mutate an existing item (OVERRIDE_CATEGORY) return the same reference. Reference equality is therefore a cheap, zero-cost proxy for "did the list structure change?" without diffing contents. Inverting this heuristic — or using a boolean status flag instead — causes every keystroke to trigger an expensive immediate write.

---

### 2. Migrate before validating with Zod — never after

Parse the raw JSON, run all migrations, then validate the result against the current schema.

**Wrong order** — data from old schema versions gets discarded before migration can fix it:
```ts
const parsed = AppStorageSchema.parse(JSON.parse(raw)); // throws on old schema
const migrated = migrate(parsed);                        // never reached
```

**Correct order:**
```ts
const rawParsed = JSON.parse(raw);
if (typeof rawParsed !== 'object' || rawParsed === null) return defaultData();

const migrated = migrate(rawParsed);          // transform first

const result = AppStorageSchema.safeParse(migrated); // then validate
if (!result.success) {
  console.warn('Storage invalid after migration.', result.error);
  return defaultData();
}
// Orphan cleanup without mutating the validated object:
const importIds = new Set(result.data.imports.map((i) => i.id));
return {
  ...result.data,
  transactions: result.data.transactions.filter((t) => importIds.has(t.importId)),
};
```

**Why this matters.** Migrations exist specifically to handle schema differences. If you validate before migrating, old data that the migration would have fixed gets silently replaced with defaults, destroying user data. The invariant: validate only data you have already brought up to the current schema version.

---

### 3. Normalize floating-point money to cents at the parse boundary

Round to integer cents the moment a monetary string enters the system. Never compare raw `parseFloat` results for equality.

**Wrong** — `parseFloat("10.30")` may produce `10.299999...`, failing equality against stored `10.3`:
```ts
export function parseAmount(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : Math.abs(n); // raw float — precision drift
}

// Fails silently:
const isDuplicate = t.amount === row.amount; // 10.3 !== 10.299999...
```

**Correct** — normalize to cents immediately on parse:
```ts
export function parseAmount(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(/[$,\s]/g, ''));
  if (isNaN(n)) return null;
  return Math.round(Math.abs(n) * 100) / 100; // cents-normalized at ingestion
}

// Safe deduplication:
const isDuplicate = Math.round(t.amount * 100) === Math.round(row.amount * 100);
```

**Why this matters.** IEEE 754 cannot exactly represent most decimal fractions. This class of bug is invisible in tests that construct amounts programmatically but surfaces reliably when reading CSV or JSON. Normalizing at the parse boundary prevents drift from propagating into business logic, storage, or comparisons.

---

### 4. Always deregister module-level singleton callbacks on unmount

Every `useEffect` that installs a callback into a module-level variable must return a cleanup that nulls it.

**Wrong** — no cleanup, stale closure after unmount:
```ts
// service module
let _callback: Fn | null = null;
export function register(cb: Fn) { _callback = cb; }

// component
useEffect(() => {
  register((msg, type) => setToasts(...));
  // no return — _callback holds stale reference after unmount
}, []);
```

**Correct:**
```ts
// service module
let _callback: Fn | null = null;
export function register(cb: Fn) { _callback = cb; }
export function deregister() { _callback = null; }

// component
useEffect(() => {
  register((msg, type) => setToasts(...));
  return () => deregister(); // runs on unmount
}, []);
```

**Why this matters.** Without cleanup, the module retains a closure over the unmounted component's state setter. React Strict Mode's double-mount masks the bug (second mount re-registers a fresh callback), but in production any conditional render or navigation away causes `showToast()` to silently swallow messages. The pattern applies to event buses, global stores, and any pub/sub registry.

---

### 5. Thread full duplicate context through import pipelines to preserve user metadata

When an import pipeline surfaces duplicates, pass both the incoming row and the existing record forward. On accept, merge metadata from the existing record before writing.

**Wrong** — drops the existing transaction's `isManualCategory` flag:
```ts
// Modal passes only incoming ParsedRow — existing.isManualCategory lost
acceptedDuplicates: result.duplicates
  .filter((_, i) => decisions[i] === 'keep')
  .map((d) => d.incoming) // ← existing context discarded here
```

**Correct** — pass the full `DuplicateRow`, merge on accept:
```ts
// Type carries both sides
interface DuplicateRow {
  incoming: ParsedRow;
  existing: Transaction;
}

// Pipeline receives DuplicateRow[] — inherits manual metadata
const resolved = params.acceptedDuplicates.map((dup) => ({
  ...dup.incoming,
  ...(dup.existing.isManualCategory
    ? { category: dup.existing.category, type: dup.existing.type }
    : {}),
}));
```

**Why this matters.** A re-import of the same data is not a clean slate — the user may have already categorized those transactions. Passing only the incoming row silently discards that work. The general principle: whenever a "replace" operation can clobber user-authored metadata, the pipeline must carry full before/after context and apply a merge strategy rather than a blind overwrite. This applies to any upsert flow: contact sync, document re-import, config reload.

---

## Prevention Strategies

### 1. Persistence heuristics — reference equality vs status flags

**Rule:** Use reference equality (`prev !== next`) as the write-gate signal; never a boolean flag that can drift from the data it guards.

**PR review check:** Search for `if (isDirty)` / `if (hasChanged)` before any save call. For each, ask: "Is this flag always set atomically with the data mutation?" If drift is possible, replace with a selector comparison.

**Automatable?** Partially — ESLint rule can flag `useState` booleans matching `/(dirty|changed|modified|unsaved)/i` used as write conditions.

---

### 2. Schema migration ordering

**Rule:** Call order must be `migrate(raw) → validate(migrated)`. Never `validate(raw) → migrate(valid)`.

**PR review check:** In any data-loading pipeline, confirm `migrate` appears before any schema validation. A unit test fixture with old-schema data that asserts zero validation errors is the most reliable enforcement.

**Automatable?** Via a named function (`loadAndMigrate`) that enforces the sequence structurally, plus a smoke-test suite with one fixture per schema version.

---

### 3. Float arithmetic in financial code

**Rule:** Parse every monetary value to integer cents at the system boundary. Never perform arithmetic on raw `parseFloat` output.

**PR review check:** Search for arithmetic operators on variables matching `/(price|amount|total|balance|cost|fee)/i`. Any `number` type (vs a branded `Cents` type) on a financial field is a red flag.

**Automatable?** Yes — TypeScript branded types (`type Cents = number & { readonly __brand: 'cents' }`) force explicit re-branding at arithmetic sites. Pair with an ESLint rule banning bare `parseFloat` in financial modules.

---

### 4. Module-level singleton cleanup

**Rule:** Every `useEffect` that calls `register` / `subscribe` / `attach` must return `() => deregister()`.

**PR review check:** Scan every `useEffect` in the diff. If the body calls any registration-like function, confirm a `return () => { ... }` exists.

**Automatable?** A custom ESLint rule can flag `useEffect` callbacks that call known registration functions without a corresponding `return`. Also: React 18 Strict Mode double-mount surfaces missing cleanups immediately in dev.

---

### 5. Data flow completeness

**Rule:** A pipeline stage's parameter type must structurally require all fields it needs — never accept a supertype and hope the caller provided extras.

**PR review check:** For each pipeline function in the diff, inspect its parameter types. Any `Partial<T>` or broad supertype in an internal pipeline type warrants scrutiny.

**Automatable?** Yes — avoid `Partial<T>` in pipeline-internal types. `@typescript-eslint/no-explicit-any` prevents the worst offenders. `satisfies` assertions on output types catch missing fields at compile time.

---

### 6. Dead code hygiene

**Rule:** If a symbol is exported but never imported, or a style value is defined in more than one place, delete one now — not later.

**PR review check:** (1) Run `knip` or `ts-prune` on new exports. (2) Search for the literal value of any new constant to find duplicates. (3) Search for any new CSS class name in JSX.

**Automatable?** Yes — `knip` for dead exports, `stylelint` with `no-unused-selectors` for CSS, `PurgeCSS` for production builds. Add to pre-commit or CI.

---

## Related Documentation

This is the first entry in `docs/solutions/` for this workspace.

---

## Context

- **Project:** Personal Finance Snapshot SPA (React 18 + TypeScript 5 + Vite 5 + Zod + Recharts)
- **Discovered via:** 7-agent parallel code review (security-sentinel, performance-oracle, architecture-strategist, pattern-recognition-specialist, code-simplicity-reviewer, agent-native-reviewer, learnings-researcher)
- **Fixed via:** 7-agent parallel implementation — all 13 findings resolved in a single parallel pass, TypeScript clean
- **Date:** 2026-04-15
