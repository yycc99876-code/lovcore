import { test, expect } from '@playwright/test';
import { freshPage, enterVault } from './helpers';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await freshPage(page, context);
  });

  test('landing page loads with a readable hero and unlocks successfully', async ({ page }) => {
    await expect(page.locator('.gsap-landing-wrapper')).toBeVisible();

    const heroTitle = page.locator('.hero-title-threshold');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).not.toHaveText('');
    await expect(page.locator('.hero-title-line')).toHaveCount(2);
    await expect(page.locator('.hero-title-line').nth(0)).toHaveText('给你的记忆，');
    await expect(page.locator('.hero-title-line').nth(1)).toHaveText('一个安静的房间。');

    const heroBox = await heroTitle.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.y).toBeGreaterThanOrEqual(0);
    expect(heroBox!.y).toBeLessThan(700);
    expect(heroBox!.height).toBeGreaterThan(20);

    await expect(page.getByText('private memory, quietly kept', { exact: true })).toBeVisible();
    await expect(page.locator('.hero-memory-card')).toHaveCount(3);
    await expect(page.locator('.app-container')).not.toBeVisible();

    await enterVault(page);
    await expect(page.locator('.app-container')).toBeVisible();
  });

  test('desktop hero composition keeps logo and memory cards visually disciplined', async ({ page }) => {
    await page.waitForTimeout(5200);

    const composition = await page.evaluate(() => {
      const logoIcon = document.querySelector('.gsap-logo-svg') as HTMLElement | null;
      const logoText = document.querySelector('.gsap-logo-text') as HTMLElement | null;
      const titleLines = Array.from(document.querySelectorAll('.hero-title-line')) as HTMLElement[];
      const desc = document.querySelector('.gsap-desc-hero') as HTMLElement | null;
      const cards = Array.from(document.querySelectorAll('.hero-memory-card')) as HTMLElement[];
      if (!logoIcon || !logoText || titleLines.length !== 2 || !desc || cards.length !== 3) return null;

      const titleRects = titleLines.map((line) => line.getBoundingClientRect());
      const descRect = desc.getBoundingClientRect();
      const visibleCards = cards.filter((card) => getComputedStyle(card).display !== 'none');
      const overlapsText = visibleCards.some((card) => {
        const rect = card.getBoundingClientRect();
        const overlapsTitle = titleRects.some((titleRect) => (
          rect.left < titleRect.right && rect.right > titleRect.left && rect.top < titleRect.bottom && rect.bottom > titleRect.top
        ));
        const overlapsDesc = rect.left < descRect.right && rect.right > descRect.left && rect.top < descRect.bottom && rect.bottom > descRect.top;
        return overlapsTitle || overlapsDesc;
      });

      return {
        iconColor: getComputedStyle(logoIcon).color,
        textColor: getComputedStyle(logoText).color,
        overlapsText,
      };
    });

    expect(composition).not.toBeNull();
    expect(composition!.iconColor).not.toBe(composition!.textColor);
    expect(composition!.overlapsText).toBe(false);
  });

  test('desktop has one auth form and reveals the final CTA while scrolling', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toHaveCount(1);
    await expect(page.locator('input[type="password"]')).toHaveCount(1);

    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(900);

    await expect(page.locator('.gsap-landing-wrapper')).toBeVisible();
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);

    const ctaState = await page.evaluate(() => {
      const cta = document.querySelector('.chapter-4-content') as HTMLElement | null;
      if (!cta) return null;
      const rect = cta.getBoundingClientRect();
      const styles = getComputedStyle(cta);
      return {
        text: cta.innerText.trim(),
        opacity: Number(styles.opacity),
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        visibleInViewport: rect.bottom > 0 && rect.top < window.innerHeight,
      };
    });

    expect(ctaState).not.toBeNull();
    expect(ctaState!.text.length).toBeGreaterThan(20);
    expect(ctaState!.opacity).toBeGreaterThan(0.8);
    expect(ctaState!.height).toBeGreaterThan(80);
    expect(ctaState!.visibleInViewport).toBe(true);
  });

  test('capture scene keeps the right-side demo spacious and linked to typing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await page.waitForTimeout(5200);
    await page.mouse.wheel(0, 950);
    await page.waitForTimeout(2600);

    const captureDemo = await page.evaluate(() => {
      const search = document.querySelector('.search-bar-demo') as HTMLElement | null;
      const quicknote = document.querySelector('.quicknote-demo') as HTMLElement | null;
      const captureCards = Array.from(document.querySelectorAll('.stack-card-0, .stack-card-1, .stack-card-2, .stack-card-3')) as HTMLElement[];
      const deferredCards = Array.from(document.querySelectorAll('.stack-card-4, .stack-card-5')) as HTMLElement[];
      const visibleCards = captureCards.filter((card) => {
        const styles = getComputedStyle(card as HTMLElement);
        return Number(styles.opacity) > 0.2;
      });
      const linkedCards = visibleCards.filter((card) => card.classList.contains('capture-linked'));
      const rects = visibleCards.map((card) => card.getBoundingClientRect());
      const overlaps = rects.some((rect, index) => rects.some((other, otherIndex) => (
        index !== otherIndex &&
        rect.left < other.right &&
        rect.right > other.left &&
        rect.top < other.bottom &&
        rect.bottom > other.top
      )));

      return {
        searchVisible: search ? search.getBoundingClientRect().bottom > 0 && Number(getComputedStyle(search).opacity) > 0.2 : false,
        quicknoteVisible: quicknote ? quicknote.getBoundingClientRect().top < window.innerHeight && Number(getComputedStyle(quicknote).opacity) > 0.2 : false,
        visibleCardCount: visibleCards.length,
        deferredCardCount: deferredCards.filter((card) => Number(getComputedStyle(card).opacity) <= 0.2).length,
        linkedCardCount: linkedCards.length,
        overlaps,
      };
    });

    expect(captureDemo.searchVisible).toBe(true);
    expect(captureDemo.quicknoteVisible).toBe(true);
    expect(captureDemo.visibleCardCount).toBe(4);
    expect(captureDemo.deferredCardCount).toBe(2);
    expect(captureDemo.linkedCardCount).toBe(1);
    expect(captureDemo.overlaps).toBe(false);
  });

  test('does not emit GSAP missing-target warnings on load', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });

    await page.reload();
    await page.waitForTimeout(1200);

    expect(warnings.filter((warning) => warning.includes('GSAP target'))).toEqual([]);
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    const wrapper = page.locator('.gsap-landing-wrapper');
    await expect(wrapper).not.toHaveClass(/dark-theme/);

    const themeBtn = page.locator('.gsap-btn-icon.pill-btn').first();
    await themeBtn.click();
    await page.waitForTimeout(300);
    await expect(wrapper).toHaveClass(/dark-theme/);

    await themeBtn.click();
    await page.waitForTimeout(300);
    await expect(wrapper).not.toHaveClass(/dark-theme/);
  });

  test('mobile hero is visible, has one auth form, and has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.locator('.gsap-landing-wrapper')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveCount(1);
    await expect(page.locator('input[type="password"]')).toHaveCount(1);

    const heroState = await page.evaluate(() => {
      const hero = document.querySelector('.hero-title-threshold') as HTMLElement | null;
      if (!hero) return null;
      const rect = hero.getBoundingClientRect();
      return {
        text: hero.innerText.trim(),
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        visibleInViewport: rect.bottom > 0 && rect.top < window.innerHeight,
      };
    });

    expect(heroState).not.toBeNull();
    expect(heroState!.text.length).toBeGreaterThan(8);
    expect(heroState!.height).toBeGreaterThan(20);
    expect(heroState!.visibleInViewport).toBe(true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
