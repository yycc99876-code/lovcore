import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Detail Drawer', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
    await enterVault(page);
  });

  test('clicking a card opens the detail drawer without blank screen', async ({ page }) => {
    // Wait for cards to render
    const cards = page.locator('.masonry-item .lov-card');
    await expect(cards.first()).toBeVisible();

    // Click the first non-document content card (not the QuickNoteCard and not a PDF)
    const contentCards = page.locator('.masonry-item:not(.quick-note-item):not(:has(.document-card-wrapper))');
    await contentCards.first().click();

    // The drawer should open
    const drawer = page.locator('.detail-drawer.open');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Drawer should NOT be blank — check for meaningful content
    // The title should be present
    const title = drawer.locator('.meta-title-text');
    await expect(title).toBeVisible();

    // The drawer should have a close button
    await expect(
      page.locator('.drawer-close-btn'),
    ).toBeVisible();

    // The drawer overlay should be present
    await expect(page.locator('.drawer-overlay.open')).toBeVisible();
  });
});
