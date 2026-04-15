---
status: resolved
priority: p2
issue_id: '010'
source: ai
author: performance-oracle, architecture-strategist
scope: in_scope
tags: [code-review, performance, memoization, react]
---

# P2: Context selector hooks run O(n) scans on every state change — not memoized

## Problem Statement

`AppContext.tsx` exports selector hooks (`useFilteredTransactions`, `useAvailableMonths`, `useImportsWithCount`, `useImportTransactionCount`) that read from `StateCtx` and perform O(n) computations on every render. Since `StateCtx.Provider` re-renders on every state change (including unrelated changes like `isExporting` toggling), every consumer re-runs the scan.

This is architecturally inconsistent — `PdfSnapshot.tsx` wraps identical computations in `useMemo`, but the context selectors have no memoization.

## Proposed Solution

Add `useMemo` inside each selector hook:

```ts
export function useFilteredTransactions(): Transaction[] {
  const { transactions, filters } = useAppState();
  return useMemo(
    () => transactions.filter(t => {
      if (filters.selectedMonth && !t.date.startsWith(filters.selectedMonth)) return false;
      if (filters.selectedCategories.length > 0 && !filters.selectedCategories.includes(t.category)) return false;
      if (filters.selectedType && t.type !== filters.selectedType) return false;
      return true;
    }),
    [transactions, filters]
  );
}

export function useAvailableMonths(): string[] {
  const { transactions } = useAppState();
  return useMemo(
    () => [...new Set(transactions.map(t => t.date.slice(0, 7)))].sort().reverse(),
    [transactions]
  );
}
```

## Acceptance Criteria

- [ ] All 4 selector hooks (`useFilteredTransactions`, `useAvailableMonths`, `useImportsWithCount`, `useImportTransactionCount`) use `useMemo` with correct dependency arrays
- [ ] Toggling `isExporting` does not re-run the transaction filter scan
- [ ] Selector results are stable references (same array identity) when inputs haven't changed
