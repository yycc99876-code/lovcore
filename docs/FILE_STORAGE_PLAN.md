# File Storage Migration Plan - IndexedDB -> Supabase Storage

## Current State (Terminal 4 Audit)

All file blobs live in IndexedDB (`lovcore-files` database, `files` store).
File references use the `indexeddb://<key>` protocol. There is zero cloud persistence.

### Current File Lifecycle

```
User drops file
  -> ingestion.ts creates IngestDraft
    -> storeFile(key, blob) writes to IndexedDB
      -> makeFileRef(key) stored in Item.thumbnail / Item.originalFileRef / Item.previewPdfRef
        -> useFileUrl() hook resolves ref -> blob URL for display
          -> Card / DetailDrawer renders the blob
            -> (no cleanup on delete)
```

### IndexedDB Key Patterns

| File Type | Key | Ref stored in |
|-----------|-----|---------------|
| Image original | `{itemId}` | `Item.thumbnail` |
| PDF original | `{itemId}-pdf` | `Item.originalFileRef` |
| PDF thumbnail | `{itemId}-thumb` | `Item.thumbnail` |
| Office original | `{itemId}-original` | `Item.originalFileRef` |
| Office->PDF preview | `{itemId}-preview-pdf` | `Item.previewPdfRef` |
| Office thumb | `{itemId}-thumb` | `Item.thumbnail` |
| DOCX original | `{itemId}-docx` | `Item.originalFileRef` |

### Current Problems

1. **IndexedDB is the only storage** - clear browser data = lose all files permanently
2. **No cross-device sync** - files cannot migrate between devices or browsers
3. **No file cleanup on card deletion** - orphaned blobs accumulate in IndexedDB
4. **LibreOffice conversion is local-only** - `api/files/convert-office.ts` calls `soffice.exe` on the host machine, cannot run on Vercel/serverless
5. **No upload progress or retry** - files go directly to IndexedDB with no error recovery
6. **Preview PDFs are local-only** - cannot share or restore previews across devices
7. **`files` table exists in schema but is never written to** - dead code

---

## Target Architecture

### Supabase Storage Bucket Design

**Single private bucket: `lovcore-files`**

Why one bucket (not multiple):
- Simpler RLS policies - one set of rules covers all file types
- Easier lifecycle management - single bucket for cleanup scripts
- Supabase Storage paths provide the logical separation

### Storage Path Format

```
lovcore-files/
  users/{userId}/
    cards/{cardId}/
      original/{filename}          <- uploaded file (image, PDF, DOCX, etc.)
      preview/
        preview.pdf                <- Office->PDF conversion result
        page_{n}.png               <- (future) pre-rendered PDF page images
      thumb/
        thumb.png                  <- thumbnail image
    temp/
      {uploadId}/{filename}        <- (future) chunked upload assembly
```

Examples:
```
users/abc123/cards/def456/original/report.docx
users/abc123/cards/def456/preview/preview.pdf
users/abc123/cards/def456/thumb/thumb.png
users/abc123/cards/ghi789/original/photo.jpg
```

### `files` Table Schema (already exists, needs extension)

Current columns are sufficient for MVP. Future additions:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (FK -> auth.users) |
| `card_id` | TEXT | Associated card (FK -> cards.id) |
| `storage_path` | TEXT | Supabase Storage path |
| `file_role` | TEXT | `'original'`, `'preview'`, `'thumb'` (NEW - needed to distinguish file types within a card) |
| `original_name` | TEXT | Original filename |
| `mime_type` | TEXT | e.g. `image/png`, `application/pdf` |
| `size` | BIGINT | File size in bytes |
| `width` | INTEGER | Image/video width |
| `height` | INTEGER | Image/video height |
| `duration` | NUMERIC | Audio/video duration |
| `created_at` | TIMESTAMPTZ | Creation time |

The `file_role` column is the key addition - it lets you query "give me the thumbnail for card X" without parsing storage paths.

### How Each File Type Is Stored

#### Images
1. Upload original to `users/{uid}/cards/{cid}/original/{filename}`
2. Generate thumbnail client-side (canvas resize) -> upload to `users/{uid}/cards/{cid}/thumb/thumb.png`
3. Write 2 rows to `files` table: one `file_role='original'`, one `file_role='thumb'`
4. Store Supabase Storage paths in `Item.thumbnail` and `Item.originalFileRef`

#### PDFs
1. Upload original to `users/{uid}/cards/{cid}/original/{filename}`
2. Render first page -> upload to `users/{uid}/cards/{cid}/thumb/thumb.png`
3. Write 2 rows to `files` table
4. For detail view: fetch original from Storage on demand (or use cached IndexedDB copy)

#### DOCX/PPTX/XLSX (Office files)
1. Upload original to `users/{uid}/cards/{cid}/original/{filename}`
2. Send to conversion worker (see below) -> get PDF back
3. Upload PDF to `users/{uid}/cards/{cid}/preview/preview.pdf`
4. Render first page of PDF -> upload to `users/{uid}/cards/{cid}/thumb/thumb.png`
5. Write 3 rows to `files` table: `original`, `preview`, `thumb`

