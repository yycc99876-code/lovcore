# Lovcore Next Development Task Packs

> Date: 2026-05-24 | Source: QA Audit
> Each task pack is designed to be executed by an AI coding agent. All tasks are independent and can be parallelized.

---

## Task A: Quick Note Ghost Completion Polish

### Goal
Make ghost autocomplete feel production-ready: reliable triggering, proper cancellation, correct cursor positioning, and smooth accept/dismiss animations.

### Forbidden Scope
- Do NOT modify `src/components/LandingPage.tsx`
- Do NOT modify `src/components/SpacesView.tsx`
- Do NOT modify `src/components/SerendipityView.tsx`
- Do NOT modify `api/` directory
- Do NOT modify `package.json`

### Files to Read
1. `src/hooks/useGhostAutocomplete.ts` — current autocomplete lifecycle
2. `src/services/editor/autocompleteScanner.ts` — scanner that calls AI
3. `src/ai/client.ts` — HTTP client (needs AbortSignal support)
4. `src/components/ghost/GhostOverlay.tsx` — rendering layer
5. `src/components/editor/LovcoreEditor.tsx` — integration point
6. `docs/GHOST_AI_SPEC.md` — behavior spec

### What to Change
1. **Add AbortSignal support to aiClient** — add an optional `signal` parameter to each AI client function. Use `AbortController` with 30s timeout by default.
2. **Pass abort signal through autocompleteScanner** — `requestAutocomplete` should accept a `signal` parameter and pass it to `aiClient.autocomplete()`.
3. **Wire abortRef in useGhostAutocomplete** — on dismiss, call `abortRef.current?.abort()`. On new trigger, abort previous request first.
4. **Fix stale detection** — use a more robust request key that includes a timestamp or monotonically increasing counter, not just text content.
5. **Add error logging** — replace bare `catch {}` in autocompleteScanner with `console.debug('[ghost-autocomplete]', error)` in dev mode.
6. **Debounce GhostOverlay scroll/resize** — wrap `recalc` in `requestAnimationFrame`.

### Acceptance Steps
1. Type text and wait for ghost text to appear — should work as before
2. Press Escape — ghost text disappears AND the network request is aborted (check DevTools Network tab)
3. Move cursor — ghost text disappears and request is aborted
4. Type quickly — only the latest request should produce a result, no stale ghost text
5. If backend returns error — no crash, ghost simply doesn't appear
6. Rapid scrolling while ghost text is visible — no jank

### Run Command
```bash
npm run dev
# Manual test in browser
npm run build  # Must pass
npm test       # Must pass
```

---

## Task B: Voice Dictation UX Polish

### Goal
Fix language configuration, error handling, and hardcoded strings in the voice system.

### Forbidden Scope
- Do NOT modify `src/components/LandingPage.tsx`
- Do NOT modify `src/components/ghost/` (except integration)
- Do NOT modify `api/ai/transcribe.ts`
- Do NOT modify `package.json`

### Files to Read
1. `src/services/editor/voiceRecorder.ts` — voice recorder service
2. `src/hooks/useVoiceCapture.ts` — voice capture state machine
3. `src/components/voice/VoiceRecorderIndicator.tsx` — voice UI
4. `src/hooks/useAudioCue.ts` — audio feedback
5. `src/i18n/locales/zh.ts` and `src/i18n/locales/en.ts` — i18n strings
6. `docs/GHOST_VOICE_IMPLEMENTATION_GOAL.md` — spec

### What to Change
1. **Make voice language configurable** — add a `language` parameter to `startVoiceRecording()`. Default to app locale (`zh-CN` or `en-US`).
2. **Propagate speech recognition errors** — add an `onError` callback to `startVoiceRecording`. When `recognition.onerror` fires, call it with the error.
3. **Replace hardcoded Chinese string** — in `VoiceRecorderIndicator.tsx` line 81, use `t.voice.listening` instead of `'我在听，请说...'`.
4. **Add isRecording guard to stopVoiceRecording** — check `isRecordingActive` before attempting to stop.
5. **Fix transcribeViaBackend error handling** — log errors instead of silently returning empty string.
6. **Pass locale to voice recorder from useVoiceCapture** — read the app locale and pass it through.

### Acceptance Steps
1. In English locale, press Insert — speech recognition should listen in English
2. In Chinese locale, press Insert — speech recognition should listen in Chinese
3. If speech recognition errors (e.g., no microphone) — an error state should appear in the UI
4. The "listening..." text should be translated in both locales
5. Press Insert twice rapidly — should not crash or create duplicate recordings
6. Audio cues should play correctly for start/stop

### Run Command
```bash
npm run dev
# Manual test: switch locale, test voice in both languages
npm run build
npm test
```

---

## Task C: Inline AI Rewrite Polish

### Goal
Fix the undo issue, add loading feedback, fix stale selection, and make the AI writing slash command work.

