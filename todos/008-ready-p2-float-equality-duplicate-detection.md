---
status: ready
priority: p2
issue_id: '008'
source: ai
author: security-sentinel
scope: in_scope
tags: [code-review, correctness, duplicate-detection, floating-point]
---

# P2: Float equality in duplicate detection — precision errors cause false misses

## Problem Statement

The duplicate transaction detection in `import-pipeline.ts` compares `amount` values using strict equality (`===`) on floating-point numbers. CSV amounts like `10.30` parsed by `parseFloat` may produce `10.299999999999999` in IEEE 754 arithmetic, which would not equal `10.3` from a prior import — causing the same transaction to be imported twice as a "non-duplicate".

## Proposed Solution

Normalize amounts to integer cents before comparison:

```ts
function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

// In duplicate check:
const isDuplicate = (a: Transaction, b: ParsedRow) =>
  a.date === b.date &&
  a.description === b.description &&
  amountToCents(a.amount) === amountToCents(b.amount);
```

The `parseAmount` function in `csv-parser.ts` should also normalize to 2 decimal places immediately after parsing:
```ts
return Math.round(rawFloat * 100) / 100;
```

## Acceptance Criteria

- [ ] `parseAmount` returns values normalized to 2 decimal places (no float precision drift)
- [ ] Duplicate detection compares integer cents, not raw floats
- [ ] A transaction with amount `10.30` parsed from CSV correctly matches an existing `10.3` transaction
