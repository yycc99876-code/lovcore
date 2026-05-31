# Lovcore Ghost AI And Voice Capture Implementation Goal

Last updated: 2026-05-23

This document is the execution spec for implementing Lovcore's editor-side Ghost AI, correction, and voice capture features.

The goal is not to write more planning documents. The goal is to make Quick Note and DetailDrawer feel like a real AI-native writing surface.

## Reference Project

Use this project as a reference implementation:

```txt
C:\Users\CHOU\Desktop\jiyi
```

Read these files before coding:

```txt
C:\Users\CHOU\Desktop\jiyi\src\components\ghost\GhostOverlay.tsx
C:\Users\CHOU\Desktop\jiyi\src\services\ai\autocompleteScanner.ts
C:\Users\CHOU\Desktop\jiyi\src\services\ai\ghostScanner.ts
C:\Users\CHOU\Desktop\jiyi\src\style.css
C:\Users\CHOU\Desktop\jiyi\src\App.tsx
C:\Users\CHOU\Desktop\jiyi\src\services\ai\voiceInput.ts
C:\Users\CHOU\Desktop\jiyi\api\revision\autocomplete.ts
C:\Users\CHOU\Desktop\jiyi\api\revision\ghost-scan.ts
```

Important:

- `jiyi` is a reference, not the final standard.
- Do not copy its UI directly.
- Do not copy its fragile range handling directly.
- Migrate the useful interaction logic and make it stable for Lovcore.

## Current Lovcore Problem

Lovcore currently has mock API wiring, but the editor experience is not product-ready.

Known issue:

```txt
vite-api-mock.ts returns fixed text:
"这是一段 AI 自动生成的补全文本。"
```

This must not appear as if it were real AI. Remove this fixed fake user-facing phrase or replace it with a dev-only mock that is clearly safe and non-misleading.

## Non-Negotiable Rules

- Do not only write docs.
- Do not only create empty files.
- Do not expose API keys to frontend code.
- Do not change the landing page default entry.
- Do not build Smart Spaces or semantic search before the editor AI writing path works.
- Quick Note and DetailDrawer must share the same LovcoreEditor-based Ghost AI behavior.

## Target Files

Create or update these files as needed:

```txt
src/components/ghost/GhostOverlay.tsx
src/components/ghost/GhostInlineCompletion.tsx
src/components/ghost/GhostCorrectionLayer.tsx
src/components/ghost/ghostTypes.ts

src/components/voice/VoiceRecorderIndicator.tsx

src/hooks/useEditorShortcutRouter.ts
src/hooks/useGhostAutocomplete.ts
src/hooks/useGhostCorrection.ts
src/hooks/useVoiceCapture.ts
src/hooks/useAudioCue.ts

src/services/editor/autocompleteScanner.ts
src/services/editor/ghostCorrectionScanner.ts
src/services/editor/voiceRecorder.ts
src/services/editor/editorRangeUtils.ts

src/components/editor/LovcoreEditor.tsx
src/index.css
vite-api-mock.ts
```

Ghost and voice features must be mounted through `LovcoreEditor`, not only through `QuickNoteCard`.

## Architecture

Separate responsibilities:

- `GhostOverlay.tsx`: render ghost completion, correction underlines, hints.
- `useGhostAutocomplete.ts`: debounce, request, stale response handling, accept/dismiss.
- `useGhostCorrection.ts`: scan, cache, range validation, accept/ignore.
- `useVoiceCapture.ts`: Insert/Ctrl+Insert recording state machine.
- `useEditorShortcutRouter.ts`: one keyboard priority gate.
- `useAudioCue.ts`: Web Audio API cue sounds.
- `src/services/editor/*`: API calls and editor utilities.

Avoid scattering global keyboard listeners across unrelated components.

## Shortcut Priority

All editor shortcuts must obey this order:

1. Slash command menu
2. Voice recording
3. Ghost autocomplete
4. Ghost correction
5. Normal editor behavior

Rules:

- Slash menu open:
  - `Tab` or `ArrowDown`: next option
  - `Shift+Tab` or `ArrowUp`: previous option
  - `Enter` or `Space`: execute command
  - Ghost autocomplete must not trigger
- Autocomplete visible:
  - `Tab`: accept autocomplete
  - `ArrowRight`: accept only at paragraph end
  - `Esc`: dismiss
- Correction active and autocomplete not visible:
  - `Tab`: cycle suggestion
  - `Enter`: accept current suggestion
  - `Esc`: clear suggestions
