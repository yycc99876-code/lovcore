# Lovcore Ghost AI Specification

Last updated: 2026-05-23

This document defines the planned Cursor-like inline AI behavior for Lovcore's editor. This is a **future implementation spec**, not a current feature.

## Overview

Ghost AI provides subtle, inline writing assistance directly in the LovcoreEditor. It should feel like a quiet writing companion — not a chatbot, not a panel, not a popup.

## Architecture

### Components

```
src/components/ghost/
  GhostOverlay.tsx       ← Renders ghost text and correction underlines
  ghostTypes.ts          ← Ghost-specific types

src/services/editor/
  autocompleteScanner.ts ← Debounced trigger for autocomplete
  ghostScanner.ts        ← Debounced trigger for ghost correction
```

### Integration Point

Ghost AI attaches to `LovcoreEditor`, not to `QuickNoteCard` or `DetailDrawer` specifically. This means ghost assistance works everywhere the editor is used.

### AI Routing

All AI calls go through the router:

```ts
import { aiRouter } from '../ai';

// Autocomplete
const result = await aiRouter.run('autocomplete', { prefix: editor.getText() });

// Ghost correction
const result = await aiRouter.run('ghostCorrect', { fullText, cursorPosition });
```

UI components never import provider code directly.

## Behavior Spec

### 1. Autocomplete (Ghost Text)

**Trigger**: User pauses typing for ~800-1200ms.

**Display**:
- Faint, semi-transparent text appears inline after the cursor.
- Ghost text color: `--text-secondary` at ~35% opacity in light mode, ~30% in dark mode.
- No border, no background, no icon — just subtle text.

**Interaction**:
- `Tab` → Accept the full autocomplete suggestion.
- `Right Arrow` (at end of typed text) → Accept one word at a time.
- Any other key → Dismiss ghost text and continue typing normally.
- `Esc` → Clear ghost text if visible.

**Implementation Notes**:
- Use a Tiptap decoration (inline widget) to render ghost text.
- Ghost text must not be part of the document content.
- Debounce the AI call: fire only after the user stops typing for 800-1200ms.
- Cancel pending requests if the user resumes typing.
- Show a very subtle loading indicator (optional, e.g., a tiny pulsing dot near the cursor).

### 2. Ghost Correction (Underline Suggestions)

**Trigger**: User pauses for ~1500-2500ms after typing a word/phrase. OR after autocomplete is dismissed.

**Display**:
- A subtle colored underline (not red squiggly — that feels like an error).
- Underline color: a muted coral or amber, depending on severity.
- No popup, no tooltip on initial appearance.

**Interaction**:
- `Tab` (when no autocomplete is active) → Cycle through correction suggestions.
- `Enter` → Accept the current correction suggestion.
- `Esc` → Dismiss the correction.
- Clicking the underlined text → Show suggestion inline (optional, phase 2).

**Implementation Notes**:
- Use Tiptap marks (e.g., custom `Decoration`) to render underlines.
- Correction suggestions are stored in memory, not in the document.
- Only check the paragraph/line near the cursor, not the full document.
- Most corrections should be small: typos, grammar, punctuation.
- The AI should not suggest style rewrites as "corrections."

### 3. Voice Dictation (Phase 2)

**Trigger**: User clicks microphone button or uses keyboard shortcut.

**Display**:
- A subtle recording indicator (pulsing dot or waveform).
- Transcribed text appears inline at the cursor.

**Interaction**:
- Click microphone again or press shortcut to stop.
- Transcription uses ASR-specific model via the AI router.

## Design Guardrails

- Ghost AI must NEVER feel intrusive.
- No popups, modals, or sidebars for ghost suggestions.
- No "AI is thinking" spinners in the editor.
- No audible sounds or haptic feedback.
- Ghost text and underlines must be visually distinct from real content.
- Dark mode must be treated as first-class, not inverted colors.
- Performance: AI calls must not block the editor. Use async + cancellation.

## Model Selection

| Feature | Model Tier | Why |
|---|---|---|
| Autocomplete | `fast` (qwen3.6-flash) | Low latency, short output |
| Ghost correction | `fast`, fallback `balanced` | Most corrections are small |
| Voice transcription | `asrRealtime` / `asrFile` | Dedicated ASR models |

## Implementation Priority

1. Autocomplete ghost text (highest value, most visible feature)
2. Ghost correction underlines
3. Voice dictation

## Technical Notes

### Tiptap Decorations for Ghost Text

```ts
// Conceptual — not final implementation
const ghostDecoration = Decoration.inline(
  cursorPos,
  cursorPos,
  {
    class: 'ghost-text',
    'data-ghost': suggestionText,
  }
);
```

### Cancellation Pattern

```ts
let abortController: AbortController | null = null;

async function requestAutocomplete(prefix: string) {
  abortController?.abort();
  abortController = new AbortController();

  try {
    const result = await aiRouter.run('autocomplete', { prefix });
    if (!abortController.signal.aborted) {
      showGhostText(result.suggestion);
    }
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      console.error('Autocomplete failed:', e);
    }
  }
}
```

### Debounce Scanners

```ts
// autocompleteScanner.ts
export function createAutocompleteScanner(editor: Editor, delay = 1000) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    onInput() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const prefix = editor.getText().slice(0, editor.state.selection.anchor);
        requestAutocomplete(prefix);
      }, delay);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      clearGhostText();
    },
  };
}
```

## Acceptance Criteria (for future implementation)

- [ ] Ghost text appears after user pauses typing.
- [ ] Tab accepts full ghost text.
- [ ] Right arrow accepts word-by-word.
- [ ] Any typing dismisses ghost text.
- [ ] Correction underline appears after longer pause.
- [ ] Tab cycles correction suggestions.
- [ ] Enter accepts correction.
- [ ] Esc clears all suggestions.
- [ ] Works in dark and light mode.
- [ ] No editor lag or jank.
- [ ] AI calls are debounced and cancellable.
