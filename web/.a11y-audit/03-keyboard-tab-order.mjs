import { openPage } from './lib.mjs';

const { browser, page } = await openPage();

async function describeFocused() {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    // Does the element (or a pseudo-element) paint a visible focus affordance?
    const outlineVisible = cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px';
    const boxShadow = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : null;
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      text: (el.textContent || '').trim().slice(0, 40),
      id: el.id || undefined,
      cls: (el.className && el.className.toString().slice(0, 40)) || undefined,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      boxShadow,
      hasVisibleFocus: outlineVisible || !!boxShadow,
      inViewport: rect.top >= 0 && rect.top < window.innerHeight,
      rectTop: Math.round(rect.top),
    };
  });
}

console.log('=== Tab walk from top of page (first 40 stops) ===');
await page.keyboard.press('Tab');
let first = await describeFocused();
console.log('STOP 1 (should be skip link):', JSON.stringify(first));

const noFocusIndicator = [];
const seen = [];
for (let i = 2; i <= 45; i++) {
  await page.keyboard.press('Tab');
  const f = await describeFocused();
  if (!f) {
    console.log(`STOP ${i}: focus left document / body`);
    break;
  }
  seen.push(f);
  if (!f.hasVisibleFocus) noFocusIndicator.push({ stop: i, ...f });
  console.log(
    `STOP ${i}: <${f.tag}${f.role ? ` role=${f.role}` : ''}> "${f.ariaLabel || f.text}"  outline=${f.outlineStyle}/${f.outlineWidth}  boxShadow=${f.boxShadow ? 'yes' : 'no'}  visibleFocus=${f.hasVisibleFocus}`,
  );
}

console.log('\n=== Elements with NO visible focus indicator ===');
console.log(JSON.stringify(noFocusIndicator, null, 2));

console.log('\n=== Skip link activation ===');
await page.keyboard.press('Home'); // no-op, just ensure page state
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('body').evaluate((el) => el.focus());
await page.keyboard.press('Tab');
const skip = await describeFocused();
console.log('Focused element (expect skip link):', JSON.stringify(skip));
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
const afterSkip = await page.evaluate(() => ({
  activeTag: document.activeElement?.tagName,
  activeId: document.activeElement?.id,
  isBoard: document.activeElement?.id === 'board',
  scrollY: window.scrollY,
}));
console.log('After activating skip link:', JSON.stringify(afterSkip));

await browser.close();
