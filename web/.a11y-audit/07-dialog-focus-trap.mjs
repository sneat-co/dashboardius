import { openPage } from './lib.mjs';

const { browser, page } = await openPage();

async function activeInfo() {
  return page.evaluate(() => {
    const el = document.activeElement;
    return el
      ? {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          text: (el.textContent || '').trim().slice(0, 30),
          name: el.getAttribute('name'),
          ariaLabel: el.getAttribute('aria-label'),
        }
      : null;
  });
}

console.log('=== Open the auth dialog from the header "Sign in" button ===');
const headerSignIn = page.getByRole('button', { name: 'Sign in', exact: true });
await headerSignIn.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);

const dialogVisible = await page.locator('.p-dialog').count();
console.log('dialog panels in DOM:', dialogVisible);
console.log('focused right after open (expect something INSIDE the dialog):', JSON.stringify(await activeInfo()));

console.log('\n=== Tab through the whole dialog and confirm focus never leaves it ===');
const stops = [];
for (let i = 0; i < 14; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    const dialog = document.querySelector('.p-dialog');
    const inDialog = !!dialog && dialog.contains(el);
    return {
      tag: el?.tagName.toLowerCase(),
      text: (el?.textContent || '').trim().slice(0, 30),
      name: el?.getAttribute('name'),
      inDialog,
    };
  });
  stops.push(info);
  console.log(`tab ${i + 1}:`, JSON.stringify(info));
}
const leaked = stops.filter((s) => !s.inDialog);
console.log(`\nStops OUTSIDE the dialog while it was open: ${leaked.length}`);
console.log(JSON.stringify(leaked, null, 2));

console.log('\n=== Shift+Tab from the first field should wrap to the LAST focusable in the dialog, not escape it ===');
// Move to a known first control, then shift-tab once
await page.evaluate(() => {
  const dialog = document.querySelector('.p-dialog');
  const focusables = dialog.querySelectorAll('button, input, [tabindex]');
  focusables[0]?.focus();
});
await page.keyboard.press('Shift+Tab');
const wrapInfo = await page.evaluate(() => {
  const el = document.activeElement;
  const dialog = document.querySelector('.p-dialog');
  return { tag: el?.tagName.toLowerCase(), text: (el?.textContent || '').trim().slice(0, 30), inDialog: !!dialog && dialog.contains(el) };
});
console.log('after Shift+Tab from first control:', JSON.stringify(wrapInfo));

console.log('\n=== Escape closes dialog and restores focus to the header Sign in button ===');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const dialogGone = (await page.locator('.p-dialog').count()) === 0 || !(await page.locator('.p-dialog').isVisible().catch(() => false));
console.log('dialog gone/hidden:', dialogGone);
const restored = await activeInfo();
console.log('focused after close (expect header "Sign in" button):', JSON.stringify(restored));
const isHeaderButton = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Sign in' && !b.closest('.p-dialog'));
  return document.activeElement === btn;
});
console.log('focus correctly restored to header trigger:', isHeaderButton);

console.log('\n=== Now open from a CARD action button ("Add me") and confirm restore targets THAT button ===');
await page.evaluate(() => window.scrollTo(0, 0));
const addMe = page.getByRole('button', { name: 'Add me', exact: false });
await addMe.first().scrollIntoViewIfNeeded();
await addMe.first().focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
console.log('focused right after open from card button:', JSON.stringify(await activeInfo()));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const restored2 = await activeInfo();
console.log('focused after close (expect the card\'s "Add me" button):', JSON.stringify(restored2));

console.log('\n=== dismissableMask: click on the backdrop outside the dialog closes it too ===');
await headerSignIn.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.mouse.click(5, 5);
await page.waitForTimeout(400);
console.log('dialog panels after mask click:', await page.locator('.p-dialog').count());
console.log('focused after mask-click close:', JSON.stringify(await activeInfo()));

await browser.close();
