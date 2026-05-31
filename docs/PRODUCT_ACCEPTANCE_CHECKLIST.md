# Lovcore Product Acceptance Checklist

> Date: 2026-05-24 | Status: Initial Audit
> Each item is a manual verification action. Check off when confirmed working.

---

## 1. Quick Note

- [ ] Click the "+" Quick Note card in the masonry layout — a floating editor panel should appear with a portal overlay and backdrop blur
- [ ] Type text in the editor, then press Escape — the panel should close with a 220ms animation
- [ ] Click outside the panel — the panel should close
- [ ] Click the fullscreen toggle button — the panel should expand to fill the viewport
- [ ] Click fullscreen toggle again — the panel should return to floating position
- [ ] Type a note and click Save — a new card should appear in the masonry layout with the note content
- [ ] Reopen a saved note by clicking its card — the editor should load the previous content
- [ ] In dark mode, the Quick Note panel should render with dark theme styles
- [ ] The "New Quick Note" text should be translated when switching locale (zh/en)
- [ ] Create a note with rich formatting (bold, heading) — reopen it and verify formatting is preserved

## 2. Slash Command

- [ ] Type `/` in the editor — a command menu popup should appear
- [ ] Type `/标题` — the menu should filter to show Heading 1/2/3 with pinyin match
- [ ] Type `/biaoti` — same headings should appear via pinyin alias
- [ ] Press ArrowDown — the selection should move to the next command
- [ ] Press ArrowUp — the selection should move to the previous command
- [ ] Press Enter on "Heading 1" — the current paragraph should become an H1
- [ ] Press Escape — the slash menu should close
- [ ] Type `/图片` — the Image command should appear
- [ ] Select Image command — a `window.prompt()` dialog should appear asking for URL (current behavior)
- [ ] Type `/表格` — the Table command should appear and insert a table on selection
- [ ] Type `/无匹配内容` — an empty state message should appear
- [ ] Press Space while menu is open — the highlighted item should be selected

## 3. Ghost Autocomplete

- [ ] Type a sentence and stop typing for ~420ms — ghost text should appear as faint inline completion
- [ ] Press Tab — the ghost text should be accepted and merged into the editor content
- [ ] Press ArrowRight at end of line — ghost text should be accepted
- [ ] Press Escape — ghost text should be dismissed
- [ ] Start typing while ghost text is visible — the ghost text should disappear
- [ ] Move cursor with arrow keys — ghost text should dismiss
- [ ] Open slash menu with `/` — ghost autocomplete should not trigger while slash menu is open
- [ ] Start voice recording — ghost autocomplete should not trigger while recording
- [ ] When ghost text is accepted, a brief flash animation should play (520ms)
- [ ] Ghost text should appear at the correct cursor position, not at the start of the line

## 4. Ghost Correction

- [ ] Type a paragraph with a common Chinese typo (e.g., `进一布`) — a colored underline should appear after ~760ms
- [ ] Hover over the underlined text — a correction popover should show the replacement and reason
- [ ] Press Tab — the active correction suggestion should cycle to the next one
- [ ] Press Enter — the correction should be applied (text replaced)
- [ ] Press Escape — all corrections should be cleared
- [ ] Multiple corrections in the same paragraph should all be visible simultaneously
- [ ] Corrections should show different severity levels with different underline colors
- [ ] Accept a correction — the correction should be removed from the list and remaining corrections should stay
- [ ] Ignore a correction (Escape) — the same suggestion should not reappear in the same session
- [ ] Correction underlines should update position correctly when scrolling

## 5. Inline AI Rewrite

- [ ] Select text in the editor and press Ctrl+K — an inline AI command bar should appear
- [ ] The compact bar should show a text input and expand button
- [ ] Click expand — a full panel should appear with preset instructions (e.g., "Shorten", "Expand", "Formal")
- [ ] Type a custom instruction (e.g., "Make this more poetic") and press Enter
- [ ] A loading state should appear while the AI processes
- [ ] After processing, a diff preview should show the original and rewritten text
- [ ] Click Accept — the selected text should be replaced with the rewrite
- [ ] Click Reject — the rewrite should be discarded and original text kept
- [ ] Press Escape during any stage — the AI command should be dismissed
- [ ] The diff preview should clearly distinguish added and removed text

## 6. Voice Push-to-Talk

- [ ] Press Insert key — voice recording should start and the VoiceRecorderIndicator overlay should appear
- [ ] The overlay should show a recording animation and live transcript area
- [ ] Speak in Chinese — interim transcription text should appear in real-time
- [ ] Release Insert key — recording should stop and the transcript should be inserted at the cursor
- [ ] An audio cue sound should play when recording starts
- [ ] An audio cue sound should play when recording stops
- [ ] If recording is less than 600ms, it should be ignored (minimum duration guard)
- [ ] Press Escape while recording — recording should be cancelled without inserting text
- [ ] The duration timer should update every second during recording
- [ ] In dark mode, the voice overlay should render with dark theme

## 7. Voice Hands-Free

- [ ] Press Ctrl+Insert — hands-free mode should activate (toggle on)
- [ ] The overlay should indicate hands-free mode (different visual from push-to-talk)
- [ ] Speak — text should be transcribed and inserted continuously
- [ ] Press Ctrl+Insert again — hands-free mode should deactivate (toggle off)
- [ ] An audio cue should play for hands-free start and stop
- [ ] While in hands-free mode, the live transcript should auto-scroll
- [ ] If no speech is detected, the system should remain listening without error

