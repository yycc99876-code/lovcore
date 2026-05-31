# Lovcore QA Current State Report

Date: 2026-05-25  
Scope: current product QA pass only. No product code changes were made in this pass.  
Constraint: another terminal is working on Supabase Auth and user data isolation, so this report intentionally does not modify `AuthProvider`, `useCards`, `App`, `schema.sql`, or `rls.sql`.

## 1. Verification Result

| Check | Result | Notes |
| --- | --- | --- |
| `npm run build` | PASS | TypeScript and Vite build completed. Vite still reports a large JS chunk warning. |
| `npx vitest run` | PASS | 6 test files / 42 tests passed. |
| Code inspection | COMPLETE | Reviewed upload, preview, AI editor, voice, search, Spaces, and Supabase mapping paths. |

Current automated coverage is still narrow. Existing tests cover AI client request wrappers, ErrorBoundary, slash command filtering, fileStore, local storage, and a small part of ingestion. They do not yet cover the real browser flows for upload -> preview -> detail drawer -> reload, nor Auth + Supabase persistence.

## 2. Feature Status

| Feature | Current status | Main files |
| --- | --- | --- |
| Image upload | Usable locally, cloud persistence risky | `src/lib/ingestion.ts`, `src/lib/fileStore.ts`, `src/hooks/useCards.ts` |
| PDF upload and preview | Usable locally, large-file risk | `src/lib/documentExtraction.ts`, `src/components/DocumentA4Page.tsx`, `src/components/ContentCard.tsx` |
| DOCX upload and preview | Half usable | `src/lib/ingestion.ts`, `api/files/convert-office.ts`, `src/lib/documentExtraction.ts` |
| PPTX upload and landscape preview | Half usable | `src/lib/ingestion.ts`, `api/files/convert-office.ts`, `src/components/DocumentA4Page.tsx`, `src/index.css` |
| Link save | Usable | `src/lib/ingestion.ts`, `api/ai/scrape-url.ts`, `api/ai/analyze-card.ts` |
| Quick Note | Usable locally, Supabase reload risky | `src/components/QuickNoteCard.tsx`, `src/components/DetailDrawer.tsx`, `src/hooks/useCards.ts`, `src/lib/supabaseMappers.ts` |
| Ghost completion | Usable, needs failure visibility | `src/hooks/useGhostAutocomplete.ts`, `api/ai/autocomplete.ts`, `src/components/ghost/GhostOverlay.tsx` |
| Ghost correction | Usable, needs failure visibility | `src/hooks/useGhostCorrection.ts`, `api/ai/ghost-correct.ts`, `src/services/editor/ghostCorrectionScanner.ts` |
| Inline rewrite | Usable, stale-selection risk | `src/components/editor/InlineAICommand.tsx`, `api/ai/rewrite.ts` |
| Voice transcription | Half usable | `src/hooks/useVoiceCapture.ts`, `src/services/editor/voiceRecorder.ts`, `api/ai/realtime-asr-proxy.ts`, `api/ai/transcribe.ts` |
| Search / semantic search | Usable locally, Supabase persistence gap | `src/hooks/useSearch.ts`, `src/lib/semanticSearch.ts`, `src/lib/ingestion.ts`, `src/lib/supabaseMappers.ts` |
| Spaces / Smart Spaces | Half usable | `src/hooks/useSpaces.ts`, `src/components/CreateSpaceModal.tsx`, `src/lib/supabaseMappers.ts`, `docs/supabase/schema.sql` |

## 3. What Is Usable Now

Image upload works in the current browser session. Files are stored in IndexedDB, thumbnails are generated, and AI enrichment can produce title, summary, tags, suggested spaces, and embeddings.

PDF upload and preview are usable locally. The Stack card can show a first-page preview, and the detail view can render pages through `pdfjs-dist`. The current implementation caps rendered detail pages, which is good for performance but means very long PDFs are not fully rendered.

DOCX and PPTX preview are usable only when the local/server environment can convert Office files to PDF. The current dev implementation relies on LibreOffice through `api/files/convert-office.ts`. That improves visual fidelity, but it is not yet a production-ready online architecture.

Link saving is usable. URL detection, metadata scraping, and AI enrichment are wired. The recent protection that prevents AI from rewriting link titles is the right behavior for X/Twitter, articles, and bookmark titles.

