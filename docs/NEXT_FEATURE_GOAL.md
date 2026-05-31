# Lovcore Next Feature Goal

Last updated: 2026-05-23

This document is for the AI agent that works after the Editor-to-Memory foundation has been audited and stabilized.

Do not use this document to skip the current foundation audit. First confirm the existing editor, autosave, export, and backend boundary are real and usable. Then proceed with this next feature goal.

## Mission

Turn Lovcore from a rich memory editor into an AI-native private memory workspace.

The next phase should add real product capabilities, not just empty architecture:

- Cursor-like AI writing assistance
- voice-to-note capture
- AI rewrite actions
- semantic search foundation
- Smart Spaces
- ingestion pipeline
- durable persistence direction
- privacy/security boundaries

## Implementation Phasing

The next AI agent should not try to build everything at once. Implement in layers:

### Required Delivery Style

This document is not asking for folders only. Each phase must produce visible, manually testable behavior.

For every feature below, the next AI agent must deliver:

- user-facing interaction
- keyboard behavior
- light mode and dark mode styling
- internal API contract
- mock fallback when backend/model is not ready
- manual QA notes in `docs/NEXT_FEATURE_AUDIT.md`

Do not mark a priority complete just because types, routes, or placeholder files exist.

### Phase 1: Local Interaction Mock

Build the editor UI and keyboard behavior using mock responses.

Examples:

- ghost autocomplete returns a deterministic short phrase
- ghost correction returns one fake underline suggestion
- voice transcription can be simulated with a typed mock transcript if microphone/backend is not ready
- rewrite can return a deterministic transformed string

Goal:

- Verify interaction design, shortcut priority, overlay placement, and Tiptap range handling.
- Verify that the editor still feels like mymind: quiet, spacious, and fast.
- Verify that AI does not visually dominate the writing surface.

### Phase 2: Internal API Contract

Connect frontend to internal `/api/*` endpoints.

Goal:

- Confirm frontend never touches provider keys.
- Confirm request/response payloads are stable.
- Keep mock mode available for development.

### Phase 3: Real Provider Integration

Connect the backend API layer to Bailian models.

Goal:

- Real autocomplete
- real correction
- real transcription
- real rewrite

### Phase 4: Quality Pass

Tune:

- debounce timing
- latency
- keyboard responsiveness
- dark mode
- edge cases
- user cancellation behavior

Do this phase after each major feature, not only at the end.

## Detailed Implementation Map

Use or create these modules. File names can change if the existing project has a better local pattern, but responsibilities must remain separated.

```txt
src/components/ghost/
  GhostOverlay.tsx              # one mounted overlay/controller for autocomplete + correction
  GhostInlineCompletion.tsx     # inline Cursor-like ghost text rendering
  GhostCorrectionLayer.tsx      # underline decorations + hover/active tooltip
  GhostSuggestionMenu.tsx       # compact correction/rewrite popover if needed
  ghostTypes.ts                 # shared front-end types

src/components/voice/
  VoiceRecorderIndicator.tsx    # small recording/transcribing indicator
  VoicePermissionHint.tsx       # quiet microphone permission/error UI

src/hooks/
  useEditorShortcutRouter.ts    # single priority gate for slash/voice/ghost/correction
  useVoiceCapture.ts            # Insert and Ctrl+Insert capture state machine
  useGhostAutocomplete.ts       # debounce, request, accept, dismiss
  useGhostCorrection.ts         # debounce, scan, cache, accept, ignore

src/services/editor/
  autocompleteScanner.ts        # calls src/ai/client autocomplete
  ghostCorrectionScanner.ts     # calls src/ai/client ghost-correct
  voiceRecorder.ts              # MediaRecorder wrapper
  editorRangeUtils.ts           # ProseMirror/Tiptap range helpers

src/ai/
  client.ts                     # thin frontend fetch client only
  types.ts                      # request/result types only

api/ai/
  autocomplete.ts
  ghost-correct.ts
  rewrite.ts
  transcribe.ts
```

Architecture rule:

- UI components render state only.
- hooks own interaction state.
- `src/services/editor/*` owns editor/range/recording utilities.
- `src/ai/client.ts` only calls internal APIs.
- provider keys and model selection stay in `api/ai/*`.

## Editor State Machines

Implement explicit states. Avoid many booleans fighting each other.

### Ghost Autocomplete State

```ts
type GhostAutocompleteState =
  | { status: 'idle' }
  | { status: 'debouncing'; requestKey: string }
  | { status: 'loading'; requestKey: string; abortController: AbortController }
  | { status: 'visible'; requestKey: string; range: EditorRange; completion: string }
  | { status: 'dismissed'; requestKey: string }
  | { status: 'error'; requestKey: string; message: string }
```

Rules:

- Any document change invalidates the current `requestKey`.
- Any stale response must be ignored.
- Accepting inserts text at the saved range and creates one undo step.
- Dismissing does not modify the document.

### Correction State

```ts
type GhostCorrectionState =
  | { status: 'idle' }
  | { status: 'scanning'; paragraphKey: string }
  | { status: 'ready'; suggestions: CorrectionSuggestion[]; activeIndex: number | null }
  | { status: 'error'; message: string }
```

