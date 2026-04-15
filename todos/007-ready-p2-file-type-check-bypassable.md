---
status: ready
priority: p2
issue_id: '007'
source: ai
author: security-sentinel
scope: in_scope
tags: [code-review, security, file-validation]
---

# P2: File type check uses `||` instead of `&&` — MIME or extension bypass possible

## Problem Statement

The file type validation in `ImportZone.tsx` (or `csv-parser.ts`) uses `||` (OR) logic when it should use `&&` (AND) to require both MIME type and extension to match. With `||`, a file that passes either check alone is accepted — an attacker could rename a `.exe` to `.csv` and bypass the extension check if the MIME type still validates.

## Findings

Current check (approximate):
```ts
if (file.type !== 'text/csv' || !file.name.endsWith('.csv')) {
  throw new Error('Invalid file type');
}
```

This rejects a file only if BOTH conditions fail. A file with `type: 'text/csv'` but `.exe` extension passes. Correct logic:

```ts
// Reject if EITHER condition fails:
const validMime = file.type === 'text/csv' || file.type === 'text/plain';
const validExt = file.name.toLowerCase().endsWith('.csv');
if (!validMime || !validExt) {
  throw new Error('Only CSV files are accepted');
}
```

## Acceptance Criteria

- [ ] A file with `.csv` extension but `application/octet-stream` MIME type is rejected
- [ ] A file with `text/csv` MIME type but `.exe` extension is rejected  
- [ ] A valid `.csv` with `text/csv` MIME type is accepted
- [ ] A valid `.csv` with `text/plain` MIME type is also accepted (some OS/browsers set this)
