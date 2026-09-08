import { openPage } from './lib.mjs';

const { browser, page } = await openPage();

console.log('=== Running a suggestion chip: watch role=status trace appear/update ===');
const chip = page.getByRole('button', { name: 'Add a revenue chart' });
await chip.click();

// Poll the trace region over time to see how many times its text content
// changes -- a live region that rewrites itself many times in quick
// succession is "chatty" for screen reader users.
const snapshots = [];
for (let i = 0; i < 20; i++) {
  const txt = await page.locator('[role="status"]').first().textContent().catch(() => null);
  snapshots.push(txt?.replace(/\s+/g, ' ').trim());
  await page.waitForTimeout(150);
}
console.log('role=status text over ~3s (deduped consecutive):');
let last;
for (const s of snapshots) {
  if (s !== last) console.log(' ->', JSON.stringify(s));
  last = s;
}
const distinctChanges = snapshots.filter((s, i) => s !== snapshots[i - 1]).length;
console.log('distinct text states observed:', distinctChanges);

console.log('\n=== Reset: role=status notice ===');
const resetBtn = page.getByRole('button', { name: 'Reset', exact: true });
await resetBtn.click();
await page.waitForTimeout(200);
const resetTxt = await page.locator('[role="status"]').allTextContents();
console.log('all role=status texts after reset:', JSON.stringify(resetTxt));

console.log('\n=== Auth dialog: invalid submit -> role=alert ===');
const headerSignIn = page.getByRole('button', { name: 'Sign in', exact: true });
await headerSignIn.click();
await page.waitForTimeout(300);
await page.fill('input[name="email"]', 'not-an-email');
await page.fill('input[name="password"]', 'x');
// canSubmit() requires email include '@' and password length >=6, so the
// submit button should remain disabled - try clicking it anyway via Enter in
// a field, and check whether an alert appears or the button stays disabled.
const submitBtn = page.locator('button.primary');
console.log('submit disabled (email invalid, short pw):', await submitBtn.isDisabled());
await page.fill('input[name="email"]', 'user@example.com');
await page.fill('input[name="password"]', 'wrongpw');
console.log('submit disabled (valid-looking creds):', await submitBtn.isDisabled());
await submitBtn.click();
await page.waitForTimeout(600);
const alertTxt = await page.locator('[role="alert"]').allTextContents();
console.log('role=alert texts after submit attempt:', JSON.stringify(alertTxt));
const alertVisible = await page.locator('[role="alert"]').first().isVisible().catch(() => false);
console.log('alert visible:', alertVisible);

await browser.close();
