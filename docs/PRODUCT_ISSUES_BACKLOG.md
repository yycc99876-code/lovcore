# Lovcore Product Issues Backlog

> Date: 2026-05-24 | Source: QA Audit
> Priority: P0 = ship blocker | P1 = must fix before demo | P2 = should fix before launch | P3 = polish / nice-to-have

---

## P0 — Ship Blockers

### ISSUE-001: AI Writing Slash Command Is Broken
- **Module:** Slash Command
- **User phenomenon:** Selecting "AI Writing" from the slash menu does nothing. No AI interaction occurs.
- **Root cause:** `slashCommands.ts` line 108-118 dispatches a `slash-ai-writing` custom DOM event via `onAfterRun`, but no component in the codebase listens for this event. The `action` itself is a no-op (`chain => chain`).
- **Suggested fix file:** `src/components/editor/slashCommands.ts`, `src/components/editor/LovcoreEditor.tsx`
- **Acceptance:** Selecting "AI Writing" from `/` menu should open the InlineAICommand panel or trigger an AI writing flow.

### ISSUE-002: Vault Password Is Cosmetic — No Actual Security
- **Module:** LandingPage
- **User phenomenon:** Any input in the vault password field unlocks the app. There is zero authentication.
- **Root cause:** `LandingPage.tsx` line 564-575, `handleVaultAccess` accepts any value.
- **Suggested fix file:** `src/components/LandingPage.tsx`
- **Acceptance:** For MVP demo: either remove the password illusion or implement a real check. For launch: must integrate Supabase auth.

### ISSUE-003: Serendipity Swipe Does Nothing — Keep/Forget Is Fake
- **Module:** Serendipity
- **User phenomenon:** Swiping cards left/right produces animations but no actual state change. Items are not marked as kept/forgotten, not removed from the pool, not added to any collection.
- **Root cause:** `SerendipityView.tsx` `throwCard` just calls `next()` which increments an index. No item mutation.
- **Suggested fix file:** `src/components/SerendipityView.tsx`, `src/hooks/useCards.ts`
- **Acceptance:** Swiping right should mark item as "kept" (e.g., pin/favorite). Swiping left should mark as "seen" or remove from serendipity pool. State should persist.

