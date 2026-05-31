# Lovcore AI Execution Goal

Last updated: 2026-05-23

This document is designed to be handed directly to an AI coding agent. The agent should read this file first, then complete the work defined here as far as possible without requiring the user to restate the product direction.

## How To Use This Document

If you are an AI agent, do this first:

1. Read `docs/NEXT_PLAN.md`.
2. Read `docs/TARGET_DEFINITION.md`.
3. Read this file.
4. Inspect the current codebase before editing.
5. Implement the work in the priority order below.
6. Run verification after changes.
7. Leave a clear summary for the user to review the next day.

Recommended user command:

```txt
/goal

Please read:
C:\Users\CHOU\Documents\lovcore\docs\NEXT_PLAN.md
C:\Users\CHOU\Documents\lovcore\docs\TARGET_DEFINITION.md
C:\Users\CHOU\Documents\lovcore\docs\GOAL_COMMAND.md

Then complete the Lovcore Editor Foundation work in priority order.
Do not change the landing page default entry.
Run npm run lint and npm run build before finishing.
```

## Core Product Intent

Lovcore is a mymind-like private memory and creative capture product. The product should feel calm, elegant, private, fast, and low-friction.

Do not turn Lovcore into:

- a Notion clone
- a generic dashboard
- a 3D starfield product
- a chatbot-first app
- a folder-first knowledge base

The main canvas should stay quiet. Full power should appear only when the user opens a note, invokes slash commands, or asks AI for help.

## Non-Negotiable Constraints

- Do not replace or remove the current landing page as the default entry.
- Do not put API keys in frontend code.
- Do not hardcode model credentials.
- Do not scatter AI calls inside random React components.
- Do not revert unrelated user changes.
- Do not make the card grid visually noisy.
- Do not implement AI features before the editor and content model are stable.
- Do not save rich notes as plain text only.

## Current Working Baseline

The app currently has:

- Vite + React + TypeScript.
- Lovcore landing page.
- Everything / Spaces / Serendipity app views.
- Masonry-style memory canvas.
- Quick Note card.
- Quick Note overlay through Portal.
- Tiptap editor inside Quick Note.
- Slash command definitions.
- Slash command menu.
- Tiptap suggestion extension.
- Dark/light mode.

Important existing files:

- `src/components/QuickNoteCard.tsx`
- `src/components/editor/slashCommands.ts`
- `src/components/editor/SlashCommandMenu.tsx`
- `src/extensions/slashCommand.ts`
- `src/components/DetailDrawer.tsx`
- `src/components/ContentCard.tsx`
- `src/App.tsx`
- `src/types.ts`
- `src/index.css`

Reference project for advanced editor/AI ghost behavior:

`C:\Users\CHOU\Desktop\jiyi`

Relevant reference files:

- `src/services/ai/ghostScanner.ts`
- `src/services/ai/autocompleteScanner.ts`
- `src/components/ghost/GhostOverlay.tsx`
- `api/revision/ghost-scan.ts`
- `api/revision/autocomplete.ts`
- `src/components/editor/slashCommands.ts`
- `src/extensions/slashCommand.ts`
- `src/components/editor/SlashCommandMenu.tsx`

## Execution Priority

Complete work in this order. If time runs out, stop after the highest completed priority and summarize exactly what remains.

## Priority 1: Quick Note Close Animation

### Goal

Quick Note should close with a subtle animation instead of disappearing instantly.

### Required Behavior

Closing triggers:

- `Esc`
- outside click
- close/minimize button

Animation:

- overlay blur fades out
- editor panel opacity fades out
- editor panel scales slightly down
- editor panel feels like it returns toward the original card
- duration around 180ms-260ms

### Implementation Guidance

Current implementation likely unmounts immediately when `isOpen` changes.

Use a closing state:

```ts
const [isClosing, setIsClosing] = useState(false)
```

Close flow:

1. User requests close.
2. Set `isClosing = true`.
3. Add CSS class for exit animation.
4. After animation duration, set `isOpen = false`, `isClosing = false`, and clear fullscreen state.

Do not break Portal behavior. The overlay must stay mounted during the exit animation.

### Acceptance

- Close feels smooth.
- No masonry reflow.
- No panel hidden behind cards.
- Works in dark and light mode.

## Priority 2: Extract Shared LovcoreEditor

### Goal

Quick Note and future note detail editing must share one editor implementation.

### Required File

Create:

`src/components/editor/LovcoreEditor.tsx`

### Responsibilities

LovcoreEditor should own:

- Tiptap editor setup
- StarterKit
- Placeholder
- Image
- Table
- SlashCommand
- save shortcut
- change events

LovcoreEditor should output:

- plain text
- Tiptap JSON
- HTML if easy and stable

Suggested props:

```ts
interface LovcoreEditorProps {
  initialContent?: unknown
  placeholder?: string
  autoFocus?: boolean
  onChange?: (value: {
    json: unknown
    text: string
    html: string
  }) => void
  onSave?: (value: {
    json: unknown
    text: string
    html: string
  }) => void
}
```

QuickNoteCard should call LovcoreEditor instead of creating Tiptap directly.

### Acceptance

- Quick Note still works.
- Slash commands still work.
- Editor setup is not duplicated.
- Future DetailDrawer can reuse the component.

## Priority 3: Structured Note Body

### Goal

Save rich note content as structured data, not plain text only.

### Required Data Direction

Introduce a note body shape similar to:

```ts
interface LovcoreDocumentBody {
  kind: 'tiptap'
  json: unknown
  text: string
  html?: string
}
```

Update types carefully. Avoid breaking existing cards.

### Required Behavior

When saving Quick Note:

- Card preview uses plain text.
- Rich editor state is preserved as Tiptap JSON.
- HTML can be stored if useful for rendering/export.
- Card remains visually simple.

### Acceptance

- Headings, tables, quotes, images, and code blocks are not lost after saving.
- Note preview stays calm and mymind-like.
- Rich data is available for detail editing.

## Priority 4: DetailDrawer Note Editing With Silent Autosave

### Product Decision

The user prefers **silent autosave** for the note detail page.

Do not make the user constantly click a visible Save button in DetailDrawer.

### Goal

Saved notes can be reopened in DetailDrawer and edited continuously.

### Required Behavior

- Clicking a note card opens DetailDrawer.
- If the item is a note, DetailDrawer uses LovcoreEditor.
- Existing Tiptap JSON loads into the editor.
- User edits content.
- Changes are silently autosaved.
- Autosave should debounce, around 600ms-1200ms after the user stops typing.
- Show a very subtle save status only if needed:
  - `Saving...`
  - `Saved`
  - `Offline / failed`
- Avoid noisy save buttons.

### Autosave Rules

Autosave should:

- debounce editor changes
- avoid saving if content has not changed
- avoid losing edits when closing drawer
- flush pending changes on drawer close if possible
- keep UI quiet

Suggested state:

```ts
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
```

### Acceptance

- User can edit note detail and close it without manually saving.
- Reopening shows latest content.
- Edits do not disappear.
- Autosave does not fire on every keystroke.
- UI remains calm.

## Priority 5: Basic Export Foundation

### Goal

Add first export/download functions for notes.

### Phase 1 Formats

Implement if reasonable:

- copy plain text
- download `.txt`
- download `.html`
- download `.md` if conversion is simple enough

Do not block the whole milestone on perfect PDF/DOCX.

### Later Formats

PDF and DOCX are desired, but they can be phase 2.

Important:

- PDF/DOCX should come from structured content or HTML conversion.
- Do not use screenshot export as the main implementation.

### Acceptance

- User can export a note from DetailDrawer.
- Export logic is not tangled inside random UI code.

## Priority 6: Prepare AI Router Folder

### Goal

Prepare clean structure for future AI without implementing all AI features yet.

### Required Structure

Create if appropriate:

```txt
src/ai/
  router.ts
  types.ts
  tasks/
    autocomplete.ts
    ghostCorrect.ts
    rewrite.ts
    summarize.ts
    transcribe.ts
  providers/
    bailian.ts
    openai.ts
    anthropic.ts
```

Only add stubs/types if no backend API exists yet.

### Product Direction

Future AI should support:

- Cursor-like autocomplete
- ghost correction
- AI rewriting
- voice transcription
- summarization
- style extraction later

### Important Security Rule

Do not put API keys in source code.

Use environment variables only.

Example names:

```txt
BAILIAN_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Bailian Model Routing Decision

The user plans to use Alibaba Cloud Model Studio / Bailian first. The project should prefer Bailian for early MVP AI features unless the user explicitly changes provider.

Local environment variables are defined in:

- `.env.local` for real local secrets
- `.env.example` for safe committed examples

Never commit a real key.

Current recommended Bailian environment variables:

```txt
BAILIAN_API_KEY=REPLACE_WITH_ROTATED_BAILIAN_KEY
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

