import { expect, test } from '@playwright/test';

/**
 * Authentication entry points.
 *
 * Firebase itself is not exercised here — a public E2E run must not create real
 * accounts in the shared `sneat-eur3-1` project, and a suite that depends on a
 * third-party identity provider being up is a suite that goes red for reasons
 * that have nothing to do with this code. What IS asserted is everything up to
 * that boundary: the entry points exist, they open the right form, the form
 * validates before it will submit, and the dialog gets out of the way again.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboardius' })).toBeVisible();
});

test('the header offers sign-in once the auth state is known', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 15_000 });
});

test('"Add me" opens sign-up and "Sign me in" opens sign-in', async ({ page }) => {
  await page.getByRole('button', { name: 'Add me' }).click();
  await expect(page.getByRole('dialog')).toContainText('Join the sample size');
  await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Sign me in' }).click();
  await expect(page.getByRole('dialog')).toContainText('Welcome back');
});

test('the sign-in form refuses to submit until it is usable', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in' }).click();
  const dialog = page.getByRole('dialog');
  const submit = dialog.getByRole('button', { name: 'Sign in' });

  await expect(submit).toBeDisabled();
  await dialog.getByLabel('Email').fill('someone@example.com');
  await expect(submit).toBeDisabled();
  await dialog.getByLabel('Password').fill('12345');
  await expect(submit).toBeDisabled(); // five characters is not six
  await dialog.getByLabel('Password').fill('123456');
  await expect(submit).toBeEnabled();
});

test('sign-up and sign-in are reachable from each other', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Create one' }).click();
  await expect(page.getByRole('dialog')).toContainText('Join the sample size');
  await page.getByRole('button', { name: 'Sign in' }).last().click();
  await expect(page.getByRole('dialog')).toContainText('Welcome back');
});

test('the auth dialog closes on Escape and returns to the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Add me' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Product pulse' })).toBeVisible();
});