Rules:

- Cache by paragraph text hash.
- Ignore suggestions by stable key: `paragraphHash + from + to + replacement`.
- If the paragraph changes, rescan after debounce.

### Voice State

```ts
type VoiceCaptureState =
  | { status: 'idle' }
  | { status: 'permission-requested' }
  | { status: 'push-to-talk-recording'; startedAt: number; target: VoiceTarget }
  | { status: 'hands-free-recording'; startedAt: number; target: VoiceTarget }
  | { status: 'transcribing'; target: VoiceTarget }
  | { status: 'ready'; transcript: string; target: VoiceTarget }
  | { status: 'error'; message: string }

type VoiceTarget =
  | { kind: 'insert-at-cursor'; cursorPos: number }
  | { kind: 'rewrite-selection'; range: EditorRange; selectedText: string }
```

Rules:

- `Insert` keydown enters `push-to-talk-recording`.
- `Insert` keyup exits push-to-talk recording and starts transcription.
- `Ctrl + Insert` toggles `hands-free-recording`.
- `Esc` cancels recording or pending preview.
- Do not start a second recording while already recording/transcribing.
- Do not lose the original cursor/selection target while transcribing.


## Required Prerequisite

Before starting this document, verify that these files exist and are accurate:

- `docs/NEXT_PLAN.md`
- `docs/TARGET_DEFINITION.md`
- `docs/GOAL_COMMAND.md`
- `docs/IMPLEMENTATION_AUDIT.md`

If `docs/IMPLEMENTATION_AUDIT.md` does not exist, create it first by auditing current P1-P7 completion.

## Recommended Execution Order

The next AI agent should execute in this order:

1. Audit the current editor and backend runtime.
2. Add the shortcut router.
3. Add Cursor-like ghost autocomplete in mock mode.
4. Add ghost correction underlines in mock mode.
5. Add voice capture keyboard behavior in mock mode.
6. Add selected-text voice instruction rewrite in mock mode.
7. Connect autocomplete/correction/rewrite/transcribe to internal APIs.
8. Connect APIs to Bailian models only after the frontend interactions are stable.
9. Run dark-mode pass.
10. Run manual QA and write `docs/NEXT_FEATURE_AUDIT.md`.

Do not start with semantic search, Smart Spaces, ingestion, or persistence until Quick Note AI writing and voice behavior is stable. Those are important, but they are second wave for this document.

## Product Principles

Lovcore should continue to feel like mymind:

- calm
- private
- low-friction
- visually quiet
- search-first
- no folder management burden
- AI-native but not chatbot-first

AI should feel like an invisible assistant that appears only when useful.

## Global Editor Shortcut Contract

All editor features must obey this keyboard contract. Do not invent conflicting shortcuts without updating this section.

| Shortcut | Context | Behavior |
| --- | --- | --- |
| `/` | Editor focused, no IME composition | Opens slash command menu. |
| `ArrowUp` / `ArrowDown` | Slash menu open | Move slash command selection. |
| `Tab` | Slash menu open | Move slash command selection down. |
| `Shift + Tab` | Slash menu open | Move slash command selection up. |
| `Enter` / `Space` | Slash menu open | Execute selected slash command. |
| `Insert` hold | Editor focused, no slash menu | Push-to-talk voice dictation. Start on keydown, stop on keyup. |
| `Ctrl + Insert` | Editor focused | Toggle hands-free voice dictation. |
| `Esc` | Hands-free voice active | Stop/cancel hands-free recording. |
| `Tab` | Ghost autocomplete visible, no slash menu | Accept autocomplete. |
| `ArrowRight` | Ghost autocomplete visible, cursor at paragraph end | Accept autocomplete. |
| `Esc` | Ghost autocomplete visible | Dismiss autocomplete. |
| `Tab` | Correction suggestions active, no autocomplete | Cycle correction suggestion. |
| `Enter` | Correction suggestion active | Accept correction. |
| `Esc` | Correction suggestions active | Clear corrections. |
| `Ctrl/Cmd + Enter` | Editor focused | Save current note if supported. |

Priority order:

1. Slash command menu.
2. Voice recording.
3. Ghost autocomplete.
4. Ghost correction.
5. Selected-text rewrite menu.
6. Normal editor behavior.

IME rule:

- During Chinese/Japanese/Korean IME composition, do not trigger slash search, autocomplete, correction, or voice shortcuts except explicit mouse controls.

Selection rule:

- If text is selected and the user starts voice input, treat voice transcript as an AI rewrite instruction by default.
- If no text is selected, treat voice transcript as dictation to insert at cursor.

## Shortcut Router Implementation

Create a single shortcut router instead of scattering key handling across many components.

Recommended ownership:

```txt
LovcoreEditor
  -> useEditorShortcutRouter()
       receives editor instance
       receives slash menu state
       receives ghost autocomplete state/actions
       receives correction state/actions
       receives voice state/actions
```

Keydown behavior:

- First check `event.isComposing`.
- Then check whether the slash command menu is open.
- Then check voice shortcuts.
- Then check ghost autocomplete.
- Then check correction suggestions.
- Then allow normal editor behavior.

Keyup behavior:

- `Insert` keyup should stop push-to-talk recording only if push-to-talk started from this editor.
- Ignore unrelated keyup events.

Why:

- `Tab` is already used by slash menu, ghost autocomplete, and correction cycling.
- Without a router, these features will fight each other.
- This is the source of "not sensitive enough" or "jumps several times" keyboard bugs.

Keyboard stability requirements:

- Use `event.preventDefault()` only when the feature actually consumes the key.
- Ignore `event.repeat` for movement/record-start actions that should happen once.
- For arrow/tab menu navigation, update active index exactly one step per keydown.
- Do not attach duplicate global listeners on every editor render.
- Clean up listeners on unmount.

## Priority A: Real AI Runtime Contract

### Goal

Make the AI layer callable in development without exposing provider keys to the frontend.

### Required Work

Review current `api/` folder.

Determine whether it is:

- a real runnable dev server
- Vercel/Next-style placeholder routes
- plain TypeScript stubs

If current Vite setup cannot run `api/` routes, choose one of these strategies:

1. Add a small Express/Fastify dev server.
2. Add Vercel-compatible local route support.
3. Write a clear migration plan to Next.js API Routes.

Do not pretend an API exists if Vite cannot serve it.

### Required Endpoints

At minimum, make these endpoints callable or clearly stubbed with runtime instructions:

```txt
POST /api/ai/autocomplete
POST /api/ai/ghost-correct
POST /api/ai/rewrite
POST /api/ai/summarize
POST /api/ai/transcribe
```

### Acceptance

- Frontend can call an internal API endpoint.
- Provider key is read only from server environment.
- No `VITE_*` key is used for provider secrets.
- If the endpoint is mocked, the mock mode is explicit and documented.

## Priority B: Cursor-Like Ghost Autocomplete

### Goal

Add inline ghost autocomplete inside `LovcoreEditor`.

When this document says "like Cursor", it means the following concrete behavior:

- AI suggestions are inline, not in a chat panel.
- The user keeps typing in the editor without switching modes.
- AI text appears as faint ghost text exactly after the cursor.
- Accepting the suggestion feels like completing the current sentence.
- Rejecting the suggestion requires no explicit UI action; typing naturally dismisses it.
- The feature never blocks typing, selection, slash commands, or IME composition.
- The UI should feel like a helper sitting inside the editor, not a modal assistant.

### Visual Behavior

Ghost autocomplete must render as inline muted text at the current cursor position.

Visual details:

- color: low-contrast gray in light mode
- color: muted warm gray/blue-gray in dark mode
- opacity around `0.42-0.58`
- no card, no bubble, no border
- should align with current text baseline
- should inherit current block font size
- should not push layout until accepted
- should disappear immediately when stale

Example:

```txt
User typed:   Lovcore 应该像一个安静的
Ghost text:                           私人记忆空间
```

The ghost text is visible but not part of the document until accepted.

### Cursor-Like UX Rules

The feature should obey these rules:

- Never suggest while the slash menu is open.
- Never suggest while the user is using Chinese IME composition.
- Never suggest when a text range is selected.
- Never suggest in the middle of a word unless explicitly supported later.
- Never suggest large paragraphs.
- Never show more than one inline suggestion at a time.
- Never auto-accept.
- Never show a loading spinner in the text flow.
- Never steal focus.
- Must be undo-friendly after accept.

### What "Like Cursor" Means In This Product

Implement this exact feeling:

1. User is typing normally in Quick Note.
2. User pauses.
3. A faint continuation appears directly after the caret.
4. The user can ignore it and continue typing; the suggestion disappears.
5. The user can press `Tab`; the suggestion becomes real text.
6. The user can press `Esc`; the suggestion disappears.
7. The user never has to open a chat panel.

Do not implement these as the first version:

- floating AI chat
- multi-option completion list
- large suggestion card
- "Generating..." label inside the text
- automatic replacement
- global assistant sidebar

The first version should feel closer to Cursor inline completion than to Notion AI.

### Rendering Implementation Requirement

Use a Tiptap/ProseMirror decoration or equivalent inline overlay.

Preferred approach:

- Store the current completion as state outside the editor document.
- Render it at the cursor position using decoration/overlay.
- Keep it visually inline with the current text.
- On accept, insert the completion into the actual Tiptap document.
- On reject/stale, remove only the decoration/overlay.

Do not insert the completion into the editor document until the user accepts it.

### Request Identity Requirement

Every autocomplete request must have a `requestKey`.

Build `requestKey` from:

- note id if available
- current paragraph text
- cursor position
- editor revision/version if available

When the response returns:

- if `requestKey` still matches current editor state, show it
- if not, discard it silently

This prevents late AI responses from appearing in the wrong place.

### Trigger Rules

Autocomplete should trigger when:

- editor is focused
- selection is collapsed
- current paragraph has at least 4 characters
- cursor is near paragraph end
- user has paused around 900ms-1400ms
- slash command menu is not open
- no composition/IME input is active
- no voice recording is active
- no selected-text rewrite menu is open

