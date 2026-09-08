import { openPage } from './lib.mjs';

const { browser, page } = await openPage();

async function activeInfo() {
  return page.evaluate(() => {
    const el = document.activeElement;
    return el
      ? {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 40),
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          ariaExpanded: el.getAttribute('aria-expanded'),
          ariaChecked: el.getAttribute('aria-checked'),
        }
      : null;
  });
}

console.log('=== Card menu: open via keyboard, arrow nav, Home/End, Escape returns focus ===');
const trigger = page.locator('button[aria-label="Card menu: Sign-ups"]');
await trigger.focus();
console.log('trigger aria-expanded before open:', await trigger.getAttribute('aria-expanded'));

await page.keyboard.press('Enter');
await page.waitForTimeout(150);
console.log('trigger aria-expanded after open:', await trigger.getAttribute('aria-expanded'));
console.log('focused after open (expect first menu item):', JSON.stringify(await activeInfo()));

await page.keyboard.press('ArrowDown');
const afterDown1 = await activeInfo();
console.log('after ArrowDown x1:', JSON.stringify(afterDown1));

await page.keyboard.press('ArrowDown');
const afterDown2 = await activeInfo();
console.log('after ArrowDown x2:', JSON.stringify(afterDown2));

await page.keyboard.press('ArrowUp');
const afterUp = await activeInfo();
console.log('after ArrowUp (back to first-ish):', JSON.stringify(afterUp));

await page.keyboard.press('End');
const afterEnd = await activeInfo();
console.log('after End (expect last enabled item, "Remove card"):', JSON.stringify(afterEnd));

await page.keyboard.press('Home');
const afterHome = await activeInfo();
console.log('after Home (expect first item again):', JSON.stringify(afterHome));

// Toggle a checkable item with Enter/Space and confirm aria-checked flips + menu stays open (per PrimeNG popover behavior)
console.log('\n--- Activating a menuitemcheckbox with Space ---');
const beforeChecked = await activeInfo();
console.log('item before activation:', JSON.stringify(beforeChecked));
await page.keyboard.press('Space');
await page.waitForTimeout(150);
// after choose(), popover().hide() is called immediately, so menu should close and focus return to trigger
const afterChoose = await activeInfo();
console.log('focused element after choosing an item (expect trigger button, menu closed):', JSON.stringify(afterChoose));
console.log('trigger aria-expanded after choosing:', await trigger.getAttribute('aria-expanded'));

console.log('\n=== Reopen + Escape returns focus to trigger without changing anything ===');
await trigger.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
console.log('opened, focused:', JSON.stringify(await activeInfo()));
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const afterEscape = await activeInfo();
console.log('focused after Escape (expect trigger):', JSON.stringify(afterEscape));
console.log('trigger aria-expanded after Escape:', await trigger.getAttribute('aria-expanded'));
const isTrigger = await page.evaluate(
  () => document.activeElement === document.querySelector('button[aria-label="Card menu: Sign-ups"]'),
);
console.log('document.activeElement === trigger button:', isTrigger);

console.log('\n=== Menu dismiss via clicking outside also restores state sanely ===');
await trigger.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
await page.mouse.click(5, 5);
await page.waitForTimeout(150);
console.log('trigger aria-expanded after outside click:', await trigger.getAttribute('aria-expanded'));

await browser.close();
