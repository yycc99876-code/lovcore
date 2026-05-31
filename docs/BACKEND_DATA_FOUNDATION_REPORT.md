# Lovcore Backend Data Foundation Report

Date: 2026-05-24

## 1. What Was Completed

This task established the backend data foundation for Lovcore's future Supabase integration. All deliverables are documentation, schema, types, and tooling — nothing is wired into the live UI.

- Audited the complete current data model (localStorage + IndexedDB)
- Designed a 9-table Supabase PostgreSQL schema
- Wrote Row Level Security policies for all tables
- Created TypeScript type definitions matching the schema
- Defined a complete REST API contract with 18 endpoints
- Built a localStorage-to-Supabase migration tool
- Generated 24 mock cards + 8 spaces as seed data

## 2. Files Created/Modified

### New files:
| File | Purpose |
|---|---|
| `docs/DATA_MODEL_AUDIT.md` | Audit of current frontend data structures |
| `docs/supabase/schema.sql` | Extended Supabase schema (9 tables) |
| `docs/supabase/rls.sql` | Row Level Security policies |
| `docs/API_CONTRACT.md` | REST API contract (18 endpoints) |
| `src/types/database.ts` | TypeScript types for Supabase tables |
| `scripts/export-local-vault.ts` | localStorage migration tool |
| `docs/seed/lovcore-demo-vault.json` | Mock seed data (24 cards, 8 spaces) |
| `docs/BACKEND_DATA_FOUNDATION_REPORT.md` | This report |

### Pre-existing files (unchanged):
| File | Note |
|---|---|
| `docs/supabase/api-contract.md` | Supabase client examples (kept as-is, complementary) |
| `docs/supabase/types.ts` | Original DB types (kept, database.ts is the new canonical version) |

## 3. Data Model Summary

Current frontend stores everything in:
- `localStorage["lovcore_items"]` — `LovcoreCard[]` array
- `localStorage["lovcore_spaces"]` — `LovcoreSpace[]` array
- IndexedDB `lovcore-files` — file blobs keyed by item ID

**Stable fields** that should migrate to DB: `id`, `type`, `title`, `content`, `body`, `summary`, `sourceUrl`, `tags`, `thumbnail`, `colorPalette`, `createdAt`

**Ephemeral fields** that should NOT be in DB: `status: 'uploading'|'analyzing'` (only `ready`/`failed` persist), ghost autocomplete state, ghost correction state, voice capture state

## 4. Supabase Table Design

| Table | Purpose | Primary Key |
|---|---|---|
| `profiles` | User profile (mirrors auth.users) | `uuid` |
| `cards` | Card metadata (replaces localStorage items) | `text` (existing IDs) |
| `card_bodies` | Rich content (Tiptap JSON, plain text, HTML) | `text` (FK to cards) |
| `spaces` | Space definitions (replaces localStorage spaces) | `text` (existing IDs) |
| `space_cards` | Many-to-many card-to-space mapping | composite |
| `files` | File metadata (replaces IndexedDB) | `uuid` |
| `ai_events` | AI API call log | `uuid` |
| `ingestion_jobs` | Async processing job tracking | `uuid` |
| `user_settings` | Per-user preferences | `uuid` (FK to auth.users) |

All tables have `user_id` foreign key to `auth.users` with `ON DELETE CASCADE`.

## 5. RLS Protection

Every table has RLS enabled. All policies enforce `auth.uid() = user_id` for CRUD operations. Key constraints:
- `spaces.delete` is blocked for `system = true` rows
- `space_cards` validates ownership through `user_id`
- `ai_events` is append-only (no UPDATE/DELETE policies)
- Storage bucket policies require path prefix matching `user_id`

All policies are MVP (single-user isolation). Post-MVP enhancements: shared spaces, team access, admin analytics.

## 6. API Contract Summary

18 endpoints across 4 resource groups:

