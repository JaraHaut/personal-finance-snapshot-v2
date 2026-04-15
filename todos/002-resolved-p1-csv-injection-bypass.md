---
status: resolved
priority: p1
issue_id: '002'
source: ai
author: security-sentinel
scope: in_scope
tags: [code-review, security, csv-injection, owasp]
---

# P1: CSV injection bypass — pipe and semicolon prefixes not sanitized

## Problem Statement

`csv-parser.ts` `sanitizeDescription()` only strips formula-trigger prefixes `=`, `+`, `-`, `@` — the classic spreadsheet injection set. OWASP's CSV injection guidance also includes `|` (pipe, used in DDE attacks) and `;` (semicolon, used in some formula dialects). A malicious CSV with `|cmd /c calc` or `;=cmd()` in a description field would pass sanitization and be stored/displayed.

## Findings

Current regex (approximate from the codebase):
```ts
// Only strips: = + - @ at start of string
description.replace(/^[=+\-@]/, "'$&")
```

This misses:
- `|cmd /c calc` — Windows DDE pipe
- `;;=SUM(...)` — semicolon-prefix formula

## Proposed Solution

Extend the prefix character set to include `|` and `;`:

```ts
function sanitizeDescription(raw: string): string {
  return raw.trim().replace(/^[=+\-@|;]/, "'$&");
}
```

Also consider truncating unusually long descriptions (>200 chars) which may indicate injection payloads.

## Acceptance Criteria

- [ ] Descriptions starting with `|` are prefixed with `'` in stored transactions
- [ ] Descriptions starting with `;` are prefixed with `'`
- [ ] Existing formula prefix handling (`=`, `+`, `-`, `@`) still works
- [ ] Unit test covers all 6 trigger characters