- Voice recording:
  - `Insert` keyup: stop push-to-talk
  - `Esc`: cancel recording
  - Ghost accept/correction shortcuts must not run

Implementation requirements:

- Handle `event.repeat`.
- Handle `event.isComposing`.
- Only process shortcuts when the relevant LovcoreEditor is focused.
- Do not steal keys from normal `input`, `textarea`, search fields, or editable titles.

## Priority 1: Cursor-Like Ghost Autocomplete

Implement inline autocomplete similar to Cursor.

Behavior:

1. User types in LovcoreEditor.
2. User pauses for about 900ms-1400ms.
3. Request autocomplete.
4. Show a faint inline ghost text at the caret.
5. Ghost text is not part of the document until accepted.
6. `Tab` accepts.
7. `ArrowRight` accepts when cursor is at paragraph end.
8. `Esc` dismisses.
9. Typing, Backspace, cursor movement, blur, or click elsewhere clears stale completion.

Do not trigger autocomplete when:

- Slash command menu is open.
- IME composition is active.
- Text range is selected.
- Voice recording is active.
- Current block is empty or too short.
- Current text ends with `/`.

Visual:

- Inline, quiet, gray text.
- No card.
- No bubble.
- No user-facing "AI generated" label.
- Light and dark modes must both look intentional.

API:

```txt
POST /api/ai/autocomplete
```

Request shape:

```ts
{
  paragraph: string
  beforeCursor: string
  afterCursor: string
  fullContext: string
}
```

Response shape:

```ts
{
  suggestion: string
  confidence?: number
}
```

Stale response requirement:

Every request must have a request key based on:

- note/card id if available
- paragraph text
- cursor position
- editor revision/version

If a response returns after the editor has changed, discard it silently.

Use `AbortController` if practical.

## Priority 2: Ghost Correction

Implement quiet correction underlines.

Behavior:

1. User pauses for about 600ms-1000ms.
2. Scan current paragraph.
3. Show 1-3 subtle underlines for correction suggestions.
4. If no autocomplete is visible, `Tab` cycles suggestions.
5. `Enter` accepts active suggestion.
6. `Esc` clears suggestions.
7. User can ignore suggestions for the session.

API:

```txt
POST /api/ai/ghost-correct
```

Request:

```ts
{
  paragraphText: string
  fullContext: string
}
```

Response:

```ts
{
  suggestions: [
    {
      original: string
      replacement: string
      reason: string
      severity: 'minor' | 'moderate' | 'major'
      from?: number
      to?: number
    }
  ]
}
```

Range rules:

- Prefer backend-provided `from/to`.
- If `from/to` is missing, only apply when the match is unambiguous.
- If `original` appears multiple times and position cannot be confirmed, do not auto-apply.
- Before applying, confirm the paragraph has not changed.
- Do not replace the wrong range.

## Priority 3: Voice Capture

Implement keyboard-first voice capture.

First version may use mock transcript, but the interaction must be real.

Shortcuts:

- Hold `Insert`: push-to-talk.
- Release `Insert`: stop push-to-talk and insert transcript.
- `Ctrl + Insert`: toggle hands-free mode.
- `Esc`: cancel active recording.
- Selected text + `Insert`: voice becomes rewrite instruction, not inserted text.
- Selected text + `Ctrl + Insert`: hands-free voice instruction mode.

State:

```ts
type VoiceCaptureState =
  | { status: 'idle' }
  | { status: 'push-to-talk-recording'; startedAt: number; target: VoiceTarget }
  | { status: 'hands-free-recording'; startedAt: number; target: VoiceTarget }
  | { status: 'transcribing'; target: VoiceTarget }
  | { status: 'ready'; transcript: string; target: VoiceTarget }
  | { status: 'error'; message: string }

type VoiceTarget =
  | { kind: 'insert-at-cursor'; cursorPos: number }
  | { kind: 'rewrite-selection'; from: number; to: number; selectedText: string }
```

Mock first version:

- Hold/release `Insert` should insert a mock transcript at the cursor.
- Example mock transcript: `这是语音输入的模拟文本`
- If text is selected, do not insert. Show a rewrite preview flow instead.
- Clearly report that ASR is mocked.

Real later version:

- Use `MediaRecorder`.
- Upload audio as `multipart/form-data`.
- Call `/api/ai/transcribe`.
- API key must remain server-only.

