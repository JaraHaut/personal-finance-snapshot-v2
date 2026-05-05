---
title: "Post-merge polish: branded types, tests, bundle trim, modal split, pre-push gate"
date: 2026-05-05
type: [refactoring, testing, bug-fix, chore]
tags: [zod, branded-types, vitest, vite, react, typescript, bundle-optimization, component-splitting, pre-push-hook, ci-gate]
components: [storage.ts, index.html, ImportSummaryModal, categorizer.test.ts, csv-parser.test.ts, package.json]
symptoms: [branded-types-stripped-at-runtime, default-scaffold-title, no-test-suite, unused-dependency, oversized-component-file]
checkpoint: code
related:
  - docs/solutions/architecture-patterns/react-spa-data-integrity-patterns.md
---

# Post-Merge Polish: 5 Improvements to a React/TypeScript SPA

Five improvements applied after the initial PR merged, covering a TypeScript build fix, test setup, bundle cleanup, scaffold hygiene, and component splitting.

---

## 1. Zod Strips Branded Types

### Root Cause

Zod's `z.string()` always infers the plain `string` type. Branded types such as:

```ts
type ImportId = string & { readonly [_brand]: 'ImportId' }
```

are TypeScript-only constructs — Zod has no knowledge of them. When `AppStorageSchema.safeParse()` returns `z.infer<typeof AppStorageSchema>`, all id fields come back as `string`, not `ImportId`, `TransactionId`, or `ISODate`. TypeScript's composite build (`tsc -b`) catches the mismatch; `tsc --noEmit` alone missed it in this project.

### Solution

Cast once immediately after the parse succeeds, at the storage boundary:

```ts
// result.data is z.infer<AppStorageSchema> — string, not branded
// Safe cast: data already passed full Zod validation
const validated = result.data as unknown as AppStorage;
```

The `as unknown as AppStorage` double-cast is the idiomatic TypeScript pattern for crossing from unbranded to branded types at a trust boundary.

### Key Insights

- Always run `tsc -b` (not just `tsc --noEmit`) in projects with `composite: true` — the composite build exercises the full project reference graph and catches errors `--noEmit` silently skips.
- "Validate with Zod, then cast to branded type" is the correct pattern. The cast is a one-time boundary crossing, not a general escape hatch.
- Branded types enforce call-site correctness at compile time — worth the single cast at the storage layer.

---

## 2. HTML Title Left as Scaffold Default

### Root Cause

Vite + React scaffolding leaves `<title>Vite + React + TS</title>` in `index.html`. It ships to production if not updated.

### Solution

```html
<!-- Before -->
<title>Vite + React + TS</title>

<!-- After -->
<title>Finance Snapshot</title>
```

### Key Insight

Add "HTML `<title>` updated to product name" to the definition-of-done checklist. For SPAs with multiple routes, consider `react-helmet-async` for dynamic per-route titles.

---

## 3. Vitest Setup with Vite 5

### Root Cause

`vitest@4` requires `vite@6` as a peer dependency. This project uses `vite@5`, making the latest Vitest incompatible. Additionally, importing `defineConfig` from `vite` (not `vitest/config`) causes TypeScript to not recognize the `test` field in the config object.

### Solution

Install the correct Vitest version:

```sh
pnpm add -D vitest@2 @vitest/coverage-v8@2
```

Update `vite.config.ts`:

```ts
// Before — loses type inference for `test` field
import { defineConfig } from 'vite'

// After — correct import for Vitest config
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

Add scripts to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

### Test Coverage Added (51 tests)

| File | Tests | What's covered |
|------|-------|---------------|
| `categorizer.test.ts` | 24 | All 11 categories, rule priority ordering, case-insensitive matching, fallback |
| `csv-parser.test.ts` | 27 | `normalizeDate` (formats, invalid dates), `parseAmount` (signs, commas, rounding), `sanitizeDescription` (CSV injection chars) |

`parseCSV` was not tested — it requires a browser `File` object and needs a jsdom environment, which is a separate setup task.

### Key Insights

- Vitest major version tracks Vite major version — treat them as a single upgrade unit (Vite 5 → vitest@2, Vite 6 → vitest@4).
- Always import `defineConfig` from `vitest/config`, not `vite`.
- Functions accepting browser-native objects (`File`, `Blob`, `FormData`) require jsdom and should be separated from pure-function unit tests.

---

## 4. Unused Production Dependency

### Root Cause

`@tanstack/react-virtual` was listed in `dependencies` (not `devDependencies`) but was never imported anywhere in the codebase. It was planned during brainstorming but never implemented. It bloated the production bundle by ~10KB.

### Solution

```sh
pnpm remove @tanstack/react-virtual
```

### Key Insights

- Use `pnpm why <package>` to check if a dependency is actually imported anywhere.
- `depcheck` or `knip` can automate unused-dependency detection in CI.
- Unused production dependencies increase bundle size, audit surface, and Dependabot noise.

---

## 5. ImportSummaryModal: Single File → Folder

### Root Cause

`ImportSummaryModal.tsx` had grown to 399 lines with 5 distinct components in one file: the orchestrator plus `SkippedStep`, `TransfersStep`, `DuplicatesStep`, and `LabelStep`.

### Solution

Convert to a directory module. External import path is unchanged:

```ts
// Still works — index.tsx re-exports the same symbol
import { ImportSummaryModal } from '.../ImportSummaryModal'
```

New structure:

```
ImportSummaryModal/
├── index.tsx          # 84 lines — orchestration only
├── SkippedStep.tsx    # ~43 lines
├── TransfersStep.tsx  # ~68 lines
├── DuplicatesStep.tsx # ~64 lines
└── LabelStep.tsx      # ~44 lines
```

### Key Insights

- The `ComponentName/index.tsx` pattern splits large components without breaking any existing import paths.
- Split when: file exceeds ~150 lines, contains more than 2 sub-components, or a sub-component is reusable elsewhere.
- Orchestration (state, step logic) belongs in `index.tsx`; each screen belongs in its own file.

---

## Git Pre-Push Hook

Prevents broken code from reaching GitHub by running a full quality gate locally:

```sh
#!/usr/bin/env bash
set -e
cd finance-snapshot
node_modules/.bin/tsc -b --noEmit   # type check
node_modules/.bin/vitest run        # tests
node_modules/.bin/eslint .          # lint
node_modules/.bin/vite build        # production build
```

Stored at `.git/hooks/pre-push` (local only, not committed). To share with the team, use [husky](https://typicode.github.io/husky/) and commit `.husky/pre-push`.

---

## Prevention Checklist

### Definition of Done

- [ ] `tsc -b` passes (not just `tsc --noEmit`)
- [ ] `vitest run` passes
- [ ] `<title>` in `index.html` is not the scaffold default
- [ ] All production dependencies are actually imported (`pnpm why <pkg>`)
- [ ] No component file exceeds ~150 lines with multiple sub-components

### Detecting Zod/Branded-Type Mismatches Earlier

- Run `tsc -b` in CI — `--noEmit` skips project references and misses composite errors.
- Use `type-fest` or `ts-expect` for type-level tests: `type _check = Expect<Equal<z.infer<typeof Schema>, DomainType>>`.

### Detecting Unused Dependencies

- `pnpm why <package>` — shows the dep graph; if no source file appears, it's unused.
- `depcheck` — flags packages with no import found.
- `knip` — finds unused exports, files, and deps in one pass (recommended for TypeScript).

### Vitest Version Pinning

Pin Vitest to match the Vite major version. Never bump one without the other:

| Vite version | Vitest version |
|-------------|----------------|
| 5.x         | 2.x            |
| 6.x         | 4.x            |