### ISSUE-004: vite-api-mock.ts Only Checks BAILIAN_API_KEY
- **Module:** AI Runtime
- **User phenomenon:** If a developer sets only `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (no Bailian key), all AI features return empty fallback stubs instead of real responses. Ghost autocomplete, ghost correction, and rewrite silently return nothing.
- **Root cause:** `vite-api-mock.ts` line `const hasKey = !!process.env.BAILIAN_API_KEY` — only checks Bailian.
- **Suggested fix file:** `vite-api-mock.ts`
- **Acceptance:** Setting any one of `BAILIAN_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` should enable real AI handlers.

### ISSUE-005: DetailDrawer Export Has XSS Vulnerability
- **Module:** Export
- **User phenomenon:** Exported HTML/Word/PDF files can contain unescaped `<script>` tags if note content includes them. Opening exported files could execute arbitrary JavaScript.
- **Root cause:** `DetailDrawer.tsx` export functions (lines 424-583) interpolate `item.title` and `item.body.html` directly into HTML strings without escaping.
- **Suggested fix file:** `src/components/DetailDrawer.tsx`
- **Acceptance:** Export functions must HTML-escape all user content before interpolation. Verify by creating a note with `<script>alert(1)</script>` and exporting — the output should contain the literal text, not execute it.

---

## P1 — Must Fix Before Demo

### ISSUE-006: Inline AI Rewrite Cannot Be Undone (Ctrl+Z)
- **Module:** Inline AI Rewrite
- **User phenomenon:** After accepting an AI rewrite, pressing Ctrl+Z does not undo the replacement. The user has no way to revert.
- **Root cause:** `InlineAICommand.tsx` `acceptDiff` uses raw ProseMirror `state.tr.delete(from, to).insertText(...)` instead of TipTap commands, bypassing the history plugin.
- **Suggested fix file:** `src/components/editor/InlineAICommand.tsx`
- **Acceptance:** After accepting an AI rewrite, Ctrl+Z should revert to the original text.

### ISSUE-007: Ghost Autocomplete Cannot Cancel In-Flight Requests
- **Module:** Ghost Autocomplete
- **User phenomenon:** After dismissing ghost text (Escape or cursor move), the HTTP request to `/api/ai/autocomplete` continues in the background. Multiple stale requests can pile up.
- **Root cause:** `useGhostAutocomplete.ts` creates an `abortRef` but never passes the AbortSignal to `requestAutocomplete`. The `aiClient` does not support AbortSignal.
- **Suggested fix file:** `src/hooks/useGhostAutocomplete.ts`, `src/services/editor/autocompleteScanner.ts`, `src/ai/client.ts`
- **Acceptance:** Dismissing ghost text should abort the in-flight HTTP request. Only the latest request should produce a result.

### ISSUE-008: Voice Language Hardcoded to zh-CN
- **Module:** Voice
- **User phenomenon:** Non-Chinese users get Chinese speech recognition. No way to configure language.
- **Root cause:** `voiceRecorder.ts` line 79 hardcodes `recognition.lang = 'zh-CN'`.
- **Suggested fix file:** `src/services/editor/voiceRecorder.ts`
- **Acceptance:** Voice language should follow the app's locale setting (zh/en).

### ISSUE-009: PDF Download Is a Placeholder Alert
- **Module:** DetailDrawer Export
- **User phenomenon:** Clicking "Download PDF" shows `alert('Simulated action: Download...')` instead of actually downloading a PDF.
- **Root cause:** `DetailDrawer.tsx` line 236.
- **Suggested fix file:** `src/components/DetailDrawer.tsx`
- **Acceptance:** "Print PDF" button already opens print dialog (which can save as PDF). The placeholder "Download PDF" button should either be removed or implemented.

### ISSUE-010: Video Play Is a Placeholder Alert
- **Module:** DetailDrawer
- **User phenomenon:** Clicking play on a video item shows `alert('Simulated action: Play media content')`.
- **Root cause:** `DetailDrawer.tsx` line 669.
- **Suggested fix file:** `src/components/DetailDrawer.tsx`
- **Acceptance:** Either implement `<video>` playback or remove the play button for video items.

### ISSUE-011: Quick Note Reopens Lose Rich Formatting
- **Module:** Quick Note
- **User phenomenon:** Creating a note with bold/heading formatting, saving, then reopening shows only plain text. All formatting is lost.
- **Root cause:** `QuickNoteCard.tsx` line 130 passes `contentPreview` (plain text) as `initialContent` instead of the saved `editorBody.json`.
- **Suggested fix file:** `src/components/QuickNoteCard.tsx`
- **Acceptance:** Reopening a note should restore its full Tiptap JSON body, preserving all formatting.

### ISSUE-012: Image Command Uses Blocking window.prompt()
- **Module:** Slash Command
- **User phenomenon:** Selecting the Image slash command opens a native browser prompt dialog, which is jarring, ugly, and blocked in some webviews.
- **Root cause:** `slashCommands.ts` line 85.
- **Suggested fix file:** `src/components/editor/slashCommands.ts`
- **Acceptance:** Image insertion should use a custom inline UI or modal, not `window.prompt()`.

---

## P2 — Should Fix Before Launch

### ISSUE-013: Potential XSS in getParsedContent
- **Module:** Editor
- **User phenomenon:** If plain text content contains HTML tags like `<script>`, they are injected as HTML when wrapping in `<p>` tags.
- **Root cause:** `LovcoreEditor.tsx` `getParsedContent` (lines 45-51) does not escape HTML entities.
- **Suggested fix file:** `src/components/editor/LovcoreEditor.tsx`
- **Acceptance:** Input `<script>alert(1)</script>` as plain text should render as literal text, not execute.

### ISSUE-014: Ingestion Uses Hardcoded Mock Metadata
- **Module:** Ingestion
- **User phenomenon:** All imported images show the same color palette. Document page counts are random numbers. Summaries are generic placeholders.
- **Root cause:** `ingestion.ts` line 51 (hardcoded palette), line 76 (random pageCount).
- **Suggested fix file:** `src/lib/ingestion.ts`
- **Acceptance:** At minimum, remove fake data and show "N/A" or omit fields that can't be computed. Ideally, extract real metadata.

### ISSUE-015: All Document Types Classified as 'pdf'
- **Module:** Ingestion
- **User phenomenon:** .doc, .xlsx, .pptx files are all shown as type "pdf" in the UI.
- **Root cause:** `ingestion.ts` line 66 assigns `type: 'pdf'` to all document MIME types.
- **Suggested fix file:** `src/lib/ingestion.ts`, `src/types.ts`
- **Acceptance:** Document types should be classified accurately (doc, spreadsheet, presentation, etc.) or at least as a generic "document" type.

### ISSUE-016: No Request Timeout on AI Client
- **Module:** AI Client
- **User phenomenon:** If the AI backend hangs, the UI freezes indefinitely waiting for a response. No timeout, no cancel UI.
- **Root cause:** `src/ai/client.ts` uses plain `fetch()` with no AbortController timeout.
- **Suggested fix file:** `src/ai/client.ts`
- **Acceptance:** All AI requests should have a 30-second timeout. On timeout, show an error state.

### ISSUE-017: localStorage.setItem Has No Error Handling
- **Module:** Storage
- **User phenomenon:** In private browsing or when storage is full, saving data throws an unhandled `QuotaExceededError`. The app may crash or lose data silently.
- **Root cause:** `storage.ts`, `useSpaces.ts`, `useCards.ts` — all call `localStorage.setItem` without try-catch.
- **Suggested fix file:** `src/lib/storage.ts`, `src/hooks/useSpaces.ts`, `src/hooks/useCards.ts`
- **Acceptance:** `setItem` calls should be wrapped in try-catch. On failure, show a user-friendly warning.

### ISSUE-018: Scraping Has SSRF Vulnerability
- **Module:** API / Scrape URL
- **User phenomenon:** A malicious user could probe internal network services by submitting internal URLs (127.0.0.1, 10.x.x.x, etc.) to the scrape endpoint.
- **Root cause:** `api/ai/scrape-url.ts` has no validation against private/internal IP ranges.
- **Suggested fix file:** `api/ai/scrape-url.ts`
- **Acceptance:** The scrape endpoint should reject requests to private IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, ::1, fc00::/7).

### ISSUE-019: Correction Paragraph Cache Is Unbounded
- **Module:** Ghost Correction
- **User phenomenon:** In long editing sessions, memory usage grows continuously because every scanned paragraph is cached forever.
- **Root cause:** `useGhostCorrection.ts` `paragraphCacheRef` is a `Map` with no eviction.
- **Suggested fix file:** `src/hooks/useGhostCorrection.ts`
- **Acceptance:** Cache should evict old entries (e.g., LRU with max 50 entries).

### ISSUE-020: Storage Version Change Wipes All User Data
- **Module:** Storage
- **User phenomenon:** Every time the `CURRENT_VERSION` string in `storage.ts` changes, all user-created items are deleted and replaced with mock data.
- **Root cause:** `storage.ts` version-based reset logic.
- **Suggested fix file:** `src/lib/storage.ts`
- **Acceptance:** Implement data migration instead of full reset. At minimum, preserve user-created items across version bumps.

### ISSUE-021: UseTheme Listens for System Preference Changes
- **Module:** Theme
- **User phenomenon:** Changing OS dark/light mode while the app is open has no effect.
- **Root cause:** `useTheme.ts` reads `prefers-color-scheme` on mount but doesn't subscribe to changes.
- **Suggested fix file:** `src/hooks/useTheme.ts`
- **Acceptance:** `matchMedia('prefers-color-scheme: dark').addEventListener('change', ...)` should update the theme in real-time.

---

## P3 — Polish / Nice-to-Have

### ISSUE-022: Dead Code — GhostCorrectionLayer and GhostInlineCompletion
- **Module:** Ghost
- **User phenomenon:** No visible impact (unused files), but increases bundle size and confuses developers.
- **Root cause:** Both files are deprecated and never imported.
- **Suggested fix file:** `src/components/ghost/GhostCorrectionLayer.tsx`, `src/components/ghost/GhostInlineCompletion.tsx`
- **Acceptance:** Delete both files.

### ISSUE-023: ScrapeUrlPayload/Result Not Exported from AI Barrel
- **Module:** AI Types
- **User phenomenon:** Developers importing from `src/ai` don't get scrape URL types.
- **Root cause:** `src/ai/index.ts` doesn't re-export `ScrapeUrlPayload` and `ScrapeUrlResult`.
- **Suggested fix file:** `src/ai/index.ts`
- **Acceptance:** All types from `src/ai/types.ts` should be re-exported from `src/ai/index.ts`.

### ISSUE-024: ContentCard Date Formatting Hardcoded to en-US
- **Module:** ContentCard
- **User phenomenon:** Dates on cards always show in English format regardless of locale setting.
- **Root cause:** `ContentCard.tsx` line 165 uses `'en-US'` locale.
- **Suggested fix file:** `src/components/ContentCard.tsx`
- **Acceptance:** Date formatting should use the app's current locale.

### ISSUE-025: VoiceRecorderIndicator Has Hardcoded Chinese String
- **Module:** Voice
- **User phenomenon:** The "listening" prompt shows Chinese text even in English locale.
- **Root cause:** `VoiceRecorderIndicator.tsx` line 81 has `'我在听，请说...'` hardcoded.
- **Suggested fix file:** `src/components/voice/VoiceRecorderIndicator.tsx`
- **Acceptance:** Use `t.voice.listening` or equivalent i18n key.

### ISSUE-026: GhostOverlay Scroll/Resize Not Debounced
- **Module:** Ghost Overlay
- **User phenomenon:** Rapid scrolling may cause jank as correction positions are recalculated on every scroll event.
- **Root cause:** `GhostOverlay.tsx` lines 83-98 attach raw scroll/resize listeners without throttling.
- **Suggested fix file:** `src/components/ghost/GhostOverlay.tsx`
- **Acceptance:** Wrap `recalc` in `requestAnimationFrame` to limit to one call per frame.

### ISSUE-027: Smart Folio Link in CreateSpaceModal Is a No-Op
- **Module:** Spaces
- **User phenomenon:** Clicking "Smart Folio" link in the create space modal does nothing.
- **Root cause:** `CreateSpaceModal.tsx` line 79-81, the button has no onClick handler.
- **Suggested fix file:** `src/components/CreateSpaceModal.tsx`
- **Acceptance:** Either implement the smart folio creation flow or remove the dead link.

### ISSUE-028: No Route-Based Navigation
- **Module:** App Architecture
- **User phenomenon:** Browser back/forward buttons don't work for view navigation. No deep linking possible. Sharing a URL doesn't work.
- **Root cause:** `App.tsx` uses `activeView` state instead of URL routing.
- **Suggested fix file:** `src/App.tsx`
- **Acceptance:** Implement React Router or equivalent. At minimum, `/spaces`, `/serendipity` should be valid URLs.

### ISSUE-029: GhostOverlay Effect Dependencies Cause Excessive Recomputation
- **Module:** Ghost Overlay
- **User phenomenon:** Potential performance issue — the overlay recalculates on every render due to object references in dependency arrays.
- **Root cause:** `GhostOverlay.tsx` line 75 effect has `correctionState` and `acceptedFlash` in deps, which change identity on every render.
- **Suggested fix file:** `src/components/ghost/GhostOverlay.tsx`
- **Acceptance:** Use `useMemo` or individual primitive values in dependency arrays to reduce unnecessary recalculations.

### ISSUE-030: Ingestion Fixed 2500ms Delay Instead of Real Processing
- **Module:** Ingestion
- **User phenomenon:** Every file/URL ingestion takes exactly 2.5 seconds regardless of content complexity. No progress indication.
- **Root cause:** `useCards.ts` line 39 uses `setTimeout(..., 2500)`.
- **Suggested fix file:** `src/hooks/useCards.ts`, `src/lib/ingestion.ts`
- **Acceptance:** Ingestion time should reflect actual processing. Show a progress indicator.