**Cards** (5): GET list, POST create, GET by ID, PATCH update, DELETE
**Spaces** (6): GET list, POST create, PATCH update, DELETE, POST add card, DELETE remove card
**Files** (3): POST upload, GET metadata+signed URL, DELETE
**AI** (6): POST autocomplete, ghost-correct, rewrite, transcribe, summarize, analyze-card

AI endpoints write to `ai_events` table. Rate limits on create/AI endpoints.

## 7. Migration Tool Usage

**Important:** All exported rows include `user_id` which is required by the Supabase schema. You must provide your Supabase auth user UUID via `--user-id`.

```bash
# Step 1: Export from browser console
# Open DevTools > Console, paste:
const data = {
  items: JSON.parse(localStorage.getItem('lovcore_items') || '[]'),
  itemVersion: localStorage.getItem('lovcore_items_version'),
  spaces: JSON.parse(localStorage.getItem('lovcore_spaces') || '[]'),
  spaceVersion: localStorage.getItem('lovcore_spaces_version'),
};
copy(JSON.stringify(data, null, 2));

# Step 2: Save pasted content to a file, e.g. vault-export.json

# Step 3: Run the migration script (user-id is REQUIRED)
npx tsx scripts/export-local-vault.ts ./vault-export.json ./exported-vault --user-id <your-supabase-user-uuid>

# Step 4: Import NDJSON files into Supabase via Dashboard > Table Editor > Import
```

Output: `cards.json`, `card_bodies.json`, `spaces.json`, `space_cards.json`, `files_manifest.json`

Note: IndexedDB blobs (file uploads) must be exported separately from browser DevTools.

## 7b. Schema Executability

The `docs/supabase/schema.sql` file is designed to run as a single script on an empty Supabase project. The shared trigger function `public.handle_updated_at()` is defined before any table or trigger that references it. Execution order:

1. `CREATE EXTENSION` (uuid-ossp)
2. `CREATE FUNCTION handle_updated_at()`
3. All `CREATE TABLE` statements (with foreign keys to `auth.users`)
4. All `CREATE TRIGGER` statements
5. All `CREATE INDEX` statements
6. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

After `schema.sql`, run `rls.sql` to create the RLS policies. Both files can be pasted into the Supabase SQL Editor and executed top-to-bottom.

## 8. Why Not Connected to UI Yet

- The current localStorage flow is stable and working for MVP
- Supabase integration requires: auth setup, client initialization, hook migration, optimistic UI patterns, error handling, offline fallback
- Connecting prematurely would break the working app before the backend is tested
- This foundation allows the schema and types to be reviewed and iterated before wiring

## 9. Next Steps to Actually Connect Supabase

1. **Auth**: Set up Supabase project, enable auth providers, create `profiles` trigger
2. **Client**: Install `@supabase/supabase-js`, create client singleton in `src/lib/supabase.ts`
3. **Hooks**: Create `useSupabaseCards` and `useSupabaseSpaces` hooks that wrap Supabase client calls
4. **Migration**: Run `schema.sql` and `rls.sql` in Supabase SQL Editor
5. **Seed**: Import demo vault data
6. **Dual-mode**: Add feature flag to switch between localStorage and Supabase hooks
7. **File storage**: Migrate from IndexedDB to Supabase Storage
8. **Optimistic UI**: Implement rollback patterns for failed writes
9. **Testing**: Test RLS policies, auth flows, offline behavior

## 10. Review Priorities

Focus your review on:

1. **`docs/supabase/schema.sql`** — Are the table relationships correct? Is the `card_bodies` separation worth the JOIN cost? Should `meta` JSONB replace the dedicated `key_claims`/`why_it_matters` columns?
2. **`src/types/database.ts`** — Do the Insert/Update types make sense? Should `CardRow.id` be UUID instead of TEXT (requires migration)?
3. **`docs/API_CONTRACT.md`** — Are the rate limits reasonable? Is the error shape sufficient?
4. **`scripts/export-local-vault.ts`** — Does it handle edge cases in your localStorage data?
5. **Card types** — The schema adds `quote`, `code`, `audio` types not in the current frontend. Intentional extension or premature?
