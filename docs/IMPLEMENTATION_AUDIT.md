# Lovcore Implementation Audit

Last updated: 2026-05-23

This document audits the completion status of the Lovcore Editor Foundation milestone (P1-P7) as defined in `GOAL_COMMAND.md`.

## Audit Summary

| Priority | Task | Status | Real? |
|----------|------|--------|-------|
| P1 | Quick Note Close Animation | ✅ Complete | Real — CSS keyframes + JS isClosing state |
| P2 | Shared LovcoreEditor | ✅ Complete | Real — used by both QuickNoteCard and DetailDrawer |
| P3 | Structured Note Body | ✅ Complete | Real — LovcoreDocumentBody in types.ts, saved to localStorage |
| P4 | DetailDrawer Note Editing + Autosave | ✅ Complete | Real — 800ms debounce, flush on close |
| P5 | Basic Export | ✅ Complete | Real — 7 export formats, DOMParser-based conversion |
| P6 | AI Router Folder | ✅ Complete | Real — frontend client + backend handlers |
| P6.5 | Backend Responsibilities | ✅ Complete | Real — api/ layer, no VITE_ keys, dev mock plugin |
| P7 | Ghost AI Documentation | ✅ Complete | Real — docs/GHOST_AI_SPEC.md |

## P1: Quick Note Close Animation

### Completion: ✅ Real

### How it works

**JS flow** (`src/components/QuickNoteCard.tsx`):
1. User triggers close (Esc / outside click / close button)
2. `handleClose()` sets `isClosing = true`
3. CSS class `is-closing` is added to overlay and panel
4. After 220ms timeout, `isOpen = false`, `isClosing = false`, fullscreen cleared

**CSS animations** (`src/index.css`):
- `quickNoteBackdropOut`: opacity 1→0, 0.22s ease
- `quickNotePanelOut`: opacity 1→0, translateY(0)→translateY(12px), scale(1)→scale(0.96), 0.22s cubic-bezier(0.16, 1, 0.3, 1)
- Portal stays mounted during animation (condition: `isOpen || isClosing`)

### Files
- `src/components/QuickNoteCard.tsx` — lines 20-28 (handleClose), line 89 (portal condition)
- `src/index.css` — lines 1253-1291 (keyframes), lines 738-740, 762-764 (is-closing classes)

### Manual Test
1. Open Quick Note → type something
2. Press `Esc` → overlay fades out, panel shrinks and fades (220ms)
3. Click outside → same animation
4. Click X button → same animation
5. Test in dark mode → same animation

### Known Issues
None identified.

---

## P2: Shared LovcoreEditor

### Completion: ✅ Real

### How it works

`src/components/editor/LovcoreEditor.tsx` is a reusable Tiptap editor component used by:
- `QuickNoteCard.tsx` (line 127) — for new note creation
- `DetailDrawer.tsx` (line 554) — for editing existing notes

**Shared capabilities:**
- StarterKit, Placeholder, Image, Table, SlashCommand extensions
- `onChange` emits `{ text, json, html }` on every update
- `onSave` emits on Ctrl+Enter
- `autoFocus` prop for controlling focus behavior
- `initialContent` accepts string or Tiptap JSON object

### Files
- `src/components/editor/LovcoreEditor.tsx` — the shared editor
- `src/components/QuickNoteCard.tsx` — uses LovcoreEditor
- `src/components/DetailDrawer.tsx` — uses LovcoreEditor
- `src/components/editor/slashCommands.ts` — command definitions
- `src/components/editor/SlashCommandMenu.tsx` — command menu UI
- `src/extensions/slashCommand.ts` — Tiptap suggestion extension

### Manual Test
1. Open Quick Note → type `/bt1` → Heading 1 command appears
2. Select command → heading is created
3. Save note → click card → DetailDrawer opens
4. Same slash commands work in DetailDrawer editor

### Known Issues
None identified. Editor is properly shared.

---

## P3: Structured Note Body