#### TXT/MD
1. No file upload needed (content is in `cards.content`)
2. Generate text thumbnail -> upload to `users/{uid}/cards/{cid}/thumb/thumb.png`
3. Write 1 row to `files` table: `thumb` only

### Card Deletion - File Cleanup

When a card is deleted:

1. **Query `files` table** for all rows with `card_id = deletedCardId`
2. **Delete from Supabase Storage**: call `supabase.storage.from('lovcore-files').remove(storagePaths)`
3. **Delete `files` rows**: cascade or explicit delete
4. **Clean IndexedDB cache**: delete local blobs for that card

Implementation: a `deleteCardFiles(userId, cardId)` function that does all three steps.

The `ON DELETE SET NULL` on `files.card_id` means we should NOT rely on cascade - explicit cleanup is required.

### Cross-Device Recovery

When a user opens Lovcore on a new device:

1. **On login/space load**: query `files` table for user's cards
2. **For thumbnails**: fetch signed URLs from Storage, cache in IndexedDB
3. **For originals/preview PDFs**: fetch on demand (lazy) when detail view opens
4. **IndexedDB becomes a cache**: populated from Storage, not the source of truth

Resolution priority for `useFileUrl()`:
1. Check IndexedDB cache (fast, offline-capable)
2. If miss -> fetch signed URL from Supabase Storage
3. Cache the result in IndexedDB for next time

### IndexedDB as Cache (Not Source of Truth)

Current: IndexedDB is the only store.
Target: IndexedDB is an LRU cache backed by Supabase Storage.

- On upload: write to Storage first, then cache in IndexedDB
- On read: check IndexedDB first, fall back to Storage
- On device switch: populate IndexedDB from Storage metadata
- Cache eviction: remove blobs not accessed in 30 days (future)

### DOCX/PPTX Conversion - Migration to Cloud Worker

Current flow (local only):
```
ingestion.ts -> POST /api/files/convert-office -> soffice.exe -> PDF base64 -> back to client
```

This only works when LibreOffice is installed on the machine running the API.

**Phase 1 (near-term): Serverless LibreOffice**
- Use a Docker image with LibreOffice on a cloud worker (e.g. Vercel Serverless, Railway, Fly.io)
- Same API contract: send file base64, receive PDF base64
- Worker uploads result directly to Supabase Storage

**Phase 2 (future): Dedicated conversion service**
- Queue-based: submit job -> poll for result
- Supports larger files (no base64 in request body)
- Can pre-render page images server-side
- Uses `ingestion_jobs` table for status tracking

Migration path:
1. Keep current `convert-office.ts` for local dev
2. Add `CLOUD_CONVERT_URL` env var - when set, send to cloud worker instead
3. Cloud worker writes PDF to Storage, returns `storage_path`
4. Client stores `storage_path` in `previewPdfRef` instead of IndexedDB key

---

## Implementation Phases

### Phase 1: Foundation (Terminal 4 - this PR)
- [x] Audit current file lifecycle
- [x] Create `cloudFileStore.ts` with function skeletons
- [x] Create this design document
- No changes to `ingestion.ts`, `useCards.ts`, or UI

### Phase 2: Wire Up (after Terminal 3 completes)
- [ ] Add `file_role` column to `files` table in schema.sql
- [ ] In `ingestion.ts`: after IndexedDB store, also call `uploadCardFile()` / `uploadCardPreview()` / `uploadCardThumbnail()`
- [ ] In `useCards.ts` delete handler: call `deleteCardFiles()` for cloud cleanup
- [ ] Update `useFileUrl()` to check Storage signed URLs as fallback

### Phase 3: Storage as Primary
- [ ] On card load: populate IndexedDB cache from Storage if local cache is empty
- [ ] `files` table becomes the source of truth for file metadata
- [ ] Add `file_role` to `FileRow` type

### Phase 4: Cloud Conversion
- [ ] Deploy LibreOffice conversion as a cloud worker
- [ ] Add `CLOUD_CONVERT_URL` config
- [ ] Worker writes preview PDF to Storage
- [ ] Remove base64 round-trip for large files

### Phase 5: Cleanup & Optimization
- [ ] IndexedDB cache eviction (LRU, 30-day TTL)
- [ ] Upload progress tracking
- [ ] Retry logic for failed uploads
- [ ] Batch signed URL fetching for grid view

---

## Key Constraints

- **Terminal 3 owns**: `useCards.ts`, `supabaseMappers.ts`, `database.ts` - do not modify
- **Auth dependency**: All Storage paths include `userId` - requires auth to be wired
- **Bucket creation**: Must be done via Supabase Dashboard or API, not SQL
- **File size limits**: Supabase Storage free tier = 1GB total, 50MB per file