## Priority 4: Advanced Audio Cues

Add high-quality Web Audio API cue sounds.

Create:

```txt
src/hooks/useAudioCue.ts
```

Requirements:

- Use Web Audio API, no external audio files.
- Unlock AudioContext after first user interaction.
- Keep volume subtle.
- Respect user mute/reduced-motion settings where practical.
- Push-to-talk and hands-free sounds must be clearly different.

Cue API:

```ts
audioCue.play('push-start')
audioCue.play('push-stop')
audioCue.play('handsfree-start')
audioCue.play('handsfree-stop')
audioCue.play('transcribing')
audioCue.play('error')
```

Suggested sound design:

### push-start

Short, light, glass/water-drop feel.

- sine + quiet triangle layer
- frequency: 587Hz -> 740Hz
- duration: 90ms-130ms
- attack: 8ms
- decay: 90ms
- gain peak: 0.045
- lowpass: 4200Hz
- optional delay: 45ms, feedback 0.12

### push-stop

Soft downward close.

- frequency: 520Hz -> 392Hz
- duration: 120ms
- gain peak: 0.035
- decay: 110ms

### handsfree-start

More spacious, like entering a quiet recording space.

- chord tones: 261.63Hz, 392Hz, 523.25Hz
- duration: 420ms-650ms
- attack: 30ms
- release: 420ms
- gain peak: 0.035
- stereo delay: 90ms
- feedback: 0.18
- lowpass: 3600Hz

### handsfree-stop

Soft descending ending.

- descending tones: 523Hz -> 392Hz -> 261Hz
- duration: 380ms
- gain peak: 0.032
- release: 300ms

### transcribing

One very light shimmer, not a loop.

- sine 880Hz
- duration: 160ms
- gain peak: 0.018

### error

Low, short, non-alarming.

- 180Hz -> 140Hz
- duration: 180ms
- gain peak: 0.035
- lowpass: 900Hz

When to play:

- Insert keydown recording starts: `push-start`
- Insert keyup recording stops: `push-stop`
- Ctrl+Insert starts hands-free: `handsfree-start`
- Ctrl+Insert stops hands-free: `handsfree-stop`
- Transcription starts: `transcribing`
- Permission/API error: `error`

## Priority 5: Voice UI

Create:

```txt
src/components/voice/VoiceRecorderIndicator.tsx
```

Show:

- Recording
- Hands-free
- Transcribing
- Error
- Duration

Visual direction:

- Small.
- Quiet.
- Does not block the editor text.
- Light mode: white/translucent surface.
- Dark mode: dark/translucent surface.
- No loud red/green UI.

## Things Not To Copy From jiyi

Do not inherit these weaknesses:

- Global key listeners that steal keys everywhere.
- DOM `indexOf` as the only correction range strategy.
- No `event.repeat` handling.
- Stale AI responses appearing after the editor changed.
- Only supporting `P/H1/H2/H3` and ignoring lists/quotes/tables.
- Treating Web Speech as the final voice solution.
- Moving jiyi's more tool-like UI directly into Lovcore.

## Verification

Run:

```txt
npm run lint
npm run build
```

Manual QA required:

### Ghost Autocomplete

- Quick Note: type text, pause, see faint inline ghost text.
- `Tab` accepts.
- `ArrowRight` accepts at paragraph end.
- `Esc` dismisses.
- Continue typing clears old completion.
- Slash menu open: `Tab` controls slash menu, not autocomplete.
- IME composition does not trigger ghost.
- DetailDrawer has the same behavior.

### Ghost Correction

- Pause after text with a known issue.
- Underline appears.
- `Tab` cycles suggestion.
- `Enter` accepts.
- `Esc` clears.
- Repeated words do not get replaced incorrectly.

### Voice

- Hold `Insert`: plays push-start cue and enters recording state.
- Release `Insert`: plays push-stop cue and inserts mock transcript.
- `Ctrl + Insert`: plays handsfree-start and enters hands-free mode.
- Press `Ctrl + Insert` again: plays handsfree-stop and stops.
- `Esc`: cancels recording.
- Selected text + `Insert`: enters rewrite preview, does not insert transcript directly.
- Push-to-talk and hands-free cues sound clearly different.
- Voice indicator works in light and dark mode.

## Final Report

At the end, report:

- Files changed.
- What is truly implemented.
- What is mocked.
- What is not implemented.
- Manual QA results.
- Whether lint/build passed.