Do not trigger when:

- the user just accepted a slash command
- the user is holding `Insert`
- the user is recording hands-free voice
- there is selected text
- the current block is a code block unless later explicitly supported
- the current text ends with `/`
- the paragraph text is only whitespace

### Interaction

- `Tab` accepts autocomplete if autocomplete is visible.
- `ArrowRight` accepts autocomplete if cursor is at paragraph end.
- `Esc` clears autocomplete.
- Typing any normal character clears stale autocomplete.
- `Backspace` clears stale autocomplete.
- Moving the cursor clears autocomplete.
- Clicking elsewhere clears autocomplete.

### Keyboard Priority

Keyboard handling priority must be:

1. If slash command menu is open:
   - `Tab` changes slash menu selection.
   - `Enter` / `Space` executes slash command.
   - Ghost autocomplete is disabled.

2. Else if voice push-to-talk is recording:
   - `Insert` release stops recording.
   - Other editor shortcuts should not accept ghost text.

3. Else if autocomplete is visible:
   - `Tab` accepts autocomplete.
   - `ArrowRight` accepts autocomplete only when cursor is at paragraph end.
   - `Esc` dismisses autocomplete.

4. Else if correction suggestions are active:
   - `Tab` cycles correction suggestions.
   - `Enter` accepts selected correction.
   - `Esc` clears suggestions.

5. Else:
   - normal editor behavior.

### Output Rules

AI must return short continuation only:

- usually 5-20 Chinese characters, or one short phrase
- no explanations
- no markdown unless context demands it
- do not repeat existing text
- do not include quotation marks around the completion
- do not include labels such as "建议：" or "补全："
- do not include multiple alternatives
- if unsure, return empty completion

### Suggested Files

```txt
src/components/ghost/GhostOverlay.tsx
src/components/ghost/GhostInlineCompletion.tsx
src/components/ghost/ghostTypes.ts
src/hooks/useGhostAutocomplete.ts
src/services/editor/autocompleteScanner.ts
src/services/editor/editorRangeUtils.ts
src/ai/client.ts
```

### Backend Task

`POST /api/ai/autocomplete`

Payload idea:

```ts
{
  noteId?: string
  paragraph: string
  beforeCursor: string
  afterCursor: string
  locale: 'zh' | 'en' | 'mixed'
}
```

Result idea:

```ts
{
  completion: string
  confidence?: number
  reason?: string
}
```

### Acceptance

- Ghost text appears inline.
- `Tab` accepts it.
- `ArrowRight` accepts it at paragraph end.
- `Esc` dismisses it.
- It does not conflict with slash command navigation.
- It does not create visible layout jumps.
- It does not trigger during IME composition.
- It does not trigger while holding voice input.

### Manual QA For Cursor-Like Autocomplete

Record these in `docs/NEXT_FEATURE_AUDIT.md`:

1. Type a Chinese sentence and pause.
   - Expected: one faint inline suggestion appears after the caret.
2. Continue typing normally.
   - Expected: old suggestion disappears immediately.
3. Press `Tab` while suggestion is visible.
   - Expected: suggestion becomes real text in one undo step.
4. Press `ArrowRight` while cursor is at paragraph end.
   - Expected: suggestion is accepted.
5. Move cursor to the middle of a paragraph.
   - Expected: no paragraph-end completion appears.
6. Type `/` and open slash menu.
   - Expected: autocomplete does not appear and `Tab` moves slash selection.
7. Use Chinese IME composition.
   - Expected: autocomplete does not interrupt composition.
8. Switch dark mode.
   - Expected: ghost text is visible but quiet, not bright or card-like.

## Priority C: Ghost Correction Suggestions

### Goal

Add quiet inline correction suggestions.

This is not a grammar-checking sidebar. It should be subtle:

- underlines questionable text
- shows suggestion on hover or active state
- keyboard can cycle and accept suggestions
- does not open a large panel
- does not interrupt writing

### Trigger Rules

Correction scanning should trigger when:

- user pauses around 600ms-1000ms
- current paragraph changed
- paragraph is long enough
- no active slash command menu
- no active autocomplete
- no voice recording is active
- the user is not composing Chinese IME text

### Suggestion Types

Support:

- typo correction
- leftover pinyin
- awkward expression
- repeated word
- unclear sentence
- style improvement
- punctuation cleanup
- business tone improvement
- overlong sentence split suggestion

### Interaction

- `Tab` cycles correction suggestions only if no autocomplete is active.
- `Enter` accepts current correction.
- `Esc` clears active suggestions.
- User can ignore a suggestion for the session.
- Mouse hover shows a compact suggestion tooltip.
- Clicking a suggestion can select it.
- Accepting a suggestion should preserve surrounding formatting when possible.

### Visual Behavior

Corrections should look quiet:

- Use a subtle underline, not a red error wall.
- Light mode underline: soft amber/coral.
- Dark mode underline: muted coral.
- Active suggestion can have a slightly stronger underline.
- Tooltip should be compact:
  - original text
  - replacement text
  - short reason
  - accept / ignore actions if useful