Quick Note is usable in local state. The TipTap editor opens, saves plain text, and the detail drawer can keep editing when the rich body exists in memory.

Ghost completion, ghost correction, and inline rewrite are wired to AI endpoints and are usable. The shortcut routing correctly gives priority to slash commands, voice, ghost suggestions, and rewrite actions.

Search and Smart Spaces are functional in local mode. Keyword matching, semantic reranking, type filters, tag filters, and Smart Space semantic queries are all connected at code level.

## 4. Half-Usable Areas

DOCX/PPTX preview is half-usable because the best path depends on LibreOffice. This is fine for local development, but online users will not have LibreOffice installed. Production needs a server-side conversion worker or hosted conversion service.

Voice transcription is half-usable. The final transcription path can work, but realtime display depends on `api/ai/realtime-asr-proxy.ts` and WebSocket behavior in the dev server. This area has already shown repeated UX issues: the bottom voice dock may not receive live partial text, and error states are not visible enough.

Supabase persistence is half-usable. `useCards.ts` and `useSpaces.ts` can read/write rows, but several important fields are not persisted or restored through `src/lib/supabaseMappers.ts`.

Spaces are half-usable with Supabase. The UI and local mode work, but default space seeding uses fixed IDs like `space-all`, which conflicts with the current schema if multiple users insert the same default spaces.

Semantic search is half-usable in cloud mode. Embeddings are generated during ingestion, but `cardToDb` does not persist `item.embedding`, and `dbToCard` does not restore it. After reload, semantic search degrades.

## 5. Clear Risks

### 5.1 Files Are Still Local-Only

`src/lib/ingestion.ts` stores uploaded file blobs and converted previews in IndexedDB through `src/lib/fileStore.ts`. In Supabase mode, `src/hooks/useCards.ts` writes metadata to the `cards` table, but file blobs are not uploaded to Supabase Storage or the `files` table. This means:

- clearing browser data loses uploaded files;
- another device cannot preview the same file;
- authenticated cloud mode can show metadata without the actual preview asset.

### 5.2 Supabase Mapper Drops Important Fields

`src/lib/supabaseMappers.ts` currently does not persist or restore several fields that the product depends on:

- `body` / TipTap JSON / HTML / plain text for rich Quick Notes;
- `embedding` for semantic search;
- `fileExtension`, `mimeType`, `originalFileRef`, `previewPdfRef` for document previews;
- file asset metadata that should connect to `docs/supabase/schema.sql` `files`;
- `card_bodies` table is defined but not used by the current frontend flow.

This is the biggest risk for "works before reload, breaks after reload".

### 5.3 Default Space IDs Conflict Across Users

`src/hooks/useSpaces.ts` seeds default spaces with fixed IDs from `src/data/spaces.ts`. `docs/supabase/schema.sql` defines `spaces.id` as a global primary key. If user A inserts `space-all`, user B cannot insert another `space-all`.

This must be fixed before real multi-user launch. Either make IDs user-scoped, generate per-user default IDs, or change schema uniqueness to support `(user_id, slug)` style constraints.

### 5.4 App-Level Auth Gate Can Hide Local Mode

`src/App.tsx` gates the main app behind `isAuthenticated = !!user`. The hooks still support localStorage fallback, but if the app requires Supabase Auth before entering, local mode may no longer be reachable unless the landing/auth flow explicitly provides it.

This is likely to confuse development and early testing if Supabase env vars are missing or placeholder values are copied from `.env.example`.

### 5.5 Office Conversion Is Not Production-Ready

`api/files/convert-office.ts` relies on a local `soffice.exe` path or `LIBREOFFICE_PATH`. This is acceptable for local validation, but online deployment needs:

- a server/runtime that actually has LibreOffice installed;
- upload size limits;
- conversion timeout;
- job queue/retry;
- output cleanup;
- security isolation for untrusted documents.

### 5.6 Ingestion Can Leave Cards Stuck

`src/hooks/useCards.ts` runs `resolve(tempItem)` inside a delayed async callback without a surrounding `try/catch`. If a resolver throws, the optimistic card can remain in `analyzing` state. Some lower-level functions have fallbacks, but the top-level ingestion path still needs a final safety catch.

