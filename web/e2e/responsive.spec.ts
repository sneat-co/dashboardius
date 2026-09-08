import { expect, test } from '@playwright/test';

/**
 * Mobile is not the priority surface — dashboard authoring is inherently dense
 * — but it has to be a working, legible dashboard rather than a desktop one
 * squeezed until it stops making sense. These tests assert the two things that
 * actually break: horizontal overflow, and controls that vanish or shrink below
 * a usable size.
 */

test.describe('narrow viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the page never scrolls sideways', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboardius' })).toBeVisible();
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('cards reflow to one readable column', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboardius' })).toBeVisible();

    const cards = page.locator('.row').first().locator('.cell');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first && second).toBeTruthy();
    // Stacked, not side by side.
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 4);
    expect(first!.width).toBeGreaterThan(300);
  });

  test('the prompt and its suggestions stay usable', async ({ page }) => {
    await page.goto('/');
    const prompt = page.getByLabel(/Ask Dashboardius/);
    await expect(prompt).toBeVisible();

    const box = await prompt.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(32);

    // Suggestions scroll rather than wrap into a wall of chips.
    const chip = page.getByRole('button', { name: 'Surprise me' });
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible();
  });

  test('sign-in remains reachable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 15_000 });
  });
});
