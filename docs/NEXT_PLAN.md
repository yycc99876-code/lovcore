# Lovcore Next Plan

Last updated: 2026-05-23

This document is for the next AI agent that continues Lovcore development. Read this before making changes.

## Product Direction

Lovcore is a mymind-like private memory/bookmark product. The priority is not a 3D universe view. The desired experience is quiet, elegant, low-friction, private, and creator-focused.

The current product should continue to preserve the landing page as the default entry. Do not replace the landing page with the app view.

The core app direction is:

- No folders-first workflow.
- Users can throw anything into a free memory canvas.
- Search and Spaces help retrieval.
- Quick Note is the primary writing/capture entry.
- AI should assist inline and quietly, more like Cursor than a chatbot.

## Current Implementation Snapshot

The project is a Vite React TypeScript app.

Important current files:

- `src/components/QuickNoteCard.tsx`
- `src/components/editor/slashCommands.ts`
- `src/components/editor/SlashCommandMenu.tsx`
- `src/extensions/slashCommand.ts`
- `src/index.css`
- `src/App.tsx`
- `src/components/DetailDrawer.tsx`
- `src/components/ContentCard.tsx`

Quick Note has been upgraded from a textarea to a Tiptap editor. The slash command implementation was migrated conceptually from:

`C:\Users\CHOU\Desktop\jiyi`

Reference files in that project:

- `src/components/editor/slashCommands.ts`
- `src/extensions/slashCommand.ts`
- `src/components/editor/SlashCommandMenu.tsx`
- `src/services/ai/ghostScanner.ts`
- `src/services/ai/autocompleteScanner.ts`
- `src/components/ghost/GhostOverlay.tsx`
- `api/revision/ghost-scan.ts`
- `api/revision/autocomplete.ts`

Current slash command behavior:

- `/` opens the command menu.
- Commands can be searched by Chinese title, pinyin alias, and description.
- `ArrowUp` / `ArrowDown` move selection.
- `Tab` moves selection down.
- `Shift+Tab` moves selection up.
- `Enter` / `Space` execute the selected command.

Current commands:

- `/正文`, `zw`
- `/标题1`, `bt1`
- `/标题2`, `bt2`
- `/标题3`, `bt3`
- `/有序列表`, `yxlb`
- `/无序列表`, `wxlb`
- `/表格`, `bg`
- `/分隔线`, `fgx`
- `/图片`, `tb`
- `/代码块`, `dmk`
- `/引用`, `yy`
- `/AI写作`

## Immediate Next Step

The next implementation step should be:

1. Add a proper Quick Note close/minimize animation.
2. Then extract a reusable `LovcoreEditor` from `QuickNoteCard`.
3. Then build Note Detail editing on top of `LovcoreEditor`.
4. Then introduce Tiptap JSON as the saved note body format.
5. Then add export/download.
6. Then add Ghost AI assistance.

Do not jump directly into large AI features before the editor/content model is stable.

## Step 1: Quick Note Close Animation

Goal:

When closing the Quick Note editor with `Esc`, outside click, or close/minimize button, the editor should not disappear instantly.

Desired feel:

- Background blur fades out.
- Editor panel slightly shrinks toward its originating Quick Note card.
- Opacity fades out.
- Scale moves roughly from `1` to `0.96`.
- Duration should feel fast and soft, around `180ms-260ms`.

Implementation notes:

- Current `QuickNoteCard` unmounts immediately when `isOpen` becomes false.
- Add a closing state, for example `isClosing`.
- On close request, set `isClosing = true`, wait for animation duration, then unmount.
- Avoid disrupting existing Portal behavior. The editor must remain mounted in `document.body` during close animation.
- Close animation must work in both light and dark mode.

Acceptance:

- Pressing `Esc` animates out.
- Clicking outside animates out.
- Clicking close animates out.
- No masonry reflow or card overlap occurs during close.

## Step 2: Extract LovcoreEditor

Quick Note and future Note Detail should not maintain separate editor implementations.

Create a reusable editor component:

`src/components/editor/LovcoreEditor.tsx`

Responsibilities:

