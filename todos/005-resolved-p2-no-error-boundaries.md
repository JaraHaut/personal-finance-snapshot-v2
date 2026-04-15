---
status: resolved
priority: p2
issue_id: '005'
source: ai
author: architecture-strategist
scope: in_scope
tags: [code-review, architecture, error-handling, resilience]
---

# P2: No React error boundaries — single Recharts throw crashes entire Dashboard

## Problem Statement

There are no error boundaries anywhere in the component tree. Two specific failure modes crash the entire app:

1. `PdfSnapshot` (off-screen) renders 3 Recharts instances with live transaction data. A malformed `NaN` amount slipping through a migration bug causes Recharts to throw during render — crashing the entire `Dashboard` with a white screen.
2. A single `TransactionRow` with an invalid Date propagates up through `TransactionTable` → `Transactions` page → `AppProvider` → blank screen.

## Proposed Solution

Add error boundaries at three levels:

```tsx
// 1. Route-level boundary (wrap each page in App.tsx)
<ErrorBoundary fallback={<PageError />}>
  <Dashboard />
</ErrorBoundary>

// 2. PdfSnapshot boundary (isolate off-screen export renderer)
<ErrorBoundary fallback={null}>
  <div aria-hidden style={{ position: 'absolute', left: -9999, ... }}>
    <PdfSnapshot ref={pdfRef} ... />
  </div>
</ErrorBoundary>

// 3. App-level fallback (catch-all in main.tsx)
<ErrorBoundary fallback={<AppCrash />}>
  <AppProvider>
    <App />
  </AppProvider>
</ErrorBoundary>
```

A minimal class-based `ErrorBoundary` component:
```tsx
class ErrorBoundary extends React.Component<{children, fallback}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

## Acceptance Criteria

- [ ] A Recharts throw inside `PdfSnapshot` does not crash the Dashboard
- [ ] A render error in `TransactionRow` shows an error state on the Transactions page, not a blank app
- [ ] App-level boundary catches anything that slips through with a recovery message
