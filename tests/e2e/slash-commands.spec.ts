import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Slash Commands', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
    await enterVault(page);
  });

  test('typing / in Quick Note shows slash command menu', async ({ page }) => {
    // Open the Quick Note editor
    await page.locator('.quick-note-inline-expand').click();
    const editorPanel = page.locator('section.quick-note-editor-panel');
    await expect(editorPanel).toBeVisible();

    // Find the Tiptap editor area (contenteditable)
    const editor = editorPanel.locator('.tiptap');
    await expect(editor).toBeVisible();

    // Type / to trigger slash commands
    await editor.click();
    await page.keyboard.type('/');

    // Slash command popup renders via tippy.js into document.body
    const popup = page.locator('.slash-command-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });

    // Should show command items
    const items = page.locator('.slash-command-popup-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });
});
