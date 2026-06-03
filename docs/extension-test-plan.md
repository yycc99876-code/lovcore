# Lovcore Clipper v3 — Manual Test Plan

## Prerequisites
- Chrome browser with the extension loaded (developer mode)
- Logged in to lovcore.com
- At least one Lovcore tab open

---

## 1. Popup Save — Normal Webpage

**Steps:**
1. Navigate to any https:// webpage (e.g., https://example.com)
2. Click the Lovcore Clipper icon in the toolbar
3. Verify: popup shows page title, domain, favicon, and screenshot preview
4. Verify: save type indicator shows "PAGE"
5. Click "Save to Lovcore"
6. Verify: button shows spinner → "Saved" with green animation
7. Verify: popup auto-closes after ~1 second
8. Verify: Lovcore tab opens/focuses and the clip appears

**Expected:** Clip saved successfully with title, URL, and screenshot.

---

## 2. Popup Save — With Selected Text

**Steps:**
1. Navigate to any webpage with text content
2. Select some text on the page (at least 10 characters)
3. Click the Lovcore Clipper icon
4. Verify: popup shows "Selected text" section with the selection preview
5. Verify: save type indicator shows "SELECTION"
6. Click "Save to Lovcore"
7. Verify: saved successfully

**Expected:** Clip saved with selected text and source page URL.

---

## 3. Keyboard Shortcut Save

**Steps:**
1. Navigate to any webpage
2. Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac)
3. Verify: Lovcore tab opens and clip is saved (no popup involved)

**Expected:** Silent save via keyboard shortcut.

---

## 4. Right-Click Save — Page

**Steps:**
1. Right-click on any webpage (not on a link or image)
2. Select "Save to Lovcore" from context menu
3. Verify: Lovcore tab opens and clip is saved

**Expected:** Page saved with screenshot.

---

## 5. Right-Click Save — Selection

**Steps:**
1. Select text on a webpage
2. Right-click on the selection
3. Select "Save selection to Lovcore"
4. Verify: saved with selected text

**Expected:** Selection clip saved.

---

## 6. Right-Click Save — Link

**Steps:**
1. Right-click on a link
2. Select "Save link to Lovcore"
3. Verify: Lovcore opens with the link URL (no screenshot expected)

**Expected:** Link saved without screenshot.

---

## 7. Right-Click Save — Image

**Steps:**
1. Right-click on an image
2. Select "Save image to Lovcore"
3. Verify: Lovcore opens with the image URL

**Expected:** Image clip saved with image URL.

---

## 8. Login State Detection — Logged In

**Steps:**
1. Open lovcore.com and log in
2. Click the Lovcore Clipper icon
3. Verify: no login warning banner shown

**Expected:** Clean popup, no warnings.

---

## 9. Login State Detection — Not Logged In

**Steps:**
1. Open lovcore.com but log out (or use incognito without logging in)
2. Click the Lovcore Clipper icon
3. Verify: warning banner "Please log in to Lovcore first" shown
4. Verify: "Open Lovcore" button appears
5. Click "Open Lovcore"
6. Verify: opens lovcore.com in a new tab

**Expected:** User is warned, not shown fake success.

---

## 10. Login State Detection — Lovcore Not Open

**Steps:**
1. Close all Lovcore tabs
2. Click the Lovcore Clipper icon
3. Verify: banner says "Open Lovcore to enable clipping"
4. Try saving anyway
5. Verify: clip is sent (opens Lovcore tab)

**Expected:** Warning shown but save still attempts.

---

## 11. Restricted Page — chrome:// URL

**Steps:**
1. Navigate to `chrome://extensions`
2. Click the Lovcore Clipper icon
3. Verify: shows "Restricted page" and error message
4. Verify: save button is disabled

**Expected:** Clear error, no crash.

---

## 12. Network Error

**Steps:**
1. Disconnect from network (or use DevTools to go offline)
2. Try to save a page
3. Verify: error message mentions network
4. Verify: "Retry" and "Save link only" buttons appear

**Expected:** Error with actionable recovery options.

---

## 13. Retry Queue — Failed Save

**Steps:**
1. Close all Lovcore tabs
2. Save a page (popup or shortcut)
3. If save fails, verify: error shown with retry options
4. Click "Recent clips" at the bottom
5. Verify: failed clip appears in "Failed clips" section
6. Click "Retry" on the failed clip
7. Verify: clip is retried and (if Lovcore is now open) succeeds

**Expected:** Failed clips persist and can be retried.

---

## 14. Retry Queue — Entry Cleanup

**Steps:**
1. Manually add a queue entry with an old timestamp (via DevTools: `chrome.storage.local`)
2. Open the popup
3. Verify: expired entries are cleaned up

**Expected:** Old entries (>24h) are removed automatically.

---

## 15. Clip History

**Steps:**
1. Save several clips (3+)
2. Click "Recent clips" in the popup footer
3. Verify: history panel shows recent clips with title, domain, type, time, status
4. Verify: max 3 items shown in the compact view
5. Verify: failed clips show red dot, successful clips show green dot

**Expected:** History displays correctly.

---

## 16. Note Input

**Steps:**
1. Open the popup on any page
2. Type a note in the "Add a note" input
3. Save the clip
4. Verify: note appears in the saved clip on Lovcore

**Expected:** Note is passed through to Lovcore.

---

## 17. Save Type Indicator

**Steps:**
1. Test each clip type (page, selection, link, image)
2. Verify: the save type dot and label update correctly for each

**Expected:** Correct type displayed.

---

## 18. Screenshot Fallback

**Steps:**
1. Save a page where screenshot fails (e.g., very tall page, or restricted)
2. Verify: clip still saves (without screenshot)
3. Verify: no crash or infinite loading

**Expected:** Graceful degradation.

---

## 19. Popup Keyboard Shortcut

**Steps:**
1. Open the popup
2. Press `Ctrl+Enter`
3. Verify: same as clicking the save button

**Expected:** Keyboard shortcut works inside popup.

---

## 20. ZIP Installation

**Steps:**
1. Download lovcore-clipper.zip
2. Extract to a folder
3. Verify: folder contains manifest.json, background.js, popup.html, popup.css, popup.js, icons/, lib/
4. Load as unpacked extension in chrome://extensions
5. Verify: extension loads without errors
6. Test basic save functionality

**Expected:** Clean install from ZIP.

---

## Verification Checklist

- [ ] manifest.json parses correctly
- [ ] background.js has no syntax errors (check in chrome://extensions → Errors)
- [ ] popup.js has no syntax errors
- [ ] No Google Fonts or remote resource loading
- [ ] No eval() or new Function() in code
- [ ] Permissions match manifest declaration
- [ ] Popup doesn't auto-close on failure
- [ ] Popup auto-closes on success (after ~1s)
- [ ] Queue entries survive popup close/reopen
- [ ] History survives popup close/reopen
- [ ] Screenshot data not stored in history (only in queue if pending retry)
- [ ] No tokens stored in extension storage
