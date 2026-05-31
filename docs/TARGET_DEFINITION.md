# Lovcore Target Definition

Last updated: 2026-05-23

This document defines what "done" means for the next Lovcore milestone.

## Milestone Name

Lovcore Editor Foundation

## One Sentence Goal

Turn Lovcore from a beautiful memory-board prototype into a usable private writing and capture system with a stable rich-text editor, slash commands, editable note details, export foundations, and a clear future AI assistant architecture.

## Non-Negotiable Product Intent

Lovcore should feel closer to mymind than Notion.

This means:

- The main canvas should stay quiet.
- The user should not manage folders manually.
- Quick capture should feel instant.
- Full editing power should appear only when needed.
- AI should assist softly and contextually.
- The app should feel private, personal, and creator-oriented.

## Current Completed Baseline

The following is already present and should not be discarded casually:

- Landing page remains default entry.
- App view has Everything / Spaces / Serendipity.
- Spaces are productized separately from inline filters.
- Quick Note is a separate card, not part of the search box.
- Quick Note opens as an overlay through Portal.
- Quick Note uses Tiptap instead of textarea.
- Slash command system exists:
  - command definitions
  - Tiptap suggestion extension
  - React slash menu
  - keyboard navigation
- Light/dark mode exists.
- Logo/favicon were updated.
- `npm run lint` and `npm run build` currently pass.

## Target 1: Quick Note Overlay Completion

### Done Means

Quick Note behaves like a polished mymind-style writing card.

Requirements:

- Clicking the Quick Note card opens an enlarged overlay editor.
- Overlay stays above all masonry cards.
- Overlay uses Portal and is not affected by masonry layout.
- Background is blurred/masked.
- Editor panel appears near the original card position.
- `Esc`, outside click, and close/minimize button all close the overlay.
- Close has a visible but subtle animation.
- Fullscreen toggle works.
- Light and dark modes are visually coordinated.
- No instant disappearing.
- No layout flicker.
- No hidden card behind PDF/image/video cards.

### Not Done If

- Closing instantly removes the panel.
- The panel is covered by masonry items.
- Dark mode shows a mismatched white card.
- The editor loses focus after opening.

## Target 2: Slash Command Completion

### Done Means

Slash commands work as actual Tiptap editor commands.

Requirements:

- `/` opens menu.
- Search supports Chinese title, pinyin alias, and description.
- `ArrowDown` moves selection down.
- `ArrowUp` moves selection up.
- `Tab` moves selection down.
- `Shift+Tab` moves selection up.
- `Enter` executes selected command.
- `Space` executes selected command.
- Menu movement is stable and does not jump multiple items unexpectedly.
- `/bt1` can create Heading 1.
- `/bg` can insert a 3x3 table.
- `/dmk` can create a code block.
- `/yy` can create a quote block.
- `/tb` opens image URL prompt and inserts image.

### Not Done If

- Commands only insert Markdown-like plain text.
- `/zw` or pinyin aliases only filter but cannot execute.
- Keyboard navigation feels jumpy.
- Tab submits the command instead of changing option.

## Target 3: Shared LovcoreEditor

### Done Means

The rich-text editor is reusable and no longer trapped inside QuickNoteCard.

Requirements:

- Create `src/components/editor/LovcoreEditor.tsx`.
- QuickNoteCard uses LovcoreEditor.
- Future DetailDrawer can use LovcoreEditor.
- LovcoreEditor owns Tiptap extensions.
- LovcoreEditor emits:
  - plain text
  - Tiptap JSON
  - optionally HTML
- LovcoreEditor supports save shortcut.
- LovcoreEditor supports slash commands.

### Not Done If

- Quick Note and Detail Note have separate editor implementations.
- Editor setup is duplicated.
- Tiptap JSON cannot be extracted.

## Target 4: Structured Note Storage

### Done Means

Notes are no longer saved as plain text only.

Requirements:

Each saved rich note should preserve:

- human-readable text preview
- structured Tiptap JSON
- optional HTML
- card title/snippet

