import { expect, test, type Page } from '@playwright/test';

/**
 * The primary landing-page experience.
 *
 * These assert the promises the page makes to a first-time visitor: that it
 * renders as a board, that the board can actually be changed, that a suggestion
 * really mutates it, that Reset always gets you home, and that none of it
 * claims a model was involved when none was.
 */

const card = (page: Page, title: string) =>
  page.locator('db-card-shell').filter({ has: page.getByRole('heading', { name: title, exact: false }) });

const cardMenu = async (page: Page, title: string) => {
  await card(page, title).first().getByRole('button', { name: /Card menu/ }).click();
  return page.getByRole('menu');
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboardius' })).toBeVisible();
});

test('lands inside a dashboard, not on a marketing hero', async ({ page }) => {
  await expect(page).toHaveTitle(/Dashboardius/);
  await expect(page.getByText('Any data. Your metrics. One view.').first()).toBeVisible();

  // The board itself, and enough of it to read as a dashboard.
  await expect(page.locator('db-card-shell')).toHaveCount(8);
  for (const title of ['Sign-ups', 'Dashboardius this week', 'Members', 'Sign-ins']) {
    await expect(card(page, title).first()).toBeVisible();
  }

  // Every card carrying a number says the numbers are samples.
  await expect(page.getByText(/Sample data/).first()).toBeVisible();
});

test('charts render and expose their values without a pointer', async ({ page }) => {
  const signups = card(page, 'Sign-ups').first();
  await expect(signups.locator('canvas')).toBeVisible();
  // The hero figure and the table twin BOTH carry the value: 134 appears once
  // as the headline and once as a cell, which is the point — nothing on this
  // card is reachable only by hovering a canvas.
  await expect(signups.locator('.db-figure')).toHaveText('134');
  await expect(signups.locator('table')).toHaveCount(1);
  await expect(signups.getByRole('cell', { name: '134', exact: true })).toBeAttached();
});

test('a hidden metric can be added from the chart legend', async ({ page }) => {
  const signups = card(page, 'Sign-ups').first();
  const hidden = signups.getByRole('button', { name: /Sign-ins from new devices/ });

  await expect(hidden).toHaveAttribute('aria-pressed', 'false');
  await hidden.click();
  await expect(hidden).toHaveAttribute('aria-pressed', 'true');

  // ...and removed again without deleting the metric definition.
  await hidden.click();
  await expect(hidden).toHaveAttribute('aria-pressed', 'false');
  await expect(hidden).toBeVisible();
});

