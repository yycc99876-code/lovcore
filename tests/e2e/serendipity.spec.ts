import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Serendipity Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
    await enterVault(page);
  });

  test('Serendipity intro loads with heading', async ({ page }) => {
    // Click the Echoes nav button
    await page.locator('header.header-content .vault-nav').getByRole('button', { name: 'Echoes' }).click();

    // Serendipity intro should appear
    await expect(page.locator('main.serendipity-intro')).toBeVisible();

    // Should show the heading
    await expect(
      page.locator('main.serendipity-intro h1'),
    ).toContainText('Moments worth saving,');

    // Start button should be present
    await expect(
      page.getByRole('button', { name: 'Show me how' }),
    ).toBeVisible();
  });
});