Do not use a large grammar sidebar in this phase.

### Range Handling

The backend may return `original` text instead of exact ProseMirror positions. The frontend must map suggestions carefully:

- Prefer locating the suggestion inside the current paragraph.
- If multiple matches exist, use nearest match to cursor or skip ambiguous suggestion.
- Do not replace text outside the current paragraph accidentally.
- Store ignored suggestions by stable key:

```ts
`${paragraphHash}:${original}:${replacement}`
```

### Backend Task

`POST /api/ai/ghost-correct`

Payload idea:

```ts
{
  paragraph: string
  locale: 'zh' | 'en' | 'mixed'
  tone?: 'neutral' | 'business' | 'creative'
}
```

Result idea:

```ts
{
  suggestions: Array<{
    id: string
    original: string
    replacement: string
    reason: string
    confidence: number
    category?: 'typo' | 'style' | 'clarity' | 'punctuation' | 'tone'
  }>
}
```

### Acceptance

- Suggestions render as subtle underlines.
- Accepting replaces the right text range in Tiptap.
- Ignoring prevents immediate repeated suggestion.
- No provider key leaks.
- Suggestion UI works in light and dark mode.

## Priority D: Voice-To-Note Capture

### Goal

Add voice input to Quick Note and eventually DetailDrawer.

This should support:

- quick dictation
- transcript insertion
- optional AI cleanup
- optional AI rewrite into structured note
- hands-free dictation
- selected-text voice instructions

### UX Direction

Add voice input as both keyboard-first and UI-button-first.

The user explicitly wants:

- **Push-to-talk voice-to-text:** hold `Insert`.
- **Hands-free voice mode:** press `Ctrl + Insert`.
- **Selected-text voice instruction:** select text, then use voice to describe how to change it.

Add a small microphone control in Quick Note editor too, but keyboard behavior is primary.

States:

- idle
- recording
- hands-free recording
- transcribing
- transcript ready
- failed

Do not make this visually loud.

### Voice Mode 1: Push-To-Talk Dictation

Shortcut:

```txt
Hold Insert
```

Behavior:

1. User presses and holds `Insert`.
2. Lovcore starts recording immediately.
3. A small low-noise recording indicator appears near the editor.
4. User speaks.
5. User releases `Insert`.
6. Lovcore stops recording.
7. Audio is sent to internal transcription API.
8. Transcript is inserted at the current cursor position.

Rules:

- Use `keydown` to start and `keyup` to stop.
- Ignore repeated `keydown` events while the key is held (`event.repeat`).
- Prevent the browser/default editor action if needed.
- If editor is not focused, focus the editor before inserting transcript.
- If slash command menu is open, do not start recording.
- If browser does not allow capturing `Insert`, provide fallback UI button and document limitation.
- If microphone permission is denied, show quiet error.
- Do not send empty/very short audio.
- If the user presses `Esc` while holding `Insert`, cancel the recording and do not transcribe.

Insertion behavior:

- Save the cursor position when recording starts.
- If the document changes while recording, prefer current cursor position if still valid.
- Insert transcript as plain text by default.
- If transcript ends without punctuation and surrounding text is Chinese, do not force English punctuation.
- After insertion, place cursor after inserted transcript.
- One undo action should remove the inserted transcript.

### Voice Mode 2: Hands-Free Dictation

Shortcut:

```txt
Ctrl + Insert
```

Behavior:

1. User presses `Ctrl + Insert`.
2. Lovcore toggles hands-free recording on.
3. User can release keys and continue speaking.
4. Recording indicator stays visible.
5. Press `Ctrl + Insert` again to stop.
6. `Esc` also stops/cancels hands-free recording.
7. Transcript is inserted into editor when transcription completes.

Use cases:

- Long note dictation.
- Brainstorming.
- Walking through a thought without holding a key.

Rules:

- `Ctrl + Insert` starts hands-free mode when idle.
- `Ctrl + Insert` stops hands-free mode when active.
- `Esc` cancels active hands-free recording.
- If transcribing has already started, `Esc` cancels the pending result if possible.
- Clearly distinguish hands-free mode from push-to-talk.
- Show recording duration.
- Add a safety max recording duration, for example 3-5 minutes in prototype.
- Do not auto-submit to AI rewrite unless user chooses cleanup/rewrite.

Visual behavior:

- Show a small fixed or editor-local microphone indicator.
- Indicator text can be minimal: `Recording`, `Transcribing`, `Saved`.
- In dark mode, use dark surface and muted border.
- In light mode, use white surface and soft shadow.
- Do not cover the typing cursor.

### Voice Mode 3: Selected-Text Voice Instruction

This is important.

If the user selects text and uses voice input, the transcript should be treated as an instruction by default, not inserted blindly.

Example:

1. User selects a paragraph.
2. User holds `Insert`.
3. User says: "帮我改得更像商业访谈开头，短一点。"
4. Lovcore transcribes the instruction.
5. Lovcore sends selected text + instruction to AI rewrite.
6. Replacement is previewed or applied according to rewrite UX.

Shortcut behavior:

