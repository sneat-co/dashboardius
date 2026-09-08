import { openPage } from './lib.mjs';

const { browser, page } = await openPage();

async function state(label) {
  const info = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-label="Card menu: Sign-ups"]');
    // PrimeNG Popover renders its panel appended to body (or overlay container)
    const panels = Array.from(document.querySelectorAll('.p-popover, .p-popover-content, [data-pc-name="popover"]'));
    const visiblePanels = panels.filter((p) => {
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    return {
      triggerAriaExpanded: trigger?.getAttribute('aria-expanded'),
      panelCountInDom: panels.length,
      visiblePanelCount: visiblePanels.length,
      activeTag: document.activeElement?.tagName,
      activeText: (document.activeElement?.textContent || '').trim().slice(0, 30),
    };
  });
  console.log(`${label}:`, JSON.stringify(info));
  return info;
}

const trigger = page.locator('button[aria-label="Card menu: Sign-ups"]');

await state('0. initial');

await trigger.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await state('1. after Enter (open #1)');

await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await state('2. after Escape (should be closed, expanded=false)');

await trigger.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await state('3. after Enter again (open #2)');

await page.keyboard.press('ArrowDown');
await page.keyboard.press('Space'); // choose() path
await page.waitForTimeout(200);
await state('4. after choosing an item (should be closed, expanded=false)');

await trigger.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await state('5. after Enter again (open #3)');

await page.mouse.click(5, 5); // outside click, PrimeNG's own dismiss path
await page.waitForTimeout(200);
await state('6. after outside click (should be closed, expanded=false)');

await browser.close();
