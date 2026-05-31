# Lovcore Supabase Data Layer Design

Status: **Planning** (not yet implemented)

## Overview

This directory contains the backend data layer design for migrating Lovcore from localStorage + IndexedDB to Supabase (PostgreSQL + Auth + Storage). These are design documents only — no production code is modified.

## Files

| File | Description |
|------|-------------|
| `schema.sql` | Full PostgreSQL migration: tables, indexes, triggers |
| `rls-policies.sql` | Row Level Security policies for multi-tenant isolation |
| `storage.sql` | Supabase Storage bucket setup and access policies |
| `types.ts` | TypeScript type definitions matching the database schema |
| `api-contract.md` | CRUD operation signatures and data flow |
| `migration-plan.md` | Step-by-step plan for localStorage/IndexedDB → Supabase |

## Current Data Model (localStorage)

```
lovcore_items     → Item[] stored as JSON string in localStorage
lovcore_spaces    → LovcoreSpace[] stored as JSON string in localStorage
lovcore-files     → File blobs stored in IndexedDB (images, PDFs)
lovcore_has_entered → boolean flag in localStorage (vault gate)
```

## Target Data Model (Supabase)

```
auth.users        → Supabase Auth (email/password + Google OAuth)
public.cards      → cards table (replaces lovcore_items)
public.spaces     → spaces table (replaces lovcore_spaces)
storage.files     → File blobs (replaces IndexedDB)
```

## Key Design Decisions

1. **UUID primary keys** — Supabase uses UUID; existing `Date.now().toString()` IDs will be migrated as-is (TEXT type)
2. **RLS isolation** — Every table has `user_id UUID REFERENCES auth.users(id)` with per-user policies
3. **camelCase in app, snake_case in DB** — Mapping layer handles conversion
4. **JSONB for body** — `LovcoreDocumentBody` (Tiptap JSON) stored as JSONB column
5. **Array columns for tags** — PostgreSQL native `TEXT[]` with GIN index
6. **Signed URLs for files** — Supabase Storage signed URLs replace IndexedDB blob URLs