- Selected text + hold `Insert`: record a rewrite instruction.
- Selected text + `Ctrl + Insert`: hands-free instruction mode.

Exact behavior:

1. Capture selected range and selected text at recording start.
2. Record voice.
3. Transcribe voice into instruction text.
4. Send selected text and instruction text to `/api/ai/rewrite`.
5. Show a compact preview near the selected text or in a quiet inline replacement preview.
6. User presses `Enter` or clicks apply to replace selected text.
7. User presses `Esc` to cancel and keep original text.

Important:

- Do not immediately overwrite selected text after transcription.
- Do not insert the spoken instruction into the document by default.
- If the selected range no longer exists when AI returns, discard result and show quiet stale-result notice.
- Preserve marks when possible: bold, italic, links, headings.

Result options:

- Preview replacement before applying, preferred for first version.
- Allow `Enter` to apply replacement.
- Allow `Esc` to cancel.
- Preserve original formatting where possible.

### Voice Mode 4: Selection Plus Dictation Append

Sometimes the user may want to replace selected text with dictated text directly.

Provide a future mode or menu option:

- "Replace with transcript"
- "Use transcript as AI instruction"

Default should be "Use transcript as AI instruction" when text is selected.

### Basic Flow

```txt
User clicks microphone
  -> browser records audio
  -> user stops recording
  -> audio sent to internal transcribe API
  -> transcript returned
  -> transcript inserted into LovcoreEditor
```

### Keyboard Flow Summary

```txt
No selection:
  Hold Insert -> record -> release Insert -> transcribe -> insert transcript at cursor

No selection:
  Ctrl + Insert -> start hands-free -> Ctrl + Insert or Esc -> transcribe -> insert transcript

Text selected:
  Hold Insert -> record instruction -> release Insert -> transcribe -> rewrite selected text -> preview

Text selected:
  Ctrl + Insert -> start hands-free instruction -> stop -> transcribe -> rewrite selected text -> preview
```

### Voice API And Browser Implementation

Frontend:

- Use `navigator.mediaDevices.getUserMedia({ audio: true })`.
- Use `MediaRecorder` for prototype recording.
- Save audio chunks while recording.
- On stop, create a `Blob`.
- Send to `/api/ai/transcribe` as `multipart/form-data`.
- Do not send audio directly to Bailian from frontend.

Backend:

- Receive uploaded audio.
- Validate file size and mime type.
- Route to the selected ASR model.
- Return transcript only.
- Keep API key server-only.

Prototype fallback:

- If real microphone or backend is not ready, add a dev-only mock transcript path.
- The keyboard flow must still be testable with mock transcript.

### Enhanced Flow

After transcript:

- Insert raw transcript.
- Offer quiet AI cleanup action:
  - "整理成笔记"
  - "改成文章"
  - "提炼任务"
  - "润色表达"

When selected text exists:

- Do not insert transcript by default.
- Treat transcript as an instruction for `/api/ai/rewrite`.
- Show a compact preview of the rewritten result.

### Backend Task

`POST /api/ai/transcribe`

Use model routing:

- live dictation: `BAILIAN_MODEL_ASR_REALTIME`
- uploaded audio file: `BAILIAN_MODEL_ASR_FILE`
- context-aware transcription: Qwen Omni ASR env vars

Payload idea:

```ts
{
  audio: Blob | File
  mode: 'push-to-talk' | 'hands-free' | 'selected-text-instruction'
  locale?: 'zh' | 'en' | 'mixed'
  contextText?: string
  selectedText?: string
  noteId?: string
}
```

Result idea:

```ts
{
  transcript: string
  durationMs?: number
  confidence?: number
}
```

### Acceptance

- Microphone permission handled gracefully.
- Holding `Insert` records and releasing `Insert` stops.
- `Ctrl + Insert` toggles hands-free mode.
- `Esc` cancels active hands-free recording.
- Transcript inserts into editor.
- If text is selected, transcript can become a rewrite instruction.
- Errors are quiet and understandable.
- API key remains server-only.

### Manual QA For Voice

The next AI agent must test and record these cases in `docs/NEXT_FEATURE_AUDIT.md`:

1. Click into an empty Quick Note, hold `Insert`, speak or use mock transcript, release `Insert`.
   - Expected: transcript appears at cursor.
2. Type a sentence, move cursor to the middle, hold `Insert`, release.
   - Expected: transcript inserts near current cursor, not at top of note.
3. Select text, hold `Insert`, release.
   - Expected: transcript becomes rewrite instruction and a preview appears.
4. Select text, press `Ctrl + Insert`, speak/mock, press `Ctrl + Insert` again.
   - Expected: hands-free instruction mode stops and rewrite preview appears.
5. Press `Ctrl + Insert` with no selection.
   - Expected: hands-free dictation starts; stopping inserts transcript.
6. Press `Esc` while recording.
   - Expected: recording cancels, no transcript is inserted.
7. Open slash command menu and press/hold `Insert`.
   - Expected: slash menu keeps priority; voice does not start.
8. Switch dark mode and repeat push-to-talk.
   - Expected: indicator and preview are readable and visually coordinated.