- Own Tiptap initialization.
- Register StarterKit, Placeholder, Image, Table, SlashCommand.
- Support `initialContent`.
- Emit text and structured JSON changes.
- Support save shortcut `Ctrl+Enter`.
- Expose editor instance or imperative callbacks only if truly needed.

QuickNoteCard should become a shell:

- Opens/closes floating panel.
- Positions panel.
- Shows preview.
- Calls `LovcoreEditor`.

Detail Note should later reuse the same `LovcoreEditor`.

## Step 3: Note Detail Editor

Current DetailDrawer shows note content mostly as text. That is not enough.

Desired next product behavior:

- User saves a Quick Note.
- Note appears as a card in the masonry canvas.
- User clicks the card.
- Detail panel/drawer opens.
- Full rich text content is visible.
- User can continue editing the note.
- Save status is visible but quiet.

Suggested actions:

- Upgrade card data model to preserve both:
  - plain text preview
  - Tiptap JSON content
- DetailDrawer should render `LovcoreEditor` for note type.
- Avoid making cards themselves too complex; keep masonry calm and mymind-like.

## Step 4: Content Model Upgrade

Current note save mostly stores plain text. This is not enough for rich editor features.

Introduce a structured note body:

```ts
interface LovcoreDocumentBody {
  kind: 'tiptap';
  json: unknown;
  text: string;
  html?: string;
}
```

Card display should use `text` for preview. Detail editor should use `json`.

Do not overdesign the database layer yet, but avoid trapping the app in plain text.

## Step 5: Export / Download

Export should be implemented after Tiptap JSON is saved.

Recommended phases:

Phase 1:

- Copy plain text.
- Export `.txt`.
- Export `.md`.
- Export `.html`.

Phase 2:

- Export `.pdf`.
- Export `.docx`.

Phase 3:

- Export `.json`.
- Export selected cards/spaces as a bundle.

Implementation note:

PDF/DOCX export should use structured content, not screenshot hacks. The conversion pipeline should start from Tiptap JSON or HTML.

## Step 6: Ghost AI Assistance

The user wants Cursor-like inline AI inside Quick Note and Note Detail.

Do not implement this as a chatbot panel first.

Desired behavior:

- AI autocomplete shows faint inline ghost text after the user pauses.
- `Tab` or right arrow accepts autocomplete.
- AI correction underlines questionable text quietly.
- `Tab` cycles correction suggestions if no autocomplete is active.
- `Enter` accepts current correction.
- `Esc` clears suggestions.

Reference project:

`C:\Users\CHOU\Desktop\jiyi`

Reference concepts:

- `ghostScanner.ts`
- `autocompleteScanner.ts`
- `GhostOverlay.tsx`
- `api/revision/ghost-scan.ts`
- `api/revision/autocomplete.ts`

Lovcore should eventually implement this around a shared editor layer, not only Quick Note.

Suggested structure:

```txt
src/ai/
  router.ts
  types.ts
  providers/
    openai.ts
    anthropic.ts
  tasks/
    autocomplete.ts
    ghostCorrect.ts
    rewrite.ts
    summarize.ts
    transcribe.ts

src/components/ghost/
  GhostOverlay.tsx
  ghostTypes.ts

src/services/editor/
  autocompleteScanner.ts
  ghostScanner.ts
```

## AI Router Principle

Do not scatter AI calls across random components.

Frontend components should call a unified task interface, such as:

```ts
aiRouter.run('autocomplete', payload)
aiRouter.run('ghostCorrect', payload)
aiRouter.run('rewrite', payload)
aiRouter.run('transcribe', payload)
```

The router decides provider/model/task handling.

This keeps future OpenAI, Claude, local model, transcription, and rewriting features manageable.

## Design Guardrails

- Preserve mymind-like calmness.
- Avoid noisy panels and visible feature explanations inside the app.
- Keep cards simple.
- Put full power in detail/editor views.
- Quick Note must feel immediate and low-friction.
- Dark mode must be treated as a first-class design, not inverted colors.
- Do not place all AI features in one component or one miscellaneous folder.

## Verification Expectations

After each change:

- Run `npm run lint`.
- Run `npm run build`.
- If a visual interaction is touched, manually verify in browser.
- Do not ignore the Vite chunk warning caused by Tiptap unless no functional change is needed; it is currently a warning, not a failure.