BAILIAN_MODEL_FAST=qwen3.6-flash
BAILIAN_MODEL_BALANCED=qwen3.6-plus
BAILIAN_MODEL_STRONG=qwen3.6-max-preview
BAILIAN_MODEL_CODER=qwen3-coder-plus
BAILIAN_MODEL_VISION=qwen3-vl-plus
BAILIAN_MODEL_VISION_FAST=qwen3-vl-flash
BAILIAN_MODEL_ASR_REALTIME=fun-asr-realtime
BAILIAN_MODEL_ASR_FILE=fun-asr
BAILIAN_MODEL_ASR_CONTEXT_REALTIME=qwen3.5-omni-plus-realtime
BAILIAN_MODEL_ASR_CONTEXT_FILE=qwen3.5-omni-plus
```

Use model routing by task:

| Task | Default Model | Why |
| --- | --- | --- |
| Ghost autocomplete | `BAILIAN_MODEL_FAST` / `qwen3.6-flash` | Needs low latency and low cost. Output should be short. |
| Ghost correction | `BAILIAN_MODEL_FAST` first, fallback to `BAILIAN_MODEL_BALANCED` | Most corrections are small; fallback only when nuance is needed. |
| Rewrite / polish / summarize | `BAILIAN_MODEL_BALANCED` / `qwen3.6-plus` | Better quality while still reasonable for product usage. |
| Long-form planning / PRD / complex reasoning | `BAILIAN_MODEL_STRONG` / `qwen3.6-max-preview` | Use only for heavier tasks because cost and latency may be higher. |
| Code understanding / code-generation notes | `BAILIAN_MODEL_CODER` / `qwen3-coder-plus` | Better for code-related saved snippets or developer workflows. |
| Image style extraction | `BAILIAN_MODEL_VISION` / `qwen3-vl-plus` | Use for design screenshot/image understanding. |
| Fast image captioning/tagging | `BAILIAN_MODEL_VISION_FAST` / `qwen3-vl-flash` | Use when quality does not need to be maximal. |
| Voice transcription, live dictation | `BAILIAN_MODEL_ASR_REALTIME` / `fun-asr-realtime` | Use for Quick Note microphone dictation and low-latency speech-to-text. |
| Voice transcription, uploaded recording | `BAILIAN_MODEL_ASR_FILE` / `fun-asr` | Use for non-realtime audio files. |
| Voice transcription with contextual terms | `BAILIAN_MODEL_ASR_CONTEXT_REALTIME` or `BAILIAN_MODEL_ASR_CONTEXT_FILE` | Use Qwen Omni when the transcript needs domain context, product names, or mixed reasoning. |

Important implementation rule:

- Frontend components should never call Bailian directly.
- The UI should call a backend route or AI router task.
- The router selects the model based on task type.
- Keep provider-specific details in `src/ai/providers/bailian.ts` or backend API routes, not in UI components.

### Acceptance

- There is a clear AI router/task/provider architecture.
- No actual secret is committed.
- UI components do not directly import provider SDKs.

## Priority 6.5: Backend Responsibilities

### Goal

Do not let Lovcore become a frontend-only prototype. The backend/API layer must be planned clearly, especially because AI provider keys, autosave, export, and voice transcription cannot safely live in frontend components.

### Current App Type

The current project is a Vite React app, not a Next.js app. If no backend framework exists yet, create a clear API/service plan and lightweight stubs only. Do not randomly bolt secrets into frontend code.

If a backend is introduced later, prefer a simple server/API route layer that can eventually move to:

- Vercel Functions
- Next.js API Routes
- Express/Fastify service
- Supabase Edge Functions

The final choice can wait, but the boundaries must be clear now.

### Backend Must Own Secrets

Never call Bailian, OpenAI, Claude, or any paid AI provider directly from browser components.

Backend/provider layer owns:

- `BAILIAN_API_KEY`
- `BAILIAN_BASE_URL`
- model routing env vars
- request signing/auth headers
- provider-specific error handling
- retry/fallback rules

Frontend should only call internal app APIs or service functions.

### Required Backend/API Domains

Plan the backend around these domains:

```txt
api/
  ai/
    autocomplete
    ghost-correct
    rewrite
    summarize
    transcribe
  notes/
    create
    update
    get
  export/
    txt
    html
    markdown
    pdf
    docx
  files/
    upload
