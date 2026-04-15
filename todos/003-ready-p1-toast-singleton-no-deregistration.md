---
status: ready
priority: p1
issue_id: '003'
source: ai
author: architecture-strategist, security-sentinel
scope: in_scope
tags: [code-review, architecture, memory-leak, security]
---

# P1: Toast singleton `_toastCallback` has no cleanup — stale closure on unmount

## Problem Statement

`Toast.tsx` registers a module-level `_toastCallback` via `registerToastCallback()` inside a `useEffect` with an empty dependency array and **no cleanup function**. If `ToastContainer` unmounts (future layout change, React Strict Mode double-invoke, or navigation to a modal-only view), `showToast` continues calling the stale/null callback. There is no deregistration path in the current API.

In React Strict Mode (development), React intentionally mounts → unmounts → remounts every component. The first mount registers; the unmount does nothing (no cleanup); the second mount registers again — this works by accident. In a future refactor where `ToastContainer` can unmount permanently, `showToast` silently swallows via `console.info` with no user feedback.

Additionally, any script (including an injected one) can call `registerToastCallback` to intercept or suppress toast notifications.

## Findings

```ts
// Toast.tsx — missing cleanup
useEffect(() => {
  registerToastCallback((message, type) => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  });
  // ← no return/cleanup function
}, []);
```

## Proposed Solution

Return a cleanup function that nulls the callback:

```ts
// In AppContext.tsx or Toast.tsx:
let _toastCallback: ToastCallback | null = null;

export function registerToastCallback(cb: ToastCallback) {
  _toastCallback = cb;
}

export function deregisterToastCallback() {
  _toastCallback = null;
}

// In ToastContainer:
useEffect(() => {
  registerToastCallback((message, type) => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  });
  return () => deregisterToastCallback();
}, []);
```

## Acceptance Criteria

- [ ] `useEffect` in `ToastContainer` returns a cleanup that nulls `_toastCallback`
- [ ] `showToast` called after unmount does not throw and logs a warning
- [ ] `deregisterToastCallback` is exported from the same module as `registerToastCallback`