### Completion: ✅ Real

### How it works

**Type definition** (`src/types.ts` lines 5-10):
```ts
interface LovcoreDocumentBody {
  kind: 'tiptap';
  json: any;    // Tiptap JSON document
  text: string; // Plain text for card preview
  html?: string; // HTML for export
}
```

**Save flow:**
1. QuickNoteCard `handleSave` creates `bodyToSave` with all three fields
2. App.tsx `handleSaveQuickNote` passes body to `triggerIngest`
3. `triggerIngest` resolve function attaches `body` to the item
4. `useCards` persists to localStorage via `persistItems`

**Load flow:**
1. DetailDrawer checks `item.body?.json` first
2. Falls back to `item.content` (plain text) for older items
3. LovcoreEditor's `getParsedContent` handles both object and string

### Files
- `src/types.ts` — LovcoreDocumentBody interface
- `src/components/QuickNoteCard.tsx` — creates body on save
- `src/App.tsx` — passes body through triggerIngest
- `src/components/DetailDrawer.tsx` — reads body for editing

### Manual Test
1. Open Quick Note → add heading, list, code block
2. Save → card shows plain text preview
3. Click card → DetailDrawer loads full rich content
4. Verify headings, lists, code blocks are preserved

### Known Issues
- `json` field is typed as `any` — could be tightened to Tiptap's `JSONContent` type
- No validation that body.json is valid Tiptap JSON on load

---

## P4: DetailDrawer Note Editing + Silent Autosave

### Completion: ✅ Real

### How it works

**Autosave flow** (`src/components/DetailDrawer.tsx`):
1. User edits note in LovcoreEditor
2. `handleEditorChange` fires on every Tiptap update
3. Stores change in `latestChangeRef` and sets saveStatus to 'saving'
4. Debounces 800ms before calling `onUpdateItem`
5. On success, sets saveStatus to 'saved', then 'idle' after 1.5s

**Flush on close** (lines 107-119):
- `useEffect` cleanup on `item?.id` change calls `flushSave()`
- `useEffect` on `isOpen` change calls `flushSave()` when drawer closes
- `flushSave()` clears timeout and immediately saves pending changes

**Save status indicator** (lines 590-595):
- Shows "Saving..." or "Saved" badge next to type badge
- Only visible when status is not 'idle'

### Files
- `src/components/DetailDrawer.tsx` — autosave logic + editor integration
- `src/hooks/useCards.ts` — updateItem persists to localStorage
- `src/lib/storage.ts` — localStorage persistence

### Manual Test
1. Create a Quick Note with rich content
2. Click card → DetailDrawer opens with editor
3. Edit content → "Saving..." appears briefly
4. Wait 800ms → "Saved" appears
5. Close drawer → reopen → content is preserved
6. Edit and immediately close → content is preserved (flush on close)

### Known Issues
- SaveStatus type is `'idle' | 'saving' | 'saved'` — missing `'error'` state for offline/failure
- No retry mechanism on save failure

---

## P5: Basic Export

### Completion: ✅ Real

### How it works

**Export formats** (`src/components/DetailDrawer.tsx` lines 200-493):

| Format | Method | Content Source |
|--------|--------|---------------|
| Copy Markdown | `handleCopyMarkdown` | Converts HTML→MD via DOMParser |
| Copy Plain Text | `handleCopyText` | `item.body?.text \|\| item.content` |
| Markdown (.md) | `handleDownloadMarkdown` | Same as Copy MD, downloads file |
| Text (.txt) | `handleDownloadText` | Same as Copy Text, downloads file |
| HTML (.html) | `handleDownloadHTML` | Full HTML document with styles |
| Word (.doc) | `handleDownloadWord` | Word-compatible HTML with mso XML |
| Print PDF | `handleExportPDF` | Opens print dialog via hidden iframe |

**HTML→Markdown converter** (lines 201-293):
- Uses DOMParser to parse HTML
- Recursively traverses DOM nodes
- Converts h1-h3, p, blockquote, pre, code, ul, ol, li, hr, strong, em, a, img, table elements