### Forbidden Scope
- Do NOT modify `src/components/LandingPage.tsx`
- Do NOT modify `src/services/editor/voiceRecorder.ts`
- Do NOT modify `api/ai/rewrite.ts`
- Do NOT modify `package.json`

### Files to Read
1. `src/components/editor/InlineAICommand.tsx` — inline AI rewrite UI
2. `src/components/editor/slashCommands.ts` — AI writing slash command
3. `src/components/editor/LovcoreEditor.tsx` — integration point
4. `src/ai/client.ts` — AI client
5. `docs/NEXT_FEATURE_GOAL.md` — Priority E spec

### What to Change
1. **Fix undo** — in `acceptDiff`, use `editor.chain().deleteRange({from, to}).insertContentAt(from, newText).run()` instead of raw `state.tr`. This preserves history.
2. **Add loading spinner** — replace the "thinking..." text label with a visual spinner animation.
3. **Snapshot selection at request time** — capture `from`/`to` when the rewrite request is sent, not when the result arrives. Warn if document changed significantly.
4. **Fix AI writing slash command** — add a listener for the `slash-ai-writing` event in `LovcoreEditor.tsx` that opens the InlineAICommand panel.
5. **Clean up GSAP animations on unmount** — add cleanup in useEffect return for GSAP animations.
6. **Fix stale selection validation** — before applying diff, verify the selection range is still valid in the current document.

### Acceptance Steps
1. Select text, press Ctrl+K, type instruction, accept rewrite — Ctrl+Z should undo the rewrite
2. While AI is processing — a spinner should be visible
3. Select text and change selection while AI processes — the rewrite should apply to the original selection or warn
4. Type `/AI` in the slash menu — selecting it should open the InlineAICommand bar
5. Press Escape at any stage — should cleanly dismiss without errors
6. Accept multiple rewrites in sequence — each should be independently undoable

### Run Command
```bash
npm run dev
# Manual test: AI rewrite flow with undo
npm run build
npm test
```

---

## Task D: DetailDrawer Persistence QA

### Goal
Fix autosave edge cases, export XSS, placeholder actions, and formatting preservation.

### Forbidden Scope
- Do NOT modify `src/components/LandingPage.tsx`
- Do NOT modify `src/components/ghost/`
- Do NOT modify `api/` directory
- Do NOT modify `package.json`

### Files to Read
1. `src/components/DetailDrawer.tsx` — detail drawer with autosave and export
2. `src/components/QuickNoteCard.tsx` — quick note that creates items
3. `src/hooks/useCards.ts` — cards CRUD and persistence
4. `src/lib/storage.ts` — localStorage persistence
5. `src/lib/fileStore.ts` — IndexedDB file storage

### What to Change
1. **Fix flushSave stale closure** — use a ref to track the latest item instead of capturing from closure.
2. **Fix export XSS** — escape HTML entities in `item.title` and `item.body.html` before interpolating into export HTML strings. Create a simple `escapeHtml()` utility.
3. **Fix Quick Note formatting preservation** — when reopening a note, pass `editorBody` (Tiptap JSON) as initial content instead of `contentPreview` (plain text).
4. **Remove placeholder alerts** — replace `alert('Simulated action: Download...')` and `alert('Simulated action: Play media content')` with real implementations or remove the buttons.
5. **Add localStorage error handling** — wrap `localStorage.setItem` calls in `useCards.ts` and `storage.ts` in try-catch with user-visible error toast.
6. **Debounce persistence** — add debounce to the `persistItems` effect in `useCards.ts` (e.g., 500ms).

### Acceptance Steps
1. Open a note, type quickly, close drawer — data should be saved (no lost edits)
2. Create a note with `<script>alert(1)</script>` in the title, export as HTML — should show literal text, not execute
3. Create a bold heading note, save, reopen — formatting should be preserved
4. The "Download PDF" button should either work or not be present
5. Fill localStorage to capacity — app should show a warning, not crash
6. Rapid edits should not cause excessive localStorage writes (check in DevTools)

### Run Command
```bash
npm run dev
# Manual test: create/edit/export notes
npm run build
npm test
```

---

## Task E: Spaces / Smart Spaces Product Finish

### Goal
Make spaces fully functional: smart space creation, proper filtering, and remove dead code.

### Forbidden Scope
- Do NOT modify `src/components/LandingPage.tsx`
- Do NOT modify `src/components/editor/`
- Do NOT modify `api/` directory
- Do NOT modify `package.json`

### Files to Read
1. `src/hooks/useSpaces.ts` — spaces lifecycle
2. `src/components/SpacesView.tsx` — spaces grid
3. `src/components/CreateSpaceModal.tsx` — create space modal
4. `src/components/SpacePills.tsx` — space pills
5. `src/data/spaces.ts` — default spaces
6. `src/hooks/useSearch.ts` — search with space awareness

