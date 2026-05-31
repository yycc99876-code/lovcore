import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Vault Entry', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
  });

  test('can enter vault and see main app', async ({ page }) => {
    await enterVault(page);

    // Main app container should be visible
    await expect(page.locator('.app-container')).toBeVisible();

    // Search header should be present
    await expect(page.locator('.header-wrapper')).toBeVisible();

    // Logo should show LOVCORE
    await expect(page.locator('.logo-text')).toContainText('LOVCORE');
  });
});
