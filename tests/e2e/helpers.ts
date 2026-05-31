import { type Page, type BrowserContext } from '@playwright/test';

/**
 * Clear localStorage and navigate to the app fresh.
 * Each test gets a clean slate — no vault gate memory, no stored items.
 */
export async function freshPage(page: Page, context: BrowserContext) {
  await context.clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('lovcore:mock-auth', 'true');
    localStorage.setItem('lovcore_spaces_version', 'phase9-folios-user-created-only');
    localStorage.setItem('lovcore_spaces', JSON.stringify([
      {
        id: 'space-all',
        name: 'All',
        type: 'default',
        system: true,
        color: '#d8d8d8',
        description: 'Every saved memory in the archive.',
        selectedType: 'all',
        tags: [],
        createdAt: '2026-05-22T00:00:00Z',
        updatedAt: '2026-05-22T00:00:00Z'
      },
      {
        id: 'user-space-test',
        name: 'Mock Test Folio',
        type: 'smart',
        color: '#e3594c',
        description: 'Mock space for E2E tests',
        selectedType: 'all',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]));
  });
  await page.reload();
}

/**
 * Enter the vault by typing credentials and clicking Enter.
 * In mock mode (VITE_TEST_MODE=true), any email/password works.
 * Falls back to injecting mock session if form interaction fails.
 */
export async function enterVault(page: Page) {
  // Try the form-based approach first
  const emailInput = page.locator('input.vault-pass-input[type="email"]');
  if (await emailInput.count() > 0) {
    await emailInput.fill('test@lovcore.com');
  }
  const passInput = page.locator('input.vault-pass-input[type="password"]');
  if (await passInput.count() > 0) {
    await passInput.fill('testpassword');
    await page.locator('button.magnet-btn').click({ force: true });
  }

  // If the app container doesn't appear (e.g., real Supabase rejected credentials),
  // inject a mock session directly
  const appContainer = page.locator('.app-container');
  try {
    await appContainer.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    // Mock session injection fallback
    await page.evaluate(() => {
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'test@lovcore.com',
        created_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
      };
      const mockSession = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: mockUser,
      };
      localStorage.setItem('lovcore:mock-session', JSON.stringify(mockSession));
    });
    await page.reload();
    await appContainer.waitFor({ state: 'visible', timeout: 8000 });
  }
}