## Priority E: AI Rewrite Actions

### Goal

Add selected-text AI rewrite actions inside `LovcoreEditor`.

This is different from ghost autocomplete. It is user-initiated.

### UX

When user selects text, expose a quiet AI action menu.

Actions:

- improve writing
- make shorter
- make more formal
- make more casual
- translate to Chinese
- translate to English
- summarize
- expand
- turn into bullet list
- continue writing
- use voice instruction

### Selected Text Menu Behavior

When text is selected:

- Show a compact floating action menu near selection.
- Do not cover the selected text.
- Menu should be quiet and minimal.
- Default actions should be visible as icons or short labels.
- Include a microphone action for voice instruction.

Suggested menu actions:

```txt
Rewrite
Shorter
Polish
Formal
Translate
Bullet
Voice
```

### Voice Instruction In Selection Menu

If user clicks the microphone action while text is selected:

1. Start recording.
2. User speaks an instruction.
3. Transcribe instruction.
4. Send selected text + instruction to rewrite API.
5. Show preview.
6. User accepts or cancels.

Keyboard equivalent:

- Select text.
- Hold `Insert`.
- Speak instruction.
- Release `Insert`.
- Preview rewrite.

This is the same product behavior as:

```txt
select text -> speak what you want -> Lovcore rewrites that selection
```

The spoken sentence is not inserted into the note. It becomes the AI instruction.

Examples:

```txt
Selected:
这个产品可以保存链接、图片和笔记。

Voice:
帮我改得更像商业科技产品介绍，短一点。

Expected replacement preview:
Lovcore 是一个面向创作者的私人记忆工作台，用来快速保存链接、图片、资料和想法。
```

```txt
Selected:
AI will change software.

Voice:
翻译成中文，语气更像红杉的技术访谈摘要。

Expected replacement preview:
AI 正在重新定义软件的生产方式：从工具交付，转向由智能体完成具体工作。
```

### Rewrite Preview Behavior

Do not blindly replace selected text for complex rewrites.

Preferred flow:

```txt
Selected text
  -> AI rewrite
  -> compact preview
  -> Enter applies
  -> Esc cancels
```

Preview UI should show:

- revised text
- short action label
- accept
- cancel
- retry
- original/revised comparison if space allows

For simple commands like "make shorter", direct apply can be acceptable later, but preview is safer first.

### Rewrite Range Requirement

When rewrite starts:

- save the selected range
- save selected text
- save editor revision if available
- save marks/block type if practical

When rewrite result returns:

- if selection/range is still valid, show preview
- if user has edited that same range, do not silently replace it
- if stale, show quiet message and discard result

Applying rewrite:

- replace only the originally selected range
- preserve surrounding content
- preserve block structure where possible
- create one undo step

### Suggested Files

```txt
src/components/editor/SelectionAIMenu.tsx
src/components/editor/RewritePreview.tsx
src/hooks/useSelectedTextRewrite.ts
src/services/editor/rewriteSelection.ts
src/services/editor/editorRangeUtils.ts
src/ai/client.ts
```

### Backend Task

`POST /api/ai/rewrite`

Payload:

```ts
{
  selectedText: string
  surroundingContext?: string
  instruction: string
  instructionSource?: 'menu' | 'typed' | 'voice'
  locale?: 'zh' | 'en' | 'mixed'
}
```

Result:

```ts
{
  replacement: string
}
```

### Acceptance

- User can select text and run rewrite.
- User can select text and use voice as rewrite instruction.
- Replacement can be previewed or directly applied.
- Undo works through Tiptap history.
- Rewrite does not destroy surrounding formatting.

### Manual QA For Rewrite

Record these in `docs/NEXT_FEATURE_AUDIT.md`:

1. Select a short sentence and click `Shorter`.
   - Expected: preview appears, original text remains until accepted.
2. Press `Esc` on preview.
   - Expected: preview closes, original remains unchanged.
3. Select text and use voice instruction.
   - Expected: spoken transcript becomes instruction, not inserted text.
4. Accept rewrite.
   - Expected: only selected range changes.
5. Press undo.
   - Expected: original selected text returns.
6. Try rewrite in dark mode.
   - Expected: menu and preview are readable and visually calm.

## Priority F: Semantic Search Foundation

### Goal

Prepare search to move beyond plain keyword matching.

Do not overbuild vector search immediately if persistence is not ready, but design the seam.

### Search Layers

1. Keyword search:
   - title
   - text
   - tags
   - type

2. Structured search:
   - content type
   - space
   - date
   - source

3. Semantic search:
   - embedding-based
   - query intent
   - related cards

### Required Work

Create a search service boundary:

```txt
src/services/search/
  searchTypes.ts
  keywordSearch.ts
  semanticSearch.ts
  ranking.ts
```

Initial implementation can keep semantic search as a stub if no vector DB exists.

### Acceptance

- Search logic is not scattered across components.
- Existing search still works.
- Future semantic search has a clear integration point.

## Priority G: Smart Spaces

### Goal

Upgrade Spaces from manual collections toward AI-assisted Smart Spaces.