### What to Change
1. **Fix "Smart Folio" link** — either implement the smart space creation flow (open search, apply filters, save as space) or remove the dead link.
2. **Add confirmation for space deletion** — show a confirmation dialog before deleting user-created spaces.
3. **Add input validation** — max length for space name (50 chars), trim whitespace, prevent duplicate names.
4. **Fix SpacesView filtering performance** — memoize `getSpaceItems` with `useMemo`.
5. **Add keyboard navigation to color wheel** — make color buttons navigable via arrow keys.
6. **Add try-catch to localStorage.setItem in useSpaces** — prevent crash in private browsing.

### Acceptance Steps
1. Create a space via the modal — it should appear in both SpacesView and SpacePills
2. Try to create a space with empty name — should show validation error
3. Try to create a space with 100+ character name — should be truncated
4. Delete a user space — should show confirmation first
5. Try to delete a system space — should be prevented
6. Create a smart space from search filters — should persist the filter criteria
7. In SpacesView, each space should show correct item count matching its filters

### Run Command
```bash
npm run dev
# Manual test: create/delete/filter spaces
npm run build
npm test
```

---

## Task F: Search and Filter Finish

### Goal
Improve search quality, add debouncing, and fix edge cases.

### Forbidden Scope
- Do NOT modify `src/components/LandingPage.tsx`
- Do NOT modify `src/components/editor/`
- Do NOT modify `api/` directory
- Do NOT modify `package.json`

### Files to Read
1. `src/hooks/useSearch.ts` — search logic
2. `src/components/SearchHeader.tsx` — search UI
3. `src/App.tsx` — integration point
4. `src/components/ContentCard.tsx` — card rendering

### What to Change
1. **Add search debouncing** — debounce the search filter computation by 150ms to avoid jank on rapid typing.
2. **Fix date locale** — in `ContentCard.tsx`, use the app's current locale for `formatDate` instead of hardcoded `'en-US'`.
3. **Throttle scroll listener** — in `SearchHeader.tsx`, wrap the scroll handler in `requestAnimationFrame`.
4. **Add Enter key search behavior** — when user presses Enter in search with non-URL text, trigger search (currently does nothing).
5. **Add keyboard accessibility to ContentCard** — add `onKeyDown` handler for Enter/Space on the card div.
6. **Extract formatDate** — move `formatDate` out of the component to avoid recreation on every render.

### Acceptance Steps
1. Type quickly in search — UI should remain responsive, no jank
2. Search results should update within 200ms of stopping typing
3. In Chinese locale, card dates should show in Chinese format
4. In English locale, card dates should show in English format
5. Press Enter with search text — should trigger search
6. Navigate to a card with Tab and press Enter — should open the detail drawer
7. Scroll down — header collapse should be smooth, no stuttering

### Run Command
```bash
npm run dev
# Manual test: search, scroll, locale switching
npm run build
npm test
```

---

## Task G: Export and File Handling Finish

### Goal
Make export robust, fix ingestion mock data, and handle edge cases.

### Forbidden Scope
- Do NOT modify `src/components/LandingPage.tsx`
- Do NOT modify `src/components/editor/`
- Do NOT modify `src/components/ghost/`
- Do NOT modify `package.json`

### Files to Read
1. `src/components/DetailDrawer.tsx` — export functions
2. `src/lib/ingestion.ts` — ingestion pipeline
3. `src/lib/fileStore.ts` — file storage
4. `src/hooks/useCards.ts` — cards hook
5. `src/types.ts` — type definitions

### What to Change
1. **Fix HTML-to-Markdown converter** — improve `convertHTMLToMarkdown` to handle nested lists, inline code, links, and images.
2. **Remove hardcoded mock metadata** — in `ingestion.ts`, replace hardcoded `colorPalette` with an empty array or "not available" indicator. Replace random `pageCount` with 0 or omit.
3. **Fix document type classification** — add proper MIME-to-type mapping instead of defaulting everything to 'pdf'.
4. **Add file size limit** — check file size before reading into memory in ingestion (e.g., 50MB max for images, 100MB for documents).
5. **Fix fileStore singleton connection** — cache the IndexedDB connection instead of opening/closing on every operation.
6. **Add error handling to useFileUrl** — add `.catch()` to the `loadFileUrl` promise in the hook.

### Acceptance Steps
1. Export a note with nested lists as Markdown — the output should preserve list structure
2. Import an image — color palette should show "N/A" or be absent, not a fake palette
3. Import a .docx file — type should show as "document" not "pdf"
4. Try to import a 200MB file — should show an error message, not crash
5. Import multiple files rapidly — IndexedDB should handle concurrent operations
6. If IndexedDB is unavailable (private browsing) — app should show a warning

### Run Command
```bash
npm run dev
# Manual test: import files, export notes
npm run build
npm test
```
