---
status: resolved
priority: p3
issue_id: '013'
source: ai
author: pattern-recognition-specialist
scope: in_scope
tags: [code-review, dead-code, css, cleanup]
---

# P3: Dead CSS classes — `.badge-income`, `.badge-expense`, `.badge-transfer` never used

## Problem Statement

`index.css` (lines 111–114) defines three type-specific badge classes labeled "Legacy type badges kept for any remaining uses":

```css
.badge-income   { ... }
.badge-expense  { ... }
.badge-transfer { ... }
```

A grep of all `.tsx` files confirms zero usage. These classes are dead code kept "just in case" — a pattern that adds maintenance noise without benefit.

## Proposed Solution

Delete the three CSS class definitions from `index.css`.

## Acceptance Criteria

- [ ] `.badge-income`, `.badge-expense`, `.badge-transfer` removed from `index.css`
- [ ] No `.tsx` files reference these class names (verify with grep)
- [ ] Existing badge rendering (via `categoryBadgeStyle()` + `.badge` class) continues to work
