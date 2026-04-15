---
status: ready
priority: p2
issue_id: '009'
source: ai
author: architecture-strategist
scope: in_scope
tags: [code-review, data-integrity, import, categories]
---

# P2: Accepted duplicates lose `isManualCategory` from the existing transaction

## Problem Statement

When a user accepts a duplicate in `ImportSummaryModal`, the accepted duplicate is treated as a new `ParsedRow` with `isManualCategory: false`. If the user had previously manually categorized that transaction, the re-import silently resets the category back to auto-categorized.

`import-pipeline.ts` (line 83 approx) always sets `isManualCategory: false` for accepted duplicates because the incoming `ParsedRow` type doesn't carry this field — the data is structurally unavailable.

## Proposed Solution

For accepted duplicates, inherit `isManualCategory` (and `category`) from the `existing` transaction in the `DuplicateRow`:

```ts
// In finalizeImport, when processing acceptedDuplicates:
acceptedDuplicates.forEach(dup => {
  // dup has shape: { incoming: ParsedRow, existing: Transaction }
  const tx = buildTransaction(dup.incoming);
  if (dup.existing.isManualCategory) {
    tx.category = dup.existing.category;
    tx.type = dup.existing.type;
    tx.isManualCategory = true;
  }
  newTransactions.push(tx);
});
```

This requires passing the `DuplicateRow` (with both `incoming` and `existing`) to `finalizeImport`, rather than just the `incoming` side.

## Acceptance Criteria

- [ ] Re-importing a transaction the user previously categorized manually preserves the manual category
- [ ] Re-importing a transaction with no manual override uses the new auto-categorization
- [ ] `DuplicateRow.existing` is available when building the accepted transaction in `finalizeImport`
