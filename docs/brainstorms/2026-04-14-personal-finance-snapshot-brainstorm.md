---
date: 2026-04-14
topic: personal-finance-snapshot
---

# Personal Finance Snapshot

## What We're Building

A browser-based personal finance tool that ingests a CSV of bank transactions
(date, description, amount) and turns it into an interactive spending dashboard.
The app categorizes expenses via keyword rules, lets users drill into transactions
with a filterable table, visualizes monthly totals and category breakdowns, and
exports a monthly snapshot as a PDF.

All data lives in the browser (`localStorage`) — no backend, no sign-in, no
infrastructure. The entire experience runs from a single Vite + React + TypeScript
app.

## Why This Approach

Considered three options:

- **Vite + React SPA** — chosen. Fast DX, strong TypeScript support, excellent
  charting and PDF libraries, zero backend complexity. Right-sized for the scope.
- **Next.js** — rejected. SSR and routing features are overkill for a fully
  client-side tool.
- **Vanilla HTML/JS** — rejected. Works for a prototype but becomes difficult to
  maintain once charts, filtering, and PDF export are all in the mix.

## Key Decisions

- **Stack:** Vite + React + TypeScript. Recharts for visualizations, jsPDF +
  html2canvas for PDF export, Papa Parse for CSV parsing.

- **Storage:** `localStorage`. No backend. Fine for personal use; ~5MB limit is
  well within realistic transaction volume.

- **Categorization:** Rule-based. A set of keyword rules maps description strings
  to categories (e.g. `WHOLEFDS` → Groceries, `NETFLIX` → Subscriptions). Rules
  are applied on import; the user can override any individual transaction via the
  table view. Categories include a special `Income` category for income detection.

- **Income vs. expense classification:** Do NOT trust the CSV amount sign. Instead,
  use description-based rules to classify each transaction as `income` or `expense`
  (e.g. `DIRECT DEPOSIT` → income, `PAYROLL` → income, everything else → expense
  unless a rule says otherwise). This avoids sign-convention mismatches across
  different bank CSV exports.

- **Data quality:** Import with "skip and flag" behavior — valid rows are imported,
  invalid rows (unparseable date, non-numeric amount, missing date) are collected
  and shown in an import summary modal so the user knows exactly what was skipped.
  Duplicate detection: flag exact duplicates (same date + description + amount) and
  let the user decide to keep or discard.

- **Visualizations:** Three charts — (1) monthly totals bar chart (income vs.
  expenses), (2) spending by category donut/pie chart, (3) monthly trend line per
  category. All charts respond to the selected month filter.

- **Export:** PDF monthly snapshot. Use `html2canvas` to capture the dashboard
  view, then embed in a jsPDF document. One PDF per selected month.

## Resolved Questions

- **Rule set editability:** Hardcoded defaults only. User can override individual
  transaction categories inline in the table — no rules settings panel needed.

- **Import behavior:** Multi-file with named imports. Each uploaded CSV is stored
  under a user-assigned label (e.g. "January 2026"). All imports coexist in
  `localStorage`; charts aggregate across all of them for cross-month comparison.
  Users can delete individual imports. This enables the core month-to-month trend
  use case.

- **Default categories:** Groceries, Dining, Transport, Subscriptions, Utilities,
  Shopping, Health, Travel, Income, Other (10 categories total).

## Planning Amendment

- **Transfers category (finalized during deepening):** `'Transfers'` is the 11th
  category (not a TransactionType). Transactions matching transfer keywords (CARD
  AUTOPAY, VENMO, ZELLE, CASH APP) are auto-assigned `category: 'Transfers'` by rules,
  then shown in `ImportSummaryModal` where the user chooses `type: 'income' | 'expense'`
  — no default pre-selection; user must actively decide. `TransactionType` stays
  `'income' | 'expense'` only. 'Transfers' category excluded from spending charts by default.

## Next Steps

→ `/zigce:work docs/plans/2026-04-14-feat-personal-finance-snapshot-spa-plan.md`
