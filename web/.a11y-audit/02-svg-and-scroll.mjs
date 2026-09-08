import { openPage, fullAXTree, axSummary } from './lib.mjs';

const { browser, page, cdp } = await openPage();

console.log('=== SVGs with NO accessible-hiding anywhere in ancestor chain and no name ===');
const svgIssues = await page.$$eval('svg', (els) =>
  els
    .map((s) => {
      let n = s;
      let hidden = false;
      let inButtonWithLabel = false;
      while (n) {
        if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') hidden = true;
        if (n.tagName === 'BUTTON' && n.hasAttribute('aria-label')) inButtonWithLabel = true;
        n = n.parentElement;
      }
      return {
        hidden,
        inButtonWithLabel,
        ownAriaLabel: s.getAttribute('aria-label'),
        hasTitleEl: !!s.querySelector('title'),
        outerHtmlStart: s.outerHTML.slice(0, 90),
      };
    })
    .filter((s) => !s.hidden && !s.ownAriaLabel && !s.hasTitleEl),
);
console.log(`Total SVGs on page not hidden and without a name: ${svgIssues.length}`);
console.log(JSON.stringify(svgIssues, null, 2));

console.log('\n=== Scrolling to bottom to trigger @defer(on viewport) charts ===');
await page.evaluate(async () => {
  const step = 400;
  let last = -1;
  while (document.scrollingElement.scrollTop !== last) {
    last = document.scrollingElement.scrollTop;
    document.scrollingElement.scrollBy(0, step);
    await new Promise((r) => setTimeout(r, 120));
  }
});
await page.waitForTimeout(800);

console.log('\n=== Canvas elements after full scroll ===');
const canvasInfo = await page.$$eval('canvas', (els) =>
  els.map((e) => ({ ariaLabel: e.getAttribute('aria-label'), role: e.getAttribute('role'), w: e.width, h: e.height })),
);
console.log(JSON.stringify(canvasInfo, null, 2));

console.log('\n=== AG Grid / Tabulator markup check (Members card default = table; switch engines) ===');
// Members card is a query widget; default engine is 'table'. Its accessible
// table markup was already confirmed in 01-structure. Check role attrs the
// two JS grid libs would add IF selected -- open the Members card menu and
// switch engine to see generated markup's roles.
const membersMenuBtn = page.locator('button[aria-label^="Card menu: Members"]');
await membersMenuBtn.click();
await page.waitForTimeout(150);
const tabulatorOption = page.getByRole('menuitemradio', { name: /Tabulator/i }).first();
const hasRadio = await tabulatorOption.count();
console.log('menuitemradio count for engine group:', hasRadio);
// fall back: just list all menuitem-ish roles inside the open popover
const openMenuNodes = axSummary(await fullAXTree(cdp)).filter((n) =>
  ['menu', 'menuitem', 'menuitemcheckbox', 'menuitemradio'].includes(n.role),
);
console.log(JSON.stringify(openMenuNodes, null, 2));

await browser.close();
