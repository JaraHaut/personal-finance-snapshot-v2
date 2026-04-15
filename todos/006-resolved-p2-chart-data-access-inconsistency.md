---
status: resolved
priority: p2
issue_id: '006'
source: ai
author: pattern-recognition-specialist
scope: in_scope
tags: [code-review, patterns, charts, filtering]
---

# P2: Inconsistent data access across sibling chart components — filter behavior invisible to users

## Problem Statement

All three charts render side-by-side on the Dashboard, but they use different data sources:

- `MonthlyTotalsChart` — `useAppState()` (ALL transactions, ignores filters)
- `CategoryTrendChart` — `useAppState()` (ALL transactions, ignores filters)  
- `CategoryPieChart` — `useFilteredTransactions()` (respects month/category/type filter)

This behavioral difference is invisible from the Dashboard layout — there is no UI hint that the pie chart responds to filters while the bar and trend charts do not. Users applying a month filter see the pie chart update but the other two remain unchanged, which is confusing.

## Proposed Solution

**Option A (recommended):** Make all three charts consistent — all use `useFilteredTransactions()`. Add a note to `MonthlyTotalsChart` that it shows the selected period.

**Option B:** All use `useAppState()` raw, and document why pie shows filtered data.

**Option C:** Add visual indicators — e.g., a "Filtered" label or highlight on charts that respond to the active filter.

Whatever is chosen, document the decision with a comment in each chart file so the next developer understands immediately.

## Acceptance Criteria

- [ ] All three charts use the same data source, OR
- [ ] Each chart that differs from the others has a visible UI indicator and code comment explaining the intentional difference
- [ ] Dashboard README or code comment documents the filter behavior per chart
