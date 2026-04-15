---
status: ready
priority: p1
issue_id: '004'
source: ai
author: architecture-strategist
scope: in_scope
tags: [code-review, architecture, data-loss, storage, migration]
---

# P1: Storage migration runs after strict Zod parse — silent data loss on schema upgrade

## Problem Statement

`storage.ts` (lines 77–95) calls `AppStorageSchema.parse(JSON.parse(raw))` **before** calling `migrate()`. When schema v2 is introduced (e.g., adding a required field or changing an enum), any existing v1 blobs will fail Zod validation and be discarded as "corrupted" — silently wiping user transaction history — before the migration code gets a chance to transform them.

This currently works only because schema v1 is the initial version. When the first real migration lands, this ordering bug will cause silent data loss for all existing users.

## Findings

Current order in `loadAppData()`:
```
1. JSON.parse(raw)
2. AppStorageSchema.parse(...)  ← throws for pre-v2 data → data erased
3. migrate(parsed)              ← never reached for old data
```

Correct order:
```
1. JSON.parse(raw)
2. Loose parse / safeParse (just check it's an object with a version field)
3. migrate(rawObj)              ← transforms to current shape
4. AppStorageSchema.parse(...)  ← now validates the migrated result
```

## Proposed Solution

```ts
function loadAppData(): AppStorage | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  
  try {
    const rawParsed = JSON.parse(raw);
    // Loose validation: just need an object to run migrations on
    if (typeof rawParsed !== 'object' || rawParsed === null) return null;
    
    const migrated = migrate(rawParsed);
    
    // Strict validation after migration
    const result = AppStorageSchema.safeParse(migrated);
    if (!result.success) {
      console.error('Storage validation failed after migration:', result.error);
      return null;
    }
    
    return result.data;
  } catch {
    return null;
  }
}
```

## Acceptance Criteria

- [ ] `migrate()` is called before `AppStorageSchema.parse()`
- [ ] A v0 storage blob with missing fields can be migrated and then validated without data loss
- [ ] Invalid/corrupted JSON still returns null gracefully
- [ ] Existing v1 → v1 path still works (no regression)
