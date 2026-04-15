---
status: resolved
priority: p1
issue_id: '001'
source: ai
author: performance-oracle, architecture-strategist
scope: in_scope
tags: [code-review, performance, persistence, bug]
---

# P1: `saveImmediately` fires on every category override — synchronous localStorage write

## Problem Statement

`AppContext.tsx` (lines 117–131) fires `saveImmediately` (a synchronous `localStorage.setItem`) whenever `importPhase === 'idle'`. Since OVERRIDE_CATEGORY never changes `importPhase`, the condition is true for every category edit — meaning every user click on a category badge triggers a blocking main-thread write instead of the intended debounced `scheduleSave`.

## Findings

The `useEffect` for persistence uses this logic:
```ts
if (state.importPhase === 'idle') {
  saveImmediately(state);   // ← called on every filter change AND category override
} else {
  scheduleSave(state);       // ← only called during import reading/confirming phases
}
```

This inverts the intent. `saveImmediately` was designed to flush state right after `ADD_IMPORT` / `DELETE_IMPORT` (when the user just created or deleted data). For everything else (category overrides, filter changes), the debounced `scheduleSave` should be used.

## Proposed Solution

Track whether imports changed by comparing `state.imports` reference (or length + ids), not `importPhase`:

```ts
const prevImportsRef = useRef(state.imports);

useEffect(() => {
  const importsChanged = state.imports !== prevImportsRef.current;
  prevImportsRef.current = state.imports;

  if (importsChanged) {
    saveImmediately(state);
  } else {
    scheduleSave(state);
  }
}, [state]);
```

This correctly fires `saveImmediately` on ADD/DELETE and debounces everything else.

## Acceptance Criteria

- [ ] Applying a category override does NOT trigger a synchronous localStorage write
- [ ] ADD_IMPORT and DELETE_IMPORT still trigger immediate save
- [ ] Filter changes use the debounced path
- [ ] No functional regression — state is persisted correctly after all action types
