# Lovcore Product Hardening Report

Date: 2026-05-24

---

## 1. What was done

### Testing Infrastructure (from zero)
- Configured Vitest with React plugin, jsdom environment, and jest-dom matchers
- Created test setup file and shared test utilities with I18nProvider wrapper
- Added 3 test scripts: `test`, `test:run`, `test:coverage`

### Unit Tests (42 tests across 6 files)
| File | Tests | Coverage |
|------|-------|----------|
| `src/lib/ingestion.test.ts` | 10 | `isHttpUrl`, `createAnalyzingItem` |
| `src/lib/fileStore.test.ts` | 10 | `isFileRef`, `fileRefKey`, `makeFileRef`, roundtrip |
| `src/lib/storage.test.ts` | 5 | load/save/reset for localStorage persistence |
| `src/ai/client.test.ts` | 10 | All 5 API functions + error handling |
| `src/components/editor/slashCommands.test.ts` | 6 | `filterSlashCommands` filtering logic |
| `src/components/system/ErrorBoundary.test.tsx` | 3 | Render, fallback UI, onError callback |

### Global ErrorBoundary
- Created `src/components/system/ErrorBoundary.tsx` with Lovcore-style quiet UI
- Fallback shows "Something went quiet" with Reload and Copy Error buttons
- Wrapped post-vault content in `App.tsx`

### CI Pipeline
- `.github/workflows/ci.yml` — runs lint, tsc+build, and tests on push/PR to main/master

### Vercel Deployment Config
- `vercel.json` — Vite SPA with build command, output directory, and SPA fallback rewrite

### Accessibility Fixes
- Added `aria-label` to both search inputs in `SearchHeader.tsx`
- Added `aria-label` to password input in `LandingPage.tsx`
- Added `loading="lazy" decoding="async"` to 7 LandingPage images

### Security Audit
- Confirmed API keys have no `VITE_` prefix (not exposed to client bundle)
- Confirmed `.env.local` is covered by `.gitignore`

---

## 2. Files modified or created

### New files (12)
| File | Purpose |
|------|---------|
| `vitest.config.ts` | Test framework configuration |
| `src/test/setup.ts` | jest-dom matchers import |
| `src/test/utils.tsx` | Shared test utilities (renderWithProviders) |
| `src/lib/ingestion.test.ts` | Tests for URL validation and item creation |
| `src/lib/fileStore.test.ts` | Tests for file reference utilities |
| `src/lib/storage.test.ts` | Tests for localStorage persistence |
| `src/ai/client.test.ts` | Tests for AI API client functions |
| `src/components/editor/slashCommands.test.ts` | Tests for slash command filtering |
| `src/components/system/ErrorBoundary.tsx` | Global error boundary component |
| `src/components/system/ErrorBoundary.test.tsx` | ErrorBoundary tests |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline |
| `vercel.json` | Vercel deployment configuration |

### Modified files (4)
| File | Change |
|------|--------|
| `package.json` | Added test scripts, vitest, testing-library, jsdom deps |
| `src/App.tsx` | Imported and wrapped content with ErrorBoundary |
| `src/components/SearchHeader.tsx` | Added aria-label to 2 search inputs |
| `src/components/LandingPage.tsx` | Added aria-label to password input, lazy loading to 7 images |

---

## 3. What was NOT touched and why

| Area | Reason |
|------|--------|
| Quick Note / LovcoreEditor / DetailDrawer | Per constraint: no changes to core product interaction logic |
| Voice UI / Inline AI | Per constraint: no changes to core product interaction logic |
| Spaces / LandingPage logic | Per constraint: only a11y attributes added, no logic changes |
| Supabase migration | Paused — current product line stays on Vite + localStorage |
| lovcore-web directory | Experiment directory, not the product mainline |
| Existing state management (useCards, useSpaces, useVaultGate) | Would risk breaking core data flow |
| AI providers (bailian, openai, anthropic) | Backend logic, not part of frontend hardening |

---

## 4. Lint / Build / Test results

```
Lint:   0 errors, 0 warnings
Build:  tsc + vite build — success (1.82s)
        dist/index.html                   0.82 kB
        dist/assets/index.css           109.61 kB (gzip: 20.21 kB)
        dist/assets/index.js            969.23 kB (gzip: 313.29 kB)
Tests:  42 passed across 6 files (16.23s)
```

Build note: chunk size warning for main JS bundle (969 kB). This is a code-splitting opportunity, not a blocker.

---

## 5. Security findings

| Check | Result |
|-------|--------|
| API keys with `VITE_` prefix | None found — keys stay server-side |
| `.env.local` in `.gitignore` | Yes |
| `vercel.json` exposes secrets | No — only build/deploy config |
| Dependency vulnerabilities | Not checked (run `npm audit` separately) |

---

## 6. Accessibility findings

### Fixed
- Search inputs (expanded + compact) now have `aria-label`
- Password input now has `aria-label`
- 7 LandingPage images now have `loading="lazy" decoding="async"`

### Remaining (report only, not fixed)
- No skip-to-content link
- No focus-visible styles on some custom buttons
- Color contrast not audited against WCAG AA ratios
- Modal focus trapping not verified

---

## 7. Unused files detected

These files exist in `src/` but are not imported by any other file:

| File | Status |
|------|--------|
| `src/components/ghost/GhostCorrectionLayer.tsx` | Defined but never imported |
| `src/components/ghost/GhostInlineCompletion.tsx` | Defined but never imported |
| `src/components/SketchCat.tsx` | Defined but never imported |

Action: Review and decide whether to delete or wire up. Not deleted per constraint (report only).

---

## 8. Areas for future review

1. **Code splitting**: Main bundle is 969 kB. Dynamic imports for AI editor, detail drawer, and voice UI would reduce initial load.
2. **Test coverage**: Current tests cover pure logic and error boundaries. Component interaction tests (render, click, keyboard) are not yet written.
3. **E2E tests**: No Playwright/Cypress setup. Consider for critical user flows (vault entry, card creation, search).
4. **Dependency audit**: Run `npm audit` for known vulnerabilities.
5. **Type safety**: Some `any` types remain in AI client and ingestion code. Could be tightened with Zod or io-ts.

---

## 9. Specific next-step recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| High | Wire up GhostCorrectionLayer and GhostInlineCompletion or delete them | 1h |
| High | Add component tests for SearchHeader and LandingPage interactions | 2h |
| Medium | Code-split the main bundle with dynamic imports | 2h |
| Medium | Add Playwright E2E test for vault entry + card creation flow | 3h |
| Low | Run `npm audit` and address any critical vulnerabilities | 30m |
| Low | Audit color contrast ratios for WCAG AA compliance | 1h |

---

## 10. Summary

Hardening pass added: 42 unit tests, 1 global ErrorBoundary, 1 CI pipeline, 1 Vercel deploy config, 3 aria-labels, 7 lazy-loaded images. Zero changes to core product logic. All lint/build/test checks pass.
