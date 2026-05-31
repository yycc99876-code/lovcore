import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Everything Page (Stack View)', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
    await enterVault(page);
  });

  test('search area is visible', async ({ page }) => {
    // The expanded search input should be visible
    await expect(page.locator('.search-input')).toBeVisible();

    // Search input should have the correct placeholder
    await expect(page.locator('.search-input')).toHaveAttribute(
      'placeholder',
      'Search my mind...',
    );
  });

  test('card area shows mock items', async ({ page }) => {
    // Masonry items should be rendered (mockData has items + QuickNoteCard)
    const cards = page.locator('.masonry-item');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('Quick Note card is present', async ({ page }) => {
    // QuickNoteCard should be the first masonry item
    await expect(page.locator('.quick-note-item')).toBeVisible();
    await expect(page.getByText('New Quick Note')).toBeVisible();
  });

  test('navigation buttons are present', async ({ page }) => {
    // Scope to the expanded header (not the sticky header) to avoid duplicate matches
    const nav = page.locator('header.header-content .vault-nav');
    await expect(nav.getByRole('button', { name: 'The Stack' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Folios' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Echoes' })).toBeVisible();
  });
});