### 5.7 AI Failures Are Too Quiet

Several AI paths intentionally fail silently:

- ghost autocomplete returns empty text on failure;
- ghost correction returns no suggestions on failure;
- transcription fallback can return empty text;
- scrape URL can return empty metadata.

Silent fallback is good for not crashing, but the product needs subtle user-visible states when core actions fail.

## 6. Areas Easy To Break During Auth Refactor

`src/hooks/useCards.ts`: the current optimistic local state, IndexedDB file cleanup, Supabase writes, and localStorage fallback are tightly mixed. Auth changes can easily break uploads, reload behavior, and delete cleanup.

`src/hooks/useSpaces.ts`: default seeding, active space selection, localStorage fallback, and Supabase writes are mixed. The fixed default IDs are especially dangerous.

`src/lib/supabaseMappers.ts`: this file is now the main contract between product state and Supabase. Missing fields here will make features appear to work during one session and disappear after refresh.

`src/App.tsx`: app entry currently decides whether users see the landing/auth screen or the vault. Any change here affects whether local testing and unauthenticated fallback are possible.

`src/components/DetailDrawer.tsx`: editing title, tags, notes, assigned Folios, and delete actions all depend on `onUpdateItem` / `onDeleteItem`. If Supabase update semantics change, the drawer can become visually correct but non-persistent.

`src/lib/ingestion.ts`: this is the central route for links, notes, images, PDFs, DOCX, PPTX, AI enrichment, file refs, thumbnails, and embeddings. Auth work should avoid reshaping this without dedicated upload/reload tests.

## 7. Must Fix Before Online User Testing

1. Fix Supabase space identity.
   - Do not seed global fixed IDs for every user under a global `spaces.id` primary key.
   - Make default spaces user-scoped or generated per user.

2. Persist rich note bodies.
   - Write Quick Note and DetailDrawer body data to `card_bodies`.
   - Restore `body` in `dbToCard`.

3. Persist files outside IndexedDB for authenticated users.
   - Upload original files, thumbnails, and converted preview PDFs to Supabase Storage or a backend file service.
   - Store durable file refs in the `files` table or card metadata.

4. Persist or rebuild embeddings.
   - Store `embedding` on card insert/update or create a reindex job.
   - Restore embeddings before semantic search runs.

5. Turn Office conversion into a production worker.
   - Current LibreOffice conversion is local-dev only.
   - Add timeout, size guard, cleanup, and failure UI.

6. Add top-level ingestion failure handling.
   - Wrap `resolve(tempItem)` in `try/catch`.
   - Mark failed cards as error or remove them with a toast.

7. Add real E2E tests.
   - Upload image -> card preview -> detail -> reload.
   - Upload PDF -> detail preview -> reload.
   - Upload DOCX/PPTX -> conversion preview -> reload.
   - Quick Note rich body -> detail edit -> reload.
   - Create Space -> assign card to Folio -> reload.
   - Login user A/user B isolation smoke test.

8. Improve AI error visibility.
   - Keep quiet UI, but show subtle status for failed transcription, failed conversion, or unavailable AI.

## 8. Recommended Next Work Split

Terminal 1 can continue Auth + user data isolation, but should prioritize `src/lib/supabaseMappers.ts`, `src/hooks/useCards.ts`, `src/hooks/useSpaces.ts`, and schema ID strategy.

Terminal 2 should focus only on file persistence: Storage upload, file refs, converted preview PDF persistence, and reload behavior.

Terminal 3 should focus only on Office conversion production design: worker endpoint, timeouts, size limits, and deployment compatibility.

Terminal 4 should write Playwright E2E tests for the flows listed above.

Terminal 5 should run manual UX QA: voice realtime display, ghost completion, inline rewrite, Quick Note, DetailDrawer, and Spaces.

## 9. Current Launch Readiness

The current product is good enough for local prototype exploration. It is not ready for real online users yet because the most important memories, files, rich notes, embeddings, and spaces are not fully durable across authenticated cloud sessions.

The biggest product risk is not visual polish now. The biggest risk is users saving something, refreshing or changing devices, and seeing the memory card without the actual file, preview, rich note body, or semantic behavior.