## 8. DetailDrawer Autosave

- [ ] Open a note card's detail drawer — the editor should load with existing content
- [ ] Type new content and wait 800ms — the save status should change to "Saving..." then "Saved"
- [ ] Close the drawer while changes are unsaved — `flushSave` should be called before close
- [ ] Edit the title field — the title should update on the card in the masonry view
- [ ] The save status indicator should show: idle / saving / saved / error states
- [ ] Add a tag to a note — the tag should persist after closing and reopening
- [ ] Remove a tag — the tag should be removed from the item
- [ ] Rapid typing should not cause multiple simultaneous save calls (debounce)
- [ ] The drawer should animate in/out with GSAP slide-in animation

## 9. Export (txt/html/markdown)

- [ ] Open a note's detail drawer — export buttons should be visible
- [ ] Click "Copy Markdown" — the clipboard should contain the note in markdown format
- [ ] Click "Copy Text" — the clipboard should contain plain text (no formatting)
- [ ] Click "Download Markdown" — a `.md` file should download
- [ ] Click "Download Text" — a `.txt` file should download
- [ ] Click "Download HTML" — a `.html` file should download that opens correctly in a browser
- [ ] Click "Download Word" — a `.doc` file should download
- [ ] Click "Print PDF" — a print dialog should appear with the note formatted for printing
- [ ] Exported HTML should contain the note's title and body content
- [ ] Exported markdown should preserve headings, bold, italic, and lists

## 10. Spaces / Smart Spaces

- [ ] Click "Spaces" in the header navigation — the Spaces view should appear
- [ ] Default spaces (Keynotes, Agentic Coding, etc.) should be visible with color dots
- [ ] Each space card should show a preview stack of matched items
- [ ] Each space card should show the item count
- [ ] Click a space card — the view should filter to show only items matching that space
- [ ] Click "Create New" — a modal should appear with name and color selection
- [ ] Enter a name and pick a color, then confirm — a new space should appear in the grid
- [ ] Delete a user-created space — it should be removed from the grid
- [ ] Try to delete a system space — it should be protected and not deletable
- [ ] The SpacePills row should show all user spaces as horizontal pills
- [ ] Click a space pill — the main view should filter to that space's items
- [ ] Create a smart space from search filters — it should save the filter criteria

## 11. Search / Filter

- [ ] Click the search input in the header — it should receive focus
- [ ] Type a search query — the masonry grid should filter in real-time to matching items
- [ ] Search should match across title, content, summary, tags, keyClaims, and whyItMatters
- [ ] Search should be case-insensitive
- [ ] Click a type filter chip (e.g., "Images") — only image items should be shown
- [ ] Combine text search with type filter — both filters should apply (AND logic)
- [ ] Clear the search input — all items should reappear (respecting active space)
- [ ] Scroll down — the header should collapse to a compact sticky header with search
- [ ] Type in the compact search input — filtering should work the same
- [ ] When a space is active, search should further filter within that space

## 12. Serendipity

- [ ] Click "Serendipity" in the navigation — the discovery view should appear
- [ ] An intro screen should be visible with a "Show me" button
- [ ] Click "Show me" — cards should appear one at a time
- [ ] Swipe/drag a card to the left — the card should animate off-screen (forget)
- [ ] Swipe/drag a card to the right — the card should animate off-screen (keep)
- [ ] Background cards should have orbital floating animations
- [ ] An ambient soundscape should play during the discovery experience
- [ ] Click on a card — it should open the detail drawer
- [ ] When all cards are reviewed, an empty/end state should appear
- [ ] In dark mode, the serendipity view should use dark theme styling

## 13. Landing Page

- [ ] On first load (or after vault lock), the landing page should appear
- [ ] Scroll down — horizontal slide transitions should trigger via ScrollTrigger
- [ ] The "LOVCORE" title letters should have fountain particle effects on hover/click
- [ ] The canvas grain noise overlay should be visible
- [ ] Hover over the CTA button — magnetic hover effect should activate
- [ ] Scroll to the vault section — a password input should be visible
- [ ] Enter any value and submit — the app should unlock and transition to the main view
- [ ] The landing page should look correct in both light and dark mode
- [ ] All images referenced in the landing page should load (check `/images/*.png`)
- [ ] The page should scroll smoothly (Lenis smooth scroll)

## 14. Light / Dark Mode

- [ ] Click the theme toggle in the header — the app should switch between light and dark mode
- [ ] The theme should persist after page reload (localStorage)
- [ ] All text should be readable in both modes (no white-on-white or black-on-black)
- [ ] The editor should render correctly in both themes
- [ ] Ghost overlay (autocomplete + correction) should be visible in both themes
- [ ] The voice recorder overlay should be styled for both themes
- [ ] The landing page should render correctly in both themes
- [ ] Cards in the masonry layout should have appropriate contrast in both themes
- [ ] The search header should be styled correctly in both themes
- [ ] The detail drawer should render correctly in both themes
- [ ] Export output (HTML/PDF) should respect the current theme

## 15. Drag & Drop / Ingestion

- [ ] Drag an image file onto the app — an "analyzing" card should appear
- [ ] After ~2.5s, the card should transition to "ready" with the image displayed
- [ ] Drag a PDF file onto the app — a document card should appear
- [ ] Paste a URL into the search bar and press Enter — a link card should appear with scraped metadata
- [ ] Drop a text file — its content should be imported as a note
- [ ] Drop multiple files — each should create its own card independently
- [ ] Delete an ingested item — the associated IndexedDB file should also be cleaned up
