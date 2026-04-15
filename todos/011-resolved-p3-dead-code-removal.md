---
status: resolved
priority: p3
issue_id: '011'
source: ai
author: code-simplicity-reviewer, pattern-recognition-specialist, architecture-strategist
scope: in_scope
tags: [code-review, dead-code, cleanup]
---

# P3: Dead code — `useFilters`, `useImportTransactionCount`, `useDispatchCallback` never used

## Problem Statement

Three exported symbols are never imported anywhere in the codebase:

1. **`src/hooks/useFilters.ts`** — entire file. `TableFilters.tsx` re-implements all its logic inline (setMonth, setCategory, setType, clear). The hook was presumably created first but the component never adopted it.

2. **`useImportTransactionCount`** in `AppContext.tsx` (lines 157–160) — exported but unused. `ImportsList.tsx` uses `useImportsWithCount` instead (which batches the count for all imports in one pass).

3. **`useDispatchCallback`** in `AppContext.tsx` (lines 207–212) — exported but unused. Also has a footgun: if callers pass an inline arrow as `actionCreator`, the internal `useCallback` re-creates on every render because the function reference changes.

## Proposed Solution

**Option A (recommended): Delete all three.**

```bash
# Delete the unused hook file
rm src/hooks/useFilters.ts

# Remove useImportTransactionCount and useDispatchCallback from AppContext.tsx
```

**Option B (for useFilters only):** Have `TableFilters.tsx` import and use `useFilters()`, then delete the local `setMonth`/`setCategory`/`setType`/clear functions.

## Acceptance Criteria

- [ ] `useFilters.ts` is either deleted or used by `TableFilters.tsx`
- [ ] `useImportTransactionCount` is removed from `AppContext.tsx`
- [ ] `useDispatchCallback` is removed from `AppContext.tsx`
- [ ] No TypeScript errors after removal
- [ ] No other files referenced the removed symbols