test('a hidden metric can be added from the card menu', async ({ page }) => {
  const menu = await cardMenu(page, 'Sign-ups');
  const returning = menu.getByRole('menuitemcheckbox', { name: /Returning users/ });
  await expect(returning).toHaveAttribute('aria-checked', 'false');
  await returning.click();

  const again = await cardMenu(page, 'Sign-ups');
  await expect(again.getByRole('menuitemcheckbox', { name: /Returning users/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('a card can be resized and removed from its menu', async ({ page }, testInfo) => {
  const before = await card(page, 'Meetings').first().boundingBox();

  let menu = await cardMenu(page, 'Meetings');
  await menu.getByRole('menuitemcheckbox', { name: 'Full width' }).click();

  // The new width is recorded whatever the viewport...
  menu = await cardMenu(page, 'Meetings');
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Full width' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');

  // ...but only a wide viewport has columns to grow into. Below the breakpoint
  // every card is already full width, so asserting growth there would be
  // asserting a bug.
  const wide = (testInfo.project.use.viewport?.width ?? 1280) > 900;
  if (wide) {
    await expect
      .poll(async () => (await card(page, 'Meetings').first().boundingBox())?.width ?? 0)
      .toBeGreaterThan((before?.width ?? 0) + 100);
  }

  menu = await cardMenu(page, 'Meetings');
  await menu.getByRole('menuitem', { name: 'Remove card' }).click();
  await expect(card(page, 'Meetings')).toHaveCount(0);
});

test('a card can be dragged to a new position', async ({ page }, testInfo) => {
  // Below the stacking breakpoint the row is one column wide, so a horizontal
  // drop target does not exist. The keyboard path (next test) is what covers
  // reordering there.
  test.skip((testInfo.project.use.viewport?.width ?? 1280) <= 900, 'single-column layout');

  const row = page.locator('.row').first();
  const titles = () => row.locator('db-card-shell h3').allInnerTexts();
  const before = await titles();

  const handle = row.locator('.cell').nth(0).locator('.head');
  const target = row.locator('.cell').nth(1);
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // The CDK needs several intermediate moves before it treats this as a drag.
  const endX = to.x + to.width * 0.7;
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(
      from.x + from.width / 2 + (endX - (from.x + from.width / 2)) * (i / 12),
      from.y + from.height / 2 + 4,
    );
  }
  await page.mouse.up();

  await expect.poll(titles).toEqual([before[1], before[0]]);
  // ...and a drag is undoable like everything else.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(titles).toEqual(before);
});

test('a card can be moved by keyboard as well as by drag', async ({ page }) => {
  const row = page.locator('.row').nth(2);
  const titles = async () => row.locator('db-card-shell h3').allInnerTexts();
  const before = await titles();

  const menu = await cardMenu(page, 'Where sign-ups come from');
  await menu.getByRole('menuitem', { name: 'Right' }).click();

  await expect.poll(titles).not.toEqual(before);
  expect((await titles())[1]).toBe(before[0]);
});

test('the query card switches grid engine and keeps the same values', async ({ page }, testInfo) => {
  const members = card(page, 'Members').first();
  await expect(members.getByText('Plain table')).toBeVisible();
  await expect(members.getByText('-€120.00')).toBeAttached();

  // Both alternative engines virtualise columns, so on a phone the right-hand
  // columns are genuinely not in the DOM. The cell-level assertions therefore
  // run where the grid is legible; the engine switch itself is checked
  // everywhere, because that is the interaction.
  const wide = (testInfo.project.use.viewport?.width ?? 1280) > 900;

  for (const engine of ['Tabulator', 'AG Grid']) {
    const menu = await cardMenu(page, 'Members');
    await menu.getByRole('menuitemcheckbox', { name: engine }).click();
    await expect(members.getByText(engine, { exact: true })).toBeVisible();

    if (wide) {
      // Same recordset, same tinting, whichever library drew it.
      await expect(members.getByText('-€120.00')).toBeVisible();
      await expect(members.locator('.db-cell-critical').first()).toBeVisible();
      await expect(members.locator('.db-cell-warning').first()).toBeVisible();
      await expect(members.locator('.db-cell-progress-fill').first()).toBeVisible();
    }
  }
});

test('a suggested command changes the board and says it was scripted', async ({ page }) => {
  await expect(card(page, 'Revenue')).toHaveCount(0);

  await page.getByRole('button', { name: 'Add a revenue chart' }).click();

  // The same execution UI a real model-generated plan would use...
  await expect(page.getByText(/resolving to dashboard actions|applying/i)).toBeVisible();
  await expect(card(page, 'Revenue').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('code', { hasText: 'add_card(revenue)' })).toBeVisible();

  // ...labelled honestly.
  await expect(page.getByText('Scripted demo — no model was called')).toBeVisible();
});

test('a free-form prompt explains itself instead of pretending', async ({ page }) => {
  const cardsBefore = await page.locator('db-card-shell').count();

  await page.getByLabel(/Ask Dashboardius/).fill('plot the vibes of our quarterly synergy');
  await page.getByRole('button', { name: 'Run' }).click();

  await expect(page.getByText(/understood the words, not the request/i)).toBeVisible();
  await expect(page.getByText(/does not call one/i)).toBeVisible();
  expect(await page.locator('db-card-shell').count()).toBe(cardsBefore);
});

test('undo reverses a command and redo re-applies it', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a revenue chart' }).click();
  await expect(card(page, 'Revenue').first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Undo this' }).click();
  await expect(card(page, 'Revenue')).toHaveCount(0);

  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(card(page, 'Revenue').first()).toBeVisible();
});

test('reset restores the canonical demo board', async ({ page }) => {
  const originalTitles = await page.locator('db-card-shell h3').allInnerTexts();

  await page.getByRole('button', { name: 'Make this executive-friendly' }).click();
  await expect(card(page, 'The one-paragraph version').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Q3 review' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(page.getByRole('heading', { name: 'Product pulse' })).toBeVisible();
  await expect(page.locator('db-card-shell h3')).toHaveText(originalTitles);
  await expect(page.getByText(/Back to the original board/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset' })).toBeDisabled();
});

test('the theme toggle switches scheme and survives a reload', async ({ page }) => {
  await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
  await expect(page.locator('html')).toHaveClass(/db-(dark|light)/);
  const chosen = await page.locator('html').getAttribute('class');

  await page.reload();
  await expect(page.locator('html')).toHaveClass(new RegExp(chosen!.trim().split(/\s+/)[0]));
});
