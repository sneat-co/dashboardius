import { openPage, ratioRGB } from './lib.mjs';

function parseRgb(str) {
  const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

const { browser, page } = await openPage();

console.log('=== Toggle to dark mode via the header button ===');
const themeBtn = page.getByRole('button', { name: /Switch to dark theme/i });
await themeBtn.click();
await page.waitForTimeout(200);
const htmlClass = await page.evaluate(() => document.documentElement.className);
console.log('html class after toggle:', htmlClass);
await page.screenshot({ path: '.a11y-audit/shots/dark-top.png', fullPage: false });

console.log('\n=== Live computed colors, DARK mode ===');
async function sample(selector, label) {
  const data = await page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { color: cs.color, backgroundColor: cs.backgroundColor, fontSize: cs.fontSize, fontWeight: cs.fontWeight };
  }).catch(() => null);
  if (!data) {
    console.log(`${label}: NOT FOUND (${selector})`);
    return;
  }
  console.log(`${label}: color=${data.color} bg=${data.backgroundColor} size=${data.fontSize} weight=${data.fontWeight}`);
}

await sample('.badge', 'header badge ("Live demo board")');
await sample('.hero-label', 'chart hero-label');
await sample('.delta.is-up', 'chart delta up (good on card)');
await sample('.tile-note', 'stat tile note (ink-faint)');

console.log('\n=== Open auth dialog in dark mode, sample error box + google button border ===');
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.waitForTimeout(300);
const dialogBg = await page.locator('.p-dialog-content, .p-dialog').first().evaluate((el) => getComputedStyle(el).backgroundColor);
console.log('dialog content background (dark):', dialogBg);
const googleBorder = await page.locator('.google').evaluate((el) => getComputedStyle(el).borderColor);
console.log('google button border-color (dark):', googleBorder);
const inputBorder = await page.locator('input[name="email"]').evaluate((el) => getComputedStyle(el).borderColor);
console.log('email input border-color (dark):', inputBorder);

await page.fill('input[name="email"]', 'user@example.com');
await page.fill('input[name="password"]', 'wrongpw');
await page.locator('button.primary').click();
await page.waitForTimeout(600);
const errorBox = await page.locator('.error[role="alert"]').first().evaluate((el) => {
  const cs = getComputedStyle(el);
  return { color: cs.color, backgroundColor: cs.backgroundColor };
});
console.log('error box color/bg (dark):', JSON.stringify(errorBox));
if (errorBox.backgroundColor) {
  const fg = parseRgb(errorBox.color);
  const bg = parseRgb(errorBox.backgroundColor);
  if (fg && bg) console.log('  -> computed contrast ratio:', ratioRGB(fg, bg).toFixed(2) + ':1');
}
await page.screenshot({ path: '.a11y-audit/shots/dark-dialog-error.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

console.log('\n=== Card menu popover background (dark) + entry text color ===');
await page.getByRole('button', { name: 'Card menu: Sign-ups' }).click();
await page.waitForTimeout(200);
const menuBg = await page.locator('.p-popover').first().evaluate((el) => getComputedStyle(el).backgroundColor);
console.log('popover background (dark):', menuBg);
const entryColor = await page.locator('.entry').first().evaluate((el) => getComputedStyle(el).color);
console.log('menu entry text color (dark):', entryColor);
if (menuBg && entryColor) {
  const fg = parseRgb(entryColor);
  const bg = parseRgb(menuBg);
  if (fg && bg) console.log('  -> computed contrast ratio:', ratioRGB(fg, bg).toFixed(2) + ':1');
}
await page.screenshot({ path: '.a11y-audit/shots/dark-menu.png' });

await browser.close();
