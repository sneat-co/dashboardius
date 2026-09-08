import { openPage } from './lib.mjs';

const { browser, page } = await openPage();

console.log('=== Skip link: computed `top` before / after focus ===');
const link = page.locator('a.db-skip-link');
const before = await link.evaluate((el) => getComputedStyle(el).top);
console.log('top BEFORE focus:', before);

await link.focus();
await page.waitForTimeout(400); // let the 200ms transition finish
const afterFocusCss = await link.evaluate((el) => {
  const cs = getComputedStyle(el);
  return { top: cs.top, position: cs.position, zIndex: cs.zIndex, transform: cs.transform };
});
const rect = await link.evaluate((el) => el.getBoundingClientRect());
const matches = await page.evaluate(() => document.activeElement === document.querySelector('a.db-skip-link'));
console.log('document.activeElement is the skip link:', matches);
console.log('computed style AFTER focus:', JSON.stringify(afterFocusCss));
console.log('getBoundingClientRect AFTER focus:', JSON.stringify(rect));

await page.screenshot({ path: '.a11y-audit/shots/skip-link-focused.png' });
console.log('Screenshot saved: .a11y-audit/shots/skip-link-focused.png');

console.log('\n=== Command-bar prompt: container focus-within visual change ===');
const bar = page.locator('.bar');
const barBefore = await bar.evaluate((el) => {
  const cs = getComputedStyle(el);
  return { borderColor: cs.borderColor, boxShadow: cs.boxShadow };
});
console.log('bar style BEFORE input focus:', JSON.stringify(barBefore));
await page.locator('#db-prompt').focus();
await page.waitForTimeout(100);
const barAfter = await bar.evaluate((el) => {
  const cs = getComputedStyle(el);
  return { borderColor: cs.borderColor, boxShadow: cs.boxShadow };
});
console.log('bar style AFTER input focus:', JSON.stringify(barAfter));
await page.screenshot({ path: '.a11y-audit/shots/prompt-focus-within.png', clip: { x: 0, y: 60, width: 900, height: 140 } });
console.log('Screenshot saved: .a11y-audit/shots/prompt-focus-within.png');

await browser.close();