```

The exact route syntax depends on framework, but the responsibilities should stay stable.

### AI API Router

Frontend/editor features should call internal tasks:

```ts
aiRouter.run('autocomplete', payload)
aiRouter.run('ghostCorrect', payload)
aiRouter.run('rewrite', payload)
aiRouter.run('summarize', payload)
aiRouter.run('transcribe', payload)
```

Backend/provider layer should convert these tasks to Bailian/OpenAI/Claude requests.

Suggested task behavior:

| Task | Backend Responsibility |
| --- | --- |
| `autocomplete` | Receive current paragraph/context, call fast model, return short continuation only. |
| `ghostCorrect` | Receive paragraph, return small list of correction suggestions with ranges. |
| `rewrite` | Receive selected text + instruction, return revised text. |
| `summarize` | Receive note/card content, return summary/tags if needed. |
| `transcribe` | Receive audio file/blob or reference, call ASR model, return transcript. |

### Note APIs And Autosave

DetailDrawer autosave must eventually write through a backend/persistence layer.

Desired note APIs:

```txt
POST /api/notes
GET /api/notes/:id
PATCH /api/notes/:id
DELETE /api/notes/:id
```

Autosave should use `PATCH /api/notes/:id`.

Autosave payload should include structured rich content:

```ts
{
  title?: string
  body: {
    kind: 'tiptap'
    json: unknown
    text: string
    html?: string
  }
  updatedAt: string
}
```

Backend/persistence layer should:

- validate note id
- validate payload shape
- save only changed fields
- preserve updated timestamp
- return latest saved record

For local prototype stage, this can still be simulated in local state/localStorage, but structure it as if a backend exists.

### Export APIs

Export should not be random UI code once formats become complex.

Desired export responsibilities:

```txt
POST /api/export/txt
POST /api/export/html
POST /api/export/markdown
POST /api/export/pdf
POST /api/export/docx
```

Phase 1 can implement client-side TXT/HTML/Markdown download if simpler.

Phase 2 PDF/DOCX should be backend/service-driven because:

- conversion can be heavy
- document formatting needs consistency
- future user auth/storage will matter

Input should be Tiptap JSON or normalized HTML, not a screenshot.

### Voice Transcription Backend Flow

Future Quick Note voice input should not send provider keys to the browser.

Desired flow:

```txt
Browser records audio
  -> internal upload/transcribe API
  -> backend calls Bailian ASR model
  -> returns transcript
  -> optional AI cleanup/rewrite task
  -> inserts text into LovcoreEditor
```

Model routing:

- Live dictation: `BAILIAN_MODEL_ASR_REALTIME`
- Uploaded audio file: `BAILIAN_MODEL_ASR_FILE`
- Context-aware transcription: `BAILIAN_MODEL_ASR_CONTEXT_REALTIME` or `BAILIAN_MODEL_ASR_CONTEXT_FILE`

### Backend Security Rules

Minimum security expectations:

- API keys only in environment variables.
- Never commit `.env.local`.
- Never expose provider keys through Vite `VITE_*` env names.
- Validate request body size.
- Limit text/audio payload length.
- Add rate limiting before public release.
- Add user auth before cloud persistence.
- Later use RLS or equivalent row-level isolation for user data.

### Backend Acceptance

Backend planning is acceptable if:

- AI provider key never reaches frontend.
- There is a clear router/provider/task architecture.
- Autosave has a defined persistence boundary.
- Export has a defined service boundary.
- Voice transcription has a secure backend route plan.

Backend planning is not acceptable if:

- UI components call Bailian directly.
- Provider key is imported into React code.
- Autosave only mutates local UI state with no future API seam.
- Export and AI logic are scattered across components.

## Priority 7: Document Ghost AI Future Work

### Goal

Record the future Cursor-like AI behavior so the next implementation does not guess.

Desired behavior:

- Autocomplete after user pause.
- Inline ghost text.
- `Tab` or right arrow accepts autocomplete.
- Correction suggestions appear as subtle underlines.
- `Tab` cycles correction suggestions when no autocomplete is active.
- `Enter` accepts correction.
- `Esc` clears suggestion.

This should be implemented later around LovcoreEditor, not only QuickNoteCard.

## Verification

Before finishing, run:

```txt
npm run lint
npm run build
```

If build emits only the current Tiptap chunk-size warning, that is acceptable. Functional failures are not acceptable.

## Final Report Required

At the end, produce a concise report for the user.

Include:

- What was completed.
- What files changed.
- What was verified.
- What remains unfinished.
- Any behavior the user should review manually the next morning.

## Manual Review Checklist For User

The next morning, the user should check:

- Quick Note open animation.
- Quick Note close animation with Esc.
- Quick Note close animation with outside click.
- Slash command menu navigation.
- Tab changes slash menu selection.
- Enter/Space executes selected command.
- Save a rich note with heading/list/table/code/quote.
- Reopen note in DetailDrawer.
- Edit note and wait for autosave.
- Close and reopen to confirm autosave persisted.
- Try dark mode.
- Try export buttons if implemented.

## Stop Conditions

If implementation becomes too large, stop after completing the highest priority stable milestone.

Do not half-implement AI ghost features before the editor/detail/autosave foundation is stable.

Do not continue if key architecture files become confused; instead summarize the blocker and leave clear next steps.