### Files
- `src/components/DetailDrawer.tsx` — all export handlers

### Manual Test
1. Create note with heading, list, bold text, code block
2. Click card → DetailDrawer opens
3. Click "Copy Markdown" → paste in text editor → verify formatting
4. Click "Markdown (.md)" → verify downloaded file
5. Click "HTML (.html)" → open in browser → verify rendering
6. Click "Copy Plain Text" → verify plain text

### Known Issues
- HTML→Markdown converter is basic — complex nested structures may not convert perfectly
- Word export uses HTML-based `.doc` format, not true DOCX

---

## P6: AI Router Architecture

### Completion: ✅ Real

### Architecture

**Frontend** (`src/ai/`):
- `types.ts` — Payload/Result types only, no provider info
- `client.ts` — thin fetch client calling `/api/*` endpoints
- `index.ts` — public API export

**Backend** (`api/`):
- `ai/router.ts` — provider selection (Bailian → OpenAI → Anthropic)
- `ai/providers/bailian.ts`, `openai.ts`, `anthropic.ts` — provider implementations
- `ai/autocomplete.ts`, `ghost-correct.ts`, `rewrite.ts`, `summarize.ts`, `transcribe.ts` — task handlers
- `notes/route.ts` — Note CRUD stubs
- `export/route.ts` — Export API stubs
- `files/upload.ts` — File upload stub

**Dev runtime** (`vite-api-mock.ts`):
- Vite plugin intercepts `/api/*` POST requests
- Returns mock responses for all AI tasks
- Enables frontend development without real backend

### Files
- `src/ai/client.ts`, `src/ai/types.ts`, `src/ai/index.ts`
- `api/ai/router.ts`, `api/ai/providers/*.ts`, `api/ai/*.ts`
- `api/notes/route.ts`, `api/export/route.ts`, `api/files/upload.ts`
- `vite-api-mock.ts`, `vite.config.ts`

---

## P6.5: Backend Responsibilities

### Completion: ✅ Real

### Security Verification

**No API keys in frontend bundle:**
```
grep -r "VITE_BAILIAN_API_KEY\|VITE_OPENAI_API_KEY\|VITE_ANTHROPIC_API_KEY" src/
→ No matches

grep -r "import.meta.env.VITE_BAILIAN\|import.meta.env.VITE_OPENAI\|import.meta.env.VITE_ANTHROPIC" src/
→ No matches

grep -r "VITE_.*API_KEY" .env*
→ No matches
```

**Environment variable rules:**
- `.env.example` — API keys have NO `VITE_` prefix (backend only)
- `.env.local` — API keys have NO `VITE_` prefix
- Only `VITE_API_BASE_URL=/api` uses `VITE_` prefix (non-secret config)
- `.gitignore` includes `*.local` → `.env.local` is never committed

**Dev runtime strategy:**
- `vite-api-mock.ts` — Vite plugin serves mock responses at `/api/*`
- No real AI calls in dev unless backend is explicitly connected
- Migration path: replace mock plugin with proxy to Express/Fastify/Next.js backend

### Files
- `.env.example`, `.env.local` — environment variables
- `.gitignore` — excludes *.local
- `vite-api-mock.ts` — dev mock API plugin
- `eslint.config.js` — ignores `api/` directory (backend code)

---

## P7: Ghost AI Documentation

### Completion: ✅ Real

### Content
- `docs/GHOST_AI_SPEC.md` — comprehensive spec for future Ghost AI
- Covers: autocomplete, correction underlines, voice dictation
- Includes: Tiptap decoration approach, cancellation pattern, debounce scanners
- Defines: keyboard shortcuts, visual behavior, model selection

---

## Dev Runtime Strategy

### Current State

The project is a **Vite-only frontend** with no backend server. The `api/` directory contains TypeScript handlers that define the expected API contract but cannot be served by Vite directly.

