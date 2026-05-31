import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Spaces Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
    await enterVault(page);
  });

  test('Spaces page loads with folio heading', async ({ page }) => {
    // Click the Folios nav button
    await page.locator('header.header-content .vault-nav').getByRole('button', { name: 'Folios' }).click();

    // Spaces view should appear
    await expect(page.locator('main.spaces-view')).toBeVisible();

    // Should show the heading
    await expect(page.getByRole('heading', { name: 'All Folios' })).toBeVisible();
  });

  test('Spaces page shows space cards', async ({ page }) => {
    await page.locator('header.header-content .vault-nav').getByRole('button', { name: 'Folios' }).click();
    await expect(page.locator('main.spaces-view')).toBeVisible();

    // Space overview cards should be rendered (default spaces from mockData)
    const spaceCards = page.locator('button.space-overview-card');
    const count = await spaceCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Create folio button is present', async ({ page }) => {
    await page.locator('header.header-content .vault-nav').getByRole('button', { name: 'Folios' }).click();
    await expect(page.locator('main.spaces-view')).toBeVisible();

    await expect(
      page.locator('button.create-space-button').first(),
    ).toBeVisible();
  });
});
