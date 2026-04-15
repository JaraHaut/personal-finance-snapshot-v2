---
status: resolved
priority: p3
issue_id: '012'
source: ai
author: code-simplicity-reviewer, pattern-recognition-specialist
scope: in_scope
tags: [code-review, duplication, cleanup, charts]
---

# P3: `TOOLTIP_STYLE` duplicated across 3 chart files; `SummaryCard`/`StatBox` are two implementations of same component

## Problem Statement

**1. TOOLTIP_STYLE duplication:**

The exact same tooltip style object appears verbatim in:
- `MonthlyTotalsChart.tsx:10-15`
- `CategoryPieChart.tsx:7-12`
- `CategoryTrendChart.tsx:13-18`

A slightly different variant (no `boxShadow`, `borderRadius: 6`) exists in `PdfSnapshot.tsx:64` as `TT`. If the design changes, all four must be updated manually.

**2. SummaryCard / StatBox duplicate:**

`Dashboard.tsx` has a `SummaryCard` component. `PdfSnapshot.tsx` has a `StatBox` component. Both render a colored numeric value + label in a box. They are the same concept with different styling, duplicated rather than shared.

## Proposed Solution

**TOOLTIP_STYLE:** Extract to `src/constants/chartTheme.ts`:
```ts
export const TOOLTIP_STYLE: React.CSSProperties = {
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid #dde3ee',
  boxShadow: '0 4px 16px rgba(15,23,42,.10)',
};

export const TICK_STYLE = { fontSize: 13, fill: '#64748b' };
export const GRID_STYLE = { strokeDasharray: '4 4', stroke: '#e8edf4' };
```

Import from all chart files. `PdfSnapshot.tsx` uses its own PDF-tuned variant (that's fine — document the intentional difference).

**SummaryCard/StatBox:** The PDF variant will always look different from the screen variant (different fonts, fixed-width layout). Keep them separate but add a comment to each: `// Screen variant — see PdfSnapshot.tsx:StatBox for PDF equivalent`.

## Acceptance Criteria

- [ ] `TOOLTIP_STYLE`, `TICK_STYLE`, `GRID_STYLE` extracted to a shared `chartTheme.ts` file
- [ ] All three interactive chart files import from `chartTheme.ts`
- [ ] `PdfSnapshot.tsx` retains its own PDF-tuned constants with a comment explaining the difference
- [ ] `SummaryCard` and `StatBox` each have a comment linking to the other
