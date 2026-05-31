# Lovcore: localStorage/IndexedDB → Supabase Migration Plan

Status: **Planning** (not yet implemented)

## Current State

| Data | Storage | Key/Location | Format |
|------|---------|-------------|--------|
| Cards | `localStorage` | `lovcore_items` | JSON string (`Item[]`) |
| Spaces | `localStorage` | `lovcore_spaces` | JSON string (`LovcoreSpace[]`) |
| Files (images, PDFs) | `IndexedDB` | DB: `lovcore-files`, Store: `files` | Blob, keyed by card ID |
| Vault gate | `localStorage` | `lovcore_has_entered` | `"true"` string |
| Theme | `localStorage` | `lovcore_theme` | `"dark"` / `"light"` |
| Locale | `localStorage` | `lovcore_locale` | `"en"` / `"zh"` |
| Data version | `localStorage` | `lovcore_items_version` | Version string |

## Target State

| Data | Storage | Access Method |
|------|---------|--------------|
| Cards | PostgreSQL (`public.cards`) | Supabase client → RLS filtered |
| Spaces | PostgreSQL (`public.spaces`) | Supabase client → RLS filtered |
| Files | Supabase Storage (`files` bucket) | Signed URLs (1hr expiry) |
| Auth | Supabase Auth | JWT session (replaces vault gate) |
| Theme | `localStorage` (keep as-is) | No change needed |
| Locale | `localStorage` (keep as-is) | No change needed |

---

## Migration Strategy: Parallel Run

Do NOT switch cold-turkey. Run localStorage and Supabase in parallel with a feature flag.

### Phase 0: Feature Flag

```typescript
// src/config.ts
export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';
```

When `false` (default): app behaves exactly as today.
When `true`: hooks read/write Supabase instead of localStorage.

This lets you develop and test the Supabase path without breaking the existing experience.

---

### Phase 1: Auth Layer (Non-Breaking)

**What changes:**
- Add Supabase client initialization
- Add `useAuth` hook (runs alongside `useVaultGate`)
- Login page gains email/password + Google OAuth options

**What doesn't change:**
- `useVaultGate` still works when `USE_SUPABASE=false`
- All data operations still use localStorage
- No data migration needed yet

**New files (additive only):**
```
src/lib/supabase/client.ts     — Browser Supabase client
src/lib/supabase/server.ts     — Server Supabase client (for API routes)
src/hooks/useAuth.ts           — Auth hook (signIn, signUp, signOut, user state)
```

**Modified files:**
```
src/components/LandingPage.tsx — Add email/password form + Google OAuth button
src/App.tsx                    — Wire useAuth when USE_SUPABASE=true
```

---

### Phase 2: Data Layer (Parallel Read, Single Write)

**What changes:**
- `useCards` reads from Supabase when `USE_SUPABASE=true`
- New cards are written to BOTH localStorage and Supabase
- `useSpaces` same pattern

**This ensures:**
- If Supabase write fails, localStorage still has the data
- You can switch back to `USE_SUPABASE=false` at any time
- Data exists in both places during transition

**Modified files:**
```
src/hooks/useCards.ts   — Branch on USE_SUPABASE for read/write
src/hooks/useSpaces.ts  — Same pattern
src/lib/fileStore.ts    — Branch: IndexedDB vs Supabase Storage
```

---

### Phase 3: Data Migration (One-Time)

**Goal:** Move existing localStorage data into Supabase for the current user.

**Trigger:** First login after enabling Supabase. Run once, then skip.

```typescript
async function migrateLocalDataToSupabase(userId: string) {
  const flag = localStorage.getItem('lovcore_migrated_to_supabase');
  if (flag === 'true') return;

  // 1. Migrate cards
  const localCards = JSON.parse(localStorage.getItem('lovcore_items') || '[]');
  for (const card of localCards) {
    const row = mapCardToCardRow(card, userId);
    await supabase.from('cards').upsert(row);
  }

  // 2. Migrate spaces
  const localSpaces = JSON.parse(localStorage.getItem('lovcore_spaces') || '[]');
  for (const space of localSpaces) {
    const row = mapSpaceToSpaceRow(space, userId);
    await supabase.from('spaces').upsert(row);
  }

  // 3. Migrate files (IndexedDB → Supabase Storage)
  const db = await openIndexedDB();
  const tx = db.transaction('files', 'readonly');
  const store = tx.objectStore('files');
  const keys = await getAllKeys(store);

  for (const key of keys) {
    const blob = await getBlob(store, key);
    if (blob) {
      const file = new File([blob], key, { type: blob.type });
      await supabase.storage.from('files').upload(`${userId}/${key}`, file, { upsert: true });
    }
  }

  // 4. Mark migration complete
  localStorage.setItem('lovcore_migrated_to_supabase', 'true');
}
```

**Safety:**
- Upsert (not insert) — running twice won't create duplicates
- localStorage data is NOT deleted — it stays as backup
- If migration fails partway, re-running picks up where it left off

---

### Phase 4: Supabase-Only (Remove localStorage)

**When:** After confirming Supabase works reliably for 1-2 weeks.

**What changes:**
- `USE_SUPABASE` defaults to `true`
- Remove localStorage read/write branches from hooks
- Remove `storage.ts` (localStorage persistence)
- Remove IndexedDB logic from `fileStore.ts`
- Remove `useVaultGate.ts` (replaced by `useAuth`)
- Remove `lovcore_items_version` / `lovcore_spaces_version` version checks

**What stays:**
- `localStorage` for theme and locale (these are client-only preferences, no need for Supabase)
- `mockData.ts` — still used for seeding default spaces and demo data

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Supabase downtime | Feature flag lets users switch back to localStorage |
| Data loss during migration | localStorage preserved as backup; migration is upsert-based |
| RLS misconfiguration | Test with `set_config('request.jwt.claims', ...)` in SQL Editor |
| Auth confusion (vault vs email) | Phase 1 runs both systems; vault gate remains until Phase 4 |
| File URL expiry (signed URLs) | `useFileUrl` hook re-fetches on 401/expiry; cache in memory |
| Offline usage | Supabase client has no offline mode; consider adding IndexedDB cache later |

---

## Rollback Plan

At any phase, set `VITE_USE_SUPABASE=false` to revert to localStorage behavior. Data in Supabase is preserved and can be re-synced later.

To fully rollback:
1. Set env var `VITE_USE_SUPABASE=false`
2. App reverts to localStorage
3. Supabase data remains intact (can be re-enabled later)
4. No data loss — localStorage was never deleted

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|-------------|
| Phase 0: Feature flag | 1 hour | None |
| Phase 1: Auth layer | 1-2 days | Supabase project created, schema deployed |
| Phase 2: Data layer | 2-3 days | Phase 1 complete |
| Phase 3: Data migration | 1 day | Phase 2 tested |
| Phase 4: Supabase-only | 1 day | Phase 3 verified in production |

**Total: ~1-2 weeks** of focused work, with Phase 1 being the critical path.
