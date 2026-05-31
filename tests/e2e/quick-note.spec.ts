import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Quick Note Card', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
    await enterVault(page);
  });

  test('Quick Note card can expand to editor', async ({ page }) => {
    // Click the expand button on the Quick Note card
    const expandBtn = page.locator('.quick-note-inline-expand');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    // The editor panel should appear as a portal
    const editorPanel = page.locator('section.quick-note-editor-panel');
    await expect(editorPanel).toBeVisible();

    // The panel should have correct ARIA attributes
    await expect(editorPanel).toHaveAttribute('role', 'dialog');
    await expect(editorPanel).toHaveAttribute('aria-label', 'New Quick Note');

    // Close button should be present
    await expect(page.locator('.quick-note-icon-button[aria-label="Close"]')).toBeVisible();
  });
});