### Manual Spaces

Keep manual Spaces:

- user creates space
- picks color
- assigns cards

### Smart Spaces

Smart Space should be rule-based or AI-assisted:

Examples:

- "AI business interviews"
- "design inspiration"
- "agent coding"
- "research PDFs"
- "saved videos"

Smart Space rule model:

```ts
{
  id: string
  name: string
  color: string
  mode: 'manual' | 'smart'
  query?: string
  filters?: {
    types?: string[]
    tags?: string[]
    semanticQuery?: string
  }
}
```

### Acceptance

- Manual Spaces still work.
- Smart Space can be created as a saved query/filter.
- UI remains close to mymind, not a complex dashboard.

## Priority H: Ingestion Pipeline

### Goal

Create a real pipeline for saved content.

Every captured item should eventually pass through:

```txt
capture -> parse -> enrich -> store -> index -> render
```

### Content Types

Support:

- note
- link
- image
- PDF
- video
- audio
- code snippet

### Required Work

Define service boundary:

```txt
src/services/ingestion/
  capture.ts
  parse.ts
  enrich.ts
  index.ts
  renderHints.ts
```

Existing `src/lib/ingestion.ts` can be refactored gradually.

### Acceptance

- Existing drag/drop and quick note still work.
- New pipeline does not break current mock cards.
- Each item has enough metadata for future AI/search.

## Priority I: Persistence Direction

### Goal

Clarify how Lovcore data survives reloads and future cloud sync.

### MVP Options

Local prototype:

- localStorage or IndexedDB
- no auth
- fast iteration

Production direction:

- Supabase Postgres
- Supabase Storage or Cloudflare R2
- row-level security
- user auth later

### Required Work

Document and implement a storage abstraction:

```txt
src/services/storage/
  storageTypes.ts
  localStorageAdapter.ts
  indexedDbAdapter.ts
  remoteStorageAdapter.ts
```

### Acceptance

- Notes/cards persist across reloads in prototype.
- Storage calls are abstracted.
- Future Supabase migration is possible.

## Priority J: Privacy And Security Review

### Goal

Because Lovcore is a private memory product, privacy cannot be an afterthought.

### Required Checks

- No API key in frontend bundle.
- No API key in docs.
- No API key in Git.
- AI calls clearly indicate what content is sent.
- Future user setting can disable AI processing.
- File uploads have size/type limits.

### Acceptance

Create or update:

`docs/PRIVACY_SECURITY_NOTES.md`

Include:

- current risks
- future auth plan
- AI data handling plan
- env variable rules

## Priority K: Product QA Report

### Goal

At the end of this next feature phase, create a report.

Required file:

`docs/NEXT_FEATURE_AUDIT.md`

Include:

- completed features
- incomplete features
- files changed
- manual test checklist
- known UX issues
- backend runtime status
- security notes
- recommended next phase

Minimum required QA table:

```md
| Area | Test | Expected | Result | Notes |
| --- | --- | --- | --- | --- |
| Shortcut router | Slash menu open + Tab | Moves slash selection only | Pass/Fail | |
| Autocomplete | Pause after sentence | Inline ghost appears | Pass/Fail | |
| Autocomplete | Tab | Accepts ghost text | Pass/Fail | |
| Voice | Hold Insert | Starts recording | Pass/Fail | |
| Voice | Release Insert | Stops and transcribes | Pass/Fail | |
| Voice | Ctrl+Insert | Toggles hands-free | Pass/Fail | |
| Voice rewrite | Select text + Insert | Creates rewrite preview | Pass/Fail | |
| Dark mode | Expanded note + AI UI | Colors coordinated | Pass/Fail | |
| Security | Search bundle/env | No provider key in frontend | Pass/Fail | |
```

The audit must state clearly whether each AI feature is:

- real provider-backed
- internal API mocked
- frontend mock only
- incomplete

## Stop Rules

Stop and report if:

- backend runtime strategy is unclear
- provider API cannot be called safely
- Tiptap editor abstraction becomes unstable
- feature work threatens the current working Quick Note flow
- secrets appear in frontend code

## Final Verification

Run:

```txt
npm run lint
npm run build
```

If a backend dev server is introduced, also document:

```txt
npm run dev
```

or the correct command to run both frontend and backend.

## Suggested Prompt For The Next AI

```txt
Please read:
C:\Users\CHOU\Documents\lovcore\docs\NEXT_PLAN.md
C:\Users\CHOU\Documents\lovcore\docs\TARGET_DEFINITION.md
C:\Users\CHOU\Documents\lovcore\docs\GOAL_COMMAND.md
C:\Users\CHOU\Documents\lovcore\docs\NEXT_FEATURE_GOAL.md

First confirm docs/IMPLEMENTATION_AUDIT.md exists and the Editor-to-Memory foundation is stable.
Then implement the next feature phase in NEXT_FEATURE_GOAL.md.

Do not create empty architecture only. Build usable product behavior where possible.
Do not expose API keys to frontend code.
Do not change the landing page default entry.
Run lint/build and create docs/NEXT_FEATURE_AUDIT.md before finishing.
```
