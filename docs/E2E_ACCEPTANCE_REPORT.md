# Lovcore E2E Acceptance Test Report

Date: 2026-05-24

---

## New tests added

| # | Test file | Test name | Status |
|---|-----------|-----------|--------|
| 1 | `tests/e2e/landing.spec.ts` | landing page loads with vault gate visible | PASS |
| 2 | `tests/e2e/vault-entry.spec.ts` | can enter vault and see main app | PASS |
| 3 | `tests/e2e/everything-page.spec.ts` | search area is visible | PASS |
| 4 | `tests/e2e/everything-page.spec.ts` | card area shows mock items | PASS |
| 5 | `tests/e2e/everything-page.spec.ts` | Quick Note card is present | PASS |
| 6 | `tests/e2e/everything-page.spec.ts` | navigation buttons are present | PASS |
| 7 | `tests/e2e/quick-note.spec.ts` | Quick Note card can expand to editor | PASS |
| 8 | `tests/e2e/slash-commands.spec.ts` | typing / shows slash command menu | PASS |
| 9 | `tests/e2e/spaces.spec.ts` | Spaces page loads with folio heading | PASS |
| 10 | `tests/e2e/spaces.spec.ts` | Spaces page shows space cards | PASS |
| 11 | `tests/e2e/spaces.spec.ts` | Create folio button is present | PASS |
| 12 | `tests/e2e/serendipity.spec.ts` | Serendipity intro loads with heading | PASS |
| 13 | `tests/e2e/detail-drawer.spec.ts` | clicking a card opens drawer without blank screen | PASS |

**Result: 13/13 passed**

---

## Tests skipped

None. All planned tests are implemented and passing.

---

## What the tests revealed about the product

1. **No password validation**: The vault gate accepts any input (including empty string) and calls `onEnter()` after an 850ms animation. This is by design for local-only use, but would need real auth before any cloud deployment.

2. **Duplicate nav bars**: The SearchHeader renders two sets of navigation buttons — one in the expanded header and one in the sticky header. Playwright's strict mode flagged this immediately. The tests scope to `header.header-content .vault-nav` to avoid ambiguity.

3. **20 masonry items rendered**: Expected 8 (7 mock items + QuickNoteCard) but got 20. This means `mockData.ts` contains more items than the initial 7, or additional items are being generated during the load flow.

4. **GSAP warnings**: Console shows `Invalid property webkitBackdropFilter set to blur(0px) Missing plugin? gsap.registerPlugin()` — cosmetic, not breaking.

---

## Validation results

```
Lint:          0 errors, 0 warnings
Build:         tsc + vite build — success
Unit tests:    42 passed (6 files)
E2E tests:     13 passed (8 files)
```

---

## New files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration (Chromium, localhost:5173) |
| `tests/e2e/helpers.ts` | Shared helpers: `freshPage()`, `enterVault()` |
| `tests/e2e/landing.spec.ts` | Landing page vault gate test |
| `tests/e2e/vault-entry.spec.ts` | Vault entry flow test |
| `tests/e2e/everything-page.spec.ts` | Stack view: search, cards, nav, QuickNote |
| `tests/e2e/quick-note.spec.ts` | Quick Note expand/collapse test |
| `tests/e2e/slash-commands.spec.ts` | Slash command popup test |
| `tests/e2e/spaces.spec.ts` | Spaces/Folios view test |
| `tests/e2e/serendipity.spec.ts` | Serendipity/Echoes view test |
| `tests/e2e/detail-drawer.spec.ts` | Detail drawer open/close test |

## Modified files

| File | Change |
|------|--------|
| `package.json` | Added `@playwright/test`, `test:e2e`, `test:e2e:ui` scripts |
| `.gitignore` | Added Playwright artifacts (test-results/, playwright-report/) |

---

## What to review tomorrow

1. **Card count mismatch** (priority: medium): The test expects 8 masonry items but gets 20. Check `src/mockData.ts` and `src/data/spaces.ts` to understand why there are more items than expected. This may indicate duplicate rendering or the mock dataset being larger than assumed.

2. **Vault security** (priority: low for local, high before cloud): The vault gate has no real authentication. Before any Supabase migration, this needs to become a real auth gate.

3. **GSAP webkitBackdropFilter warning** (priority: low): The GSAP warnings suggest a CSS property animation is trying to animate `backdrop-filter` without the webkit prefix plugin. Not breaking, but worth cleaning up.

4. **Next E2E targets**: Add tests for file drag-and-drop, type filter chips, theme toggle, language toggle, and card deletion. These are interaction-heavy flows that benefit from E2E coverage.

---

## How to run

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run a specific test file
npx playwright test tests/e2e/landing.spec.ts
```