### Solution: Vite Mock API Plugin

`vite-api-mock.ts` is a Vite plugin that:
1. Intercepts `POST /api/*` requests during `npm run dev`
2. Returns mock JSON responses
3. Logs requests to console for debugging
4. Adds 150ms delay to simulate network latency

### How to Run

```bash
npm run dev
# Vite starts with mock API enabled
# Frontend can call /api/ai/autocomplete etc.
# Mock responses are returned
```

### Migration to Real Backend

When ready to connect real AI:

1. **Option A: Express/Fastify dev server**
   - Add `server.ts` with Express
   - Mount `api/` handlers as Express routes
   - Use `vite.config.ts` proxy to forward `/api/*` to Express
   - Remove `mockApiPlugin()` from vite.config.ts

2. **Option B: Vercel/Next.js API Routes**
   - Move `api/` handlers to Next.js `app/api/` or Vercel `api/` functions
   - Deploy as serverless functions
   - Environment variables set in Vercel dashboard

3. **Option C: Supabase Edge Functions**
   - Wrap handlers as Supabase Edge Functions
   - Use Supabase for auth + storage + AI routing

### Current Limitations

- `api/` handlers are TypeScript but not bundled/served
- No real AI calls possible without backend
- Mock responses are static (not based on input)
- No file upload support in dev

---

## Known Issues Summary

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing error state in autosave | Low | SaveStatus lacks 'error' for offline/failure |
| json field typed as `any` | Low | Could use Tiptap's JSONContent type |
| No body validation on load | Low | Invalid Tiptap JSON could crash editor |
| Static mock responses | Low | Mock API doesn't use request content |
| Basic HTML→MD converter | Low | Complex nested structures may not convert |

---

## Manual Testing Checklist

### Quick Note Flow
- [ ] Click Quick Note card → editor opens with animation
- [ ] Type content with headings, lists, bold, code
- [ ] Press `Esc` → editor closes with fade+scale animation
- [ ] Click outside → same close animation
- [ ] Click X button → same close animation
- [ ] Dark mode → all animations work

### Save → Card → DetailDrawer Flow
- [ ] Save Quick Note → card appears in masonry grid
- [ ] Card shows plain text preview (truncated to 220 chars)
- [ ] Click card → DetailDrawer opens with full rich content
- [ ] Edit in DetailDrawer → "Saving..." appears
- [ ] Wait → "Saved" appears
- [ ] Close drawer → reopen → changes preserved
- [ ] Edit and immediately close → changes preserved (flush)

### Slash Commands
- [ ] Type `/` → command menu appears
- [ ] Type `/bt1` → Heading 1 filtered
- [ ] Press Enter → heading created
- [ ] Type `/bg` → table command
- [ ] Press Enter → 3x3 table inserted
- [ ] Arrow keys navigate menu
- [ ] Tab cycles selection

### Export
- [ ] Click "Copy Markdown" → paste in editor → verify formatting
- [ ] Click "Copy Plain Text" → paste → verify plain text
- [ ] Click "Markdown (.md)" → downloaded file opens correctly
- [ ] Click "HTML (.html)" → opens in browser with styles
- [ ] Click "Text (.txt)" → downloaded file is correct

### Dark Mode
- [ ] Toggle dark mode → all components render correctly
- [ ] Quick Note editor in dark mode
- [ ] DetailDrawer in dark mode
- [ ] Export content is mode-independent

---

## Next Steps

1. **Connect real AI backend** — Choose Express/Fastify or Next.js, wire up `api/` handlers
2. **Ghost Autocomplete** — Implement Priority B from NEXT_FEATURE_GOAL.md
3. **Ghost Correction** — Implement Priority C
4. **Voice Capture** — Implement Priority D
5. **Add error state to autosave** — Handle offline/failure gracefully
6. **Tighten types** — Replace `any` with proper Tiptap types
7. **IndexedDB migration** — Move from localStorage to IndexedDB for larger storage
