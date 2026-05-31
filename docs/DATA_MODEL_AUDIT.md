# Lovcore Data Model Audit

Date: 2026-05-24

## 1. Current Frontend Data Structures

### 1.1 LovcoreCard (`src/types.ts`)

The primary data entity. Stored as `Item[]` in localStorage key `lovcore_items`.

| Field | Type | DB-ready? | Notes |
|---|---|---|---|
| `id` | `string` | Yes | Currently `Date.now().toString()` — will need UUID migration |
| `type` | `LovcoreCardType` | Yes | `'image' \| 'link' \| 'article' \| 'note' \| 'pdf' \| 'video'` |
| `title` | `string` | Yes | Stable field |
| `content` | `string` | Yes | Plain text, primary searchable body |
| `body` | `LovcoreDocumentBody?` | Yes | Tiptap JSON + text + html, stored as JSONB |
| `summary` | `string` | Yes | AI-generated summary |
| `sourceUrl` | `string?` | Yes | Original URL for link/article types |
| `fileSize` | `string?` | Yes | Display string like "1.2 MB" |
| `pageCount` | `number?` | Yes | PDF page count |
| `duration` | `string?` | Yes | Video duration string |
| `thumbnail` | `string?` | Yes | URL or `indexeddb://` ref — needs migration to Supabase Storage |
| `colorPalette` | `string[]?` | Yes | Hex color array for image cards |
| `tags` | `string[]` | Yes | Semantic tags |
| `status` | `IngestionStatus` | Yes | Transient — `'uploading' \| 'analyzing' \| 'ready' \| 'failed'` |
| `createdAt` | `string` | Yes | ISO timestamp |
| `noteBgColor` | `string?` | Yes | Custom note background color |
| `keyClaims` | `string[]?` | Yes | AI-extracted claims |
| `whyItMatters` | `string?` | Yes | AI-generated context |

### 1.2 LovcoreSpace (`src/types.ts`)

Stored as `LovcoreSpace[]` in localStorage key `lovcore_spaces`.

| Field | Type | DB-ready? | Notes |
|---|---|---|---|
| `id` | `string` | Yes | Format: `space-all`, `space-keynotes`, `user-space-<ts>` |
| `name` | `string` | Yes | Display name |
| `type` | `'default' \| 'smart'` | Yes | Space type |
| `system` | `boolean?` | Yes | Built-in space flag |
| `color` | `string?` | Yes | Hex color |
| `description` | `string?` | Yes | Space description |
| `query` | `string?` | Yes | Smart space search query |
| `selectedType` | `CardTypeFilter?` | Yes | Type filter for smart space |
| `tags` | `string[]?` | Yes | Tag filter for smart space |
| `createdAt` | `string` | Yes | ISO timestamp |
| `updatedAt` | `string` | Yes | ISO timestamp |

### 1.3 LovcoreDocumentBody (`src/types.ts`)

Stored as JSONB inside `cards.body`.

| Field | Type | Notes |
|---|---|---|
| `kind` | `'tiptap'` | Always `'tiptap'` |
| `json` | `any` | Tiptap ProseMirror JSON document tree |
| `text` | `string` | Plain text extracted from editor |
| `html?` | `string` | Rendered HTML |

### 1.4 File Storage (`src/lib/fileStore.ts`)

IndexedDB database `lovcore-files`, store `files`. Key = item ID, value = Blob.

Reference convention: `thumbnail` field stores `indexeddb://<itemId>` which resolves to the Blob.

### 1.5 AI Metadata

AI metadata is stored directly on the card object:
- `summary` — populated by ingestion resolvers
- `keyClaims` — populated by ingestion resolvers (mock)
- `whyItMatters` — populated by ingestion resolvers (mock)
- `colorPalette` — populated by image analysis
- `tags` — populated by ingestion + user edits

Ghost autocomplete, ghost correction, and rewrite are **ephemeral** — they operate within the Tiptap editor session and are NOT persisted on cards. Accepted changes flow into `body.json` / `body.text` / `body.html`.

---

## 2. Classification: What Goes Into the Database

### Stable Fields (should be in DB)
- `id`, `type`, `title`, `content`, `body`, `summary`
- `sourceUrl`, `fileSize`, `pageCount`, `duration`
- `thumbnail` (migrated to Supabase Storage path)
- `colorPalette`, `tags`, `noteBgColor`
- `keyClaims`, `whyItMatters`
- `createdAt`

### Fields That Should NOT Be in DB
- `status: 'uploading' | 'analyzing'` — transient UI state, only `'ready'` and `'failed'` are persisted
- Ghost autocomplete state (`GhostAutocompleteState`) — ephemeral editor session
- Ghost correction state (`GhostCorrectionState`) — ephemeral editor session
- Voice capture state (`VoiceState`) — ephemeral recording session
- `lovcore_items_version` / `lovcore_spaces_version` — localStorage migration markers, not needed with DB

### New DB-only Fields (not in current frontend)
- `user_id` — auth ownership
- `updated_at` — change tracking
- `embedding` — reserved for pgvector (future)
- `plain_text` — denormalized for full-text search (can derive from `body.text`)

---

## 3. localStorage Keys Summary

| Key | Shape | Module |
|---|---|---|
| `lovcore_items` | `Item[]` (JSON) | `src/lib/storage.ts` |
| `lovcore_items_version` | `string` (currently `"phase7-resume-fix"`) | `src/lib/storage.ts` |
| `lovcore_spaces` | `LovcoreSpace[]` (JSON) | `src/hooks/useSpaces.ts` |
| `lovcore_spaces_version` | `string` (currently `"phase2-main-views"`) | `src/hooks/useSpaces.ts` |

## 4. IndexedDB Summary

| Database | Store | Key | Value | Module |
|---|---|---|---|---|
| `lovcore-files` (v1) | `files` | Item ID | `Blob` | `src/lib/fileStore.ts` |