Recommended shape:

```ts
interface LovcoreDocumentBody {
  kind: 'tiptap';
  json: unknown;
  text: string;
  html?: string;
}
```

Card preview should stay simple. Full content should render in detail view.

### Not Done If

- A heading, table, quote, image, or code block disappears after saving.
- Detail view cannot reconstruct the original rich content.
- The masonry card becomes visually overloaded with full editor content.

## Target 5: Note Detail Editing

### Done Means

Saved notes can be reopened and edited.

Requirements:

- Clicking a note card opens detail view/drawer.
- Detail view uses LovcoreEditor for notes.
- Existing rich content loads into editor.
- User can edit and save changes.
- Save status is visible but quiet.
- Closing and reopening preserves changes.

### Not Done If

- Detail view is read-only.
- It only displays plain text.
- Rich structures are lost.

## Target 6: Export Foundation

### Done Means

Lovcore can export notes in basic formats.

Phase 1 target:

- Copy plain text.
- Export `.txt`.
- Export `.md`.
- Export `.html`.

Phase 2 target:

- Export `.pdf`.
- Export `.docx`.

Expected implementation:

- Export from structured document data.
- Do not use screenshots as the primary export strategy.

### Not Done If

- Export only works for plain text.
- Tables/images/code blocks are ignored.
- Export logic is mixed directly into UI components.

## Target 7: Ghost AI Design Readiness

### Done Means

The codebase is ready to add Cursor-like ghost AI assistance later.

Requirements:

- Editor abstraction exists.
- AI calls are planned through a router/service layer.
- Ghost overlay should be designed to attach to LovcoreEditor, not QuickNoteCard only.
- Reference implementation from `C:\Users\CHOU\Desktop\jiyi` is documented.

Future Ghost AI behavior:

- Autocomplete after user pause.
- Ghost text appears inline.
- `Tab` or right arrow accepts autocomplete.
- Correction suggestions appear as underlines.
- `Tab` cycles corrections when no autocomplete exists.
- `Enter` accepts selected correction.
- `Esc` clears suggestions.

### Not Done If

- AI logic is embedded directly in QuickNoteCard.
- Every AI feature lives in one random file.
- AI opens only as a disruptive chat panel.

## Target 8: AI Router Readiness

### Done Means

The future AI system has a clear place to live.

Desired structure:

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
```

The UI should eventually call task-level methods, not provider methods.

Example:

```ts
aiRouter.run('rewrite', payload)
aiRouter.run('autocomplete', payload)
aiRouter.run('transcribe', payload)
```

### Not Done If

- Components import OpenAI/Claude provider code directly.
- AI prompts are scattered across UI components.
- There is no task routing layer.

## UX Acceptance Checklist

Before calling the milestone complete, manually verify:

- Quick Note opens cleanly.
- Quick Note closes with animation.
- Slash menu appears at cursor position.
- Slash menu does not jump unexpectedly.
- Tab cycles options.
- Enter executes command.
- Space executes command.
- Dark mode editor looks intentional.
- Heading/list/table/code/quote/image work.
- Saved note can be reopened and edited.
- Export phase 1 works.

## Engineering Acceptance Checklist

Before final handoff:

- `npm run lint` passes.
- `npm run build` passes.
- No unrelated files are reverted.
- No landing page entry behavior is changed.
- No large new AI implementation is added before editor/content model is stable.
- New files are named clearly and placed in focused folders.

## Priority Order

1. Quick Note close animation.
2. Extract LovcoreEditor.
3. Structured note body.
4. Note Detail editing.
5. Basic export.
6. Ghost AI architecture.
7. Actual Ghost AI implementation.
8. Voice transcription and AI rewrite flows.

## Guidance To Next AI Agent

Do not restart product discovery from scratch. The user has already decided the near-term product direction.

Do not propose replacing the app with a 3D starfield or a Notion clone.

Focus on making the mymind-like capture/edit/search loop real, stable, and beautiful.
