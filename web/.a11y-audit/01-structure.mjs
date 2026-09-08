import { openPage, fullAXTree, axSummary } from './lib.mjs';

const { browser, page, cdp } = await openPage();

console.log('=== PAGE <html lang> ===');
console.log(await page.getAttribute('html', 'lang'));

console.log('\n=== Headings (DOM order, tag + text) ===');
const headings = await page.$$eval('h1,h2,h3,h4,h5,h6', (els) =>
  els.map((e) => ({
    tag: e.tagName.toLowerCase(),
    text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 70),
    visible: !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length),
  })),
);
let lastLevel = 0;
for (const h of headings) {
  const level = Number(h.tag[1]);
  const skipped = lastLevel > 0 && level > lastLevel + 1;
  console.log(`${skipped ? '*** SKIP ***' : '           '} ${h.tag}  "${h.text}"`);
  lastLevel = level;
}
console.log(`h1 count: ${headings.filter((h) => h.tag === 'h1').length}`);

console.log('\n=== Landmarks (via AX tree) ===');
const nodes = axSummary(await fullAXTree(cdp));
const landmarkRoles = new Set([
  'banner', 'navigation', 'main', 'contentinfo', 'complementary', 'region', 'search', 'form',
]);
for (const n of nodes) {
  if (landmarkRoles.has(n.role)) {
    console.log(`${n.role}  name="${n.name ?? ''}"`);
  }
}

console.log('\n=== role=status / role=alert / aria-live nodes (DOM) ===');
const live = await page.$$eval('[role],[aria-live]', (els) =>
  els
    .filter((e) => e.getAttribute('role') === 'status' || e.getAttribute('role') === 'alert' || e.hasAttribute('aria-live'))
    .map((e) => ({
      role: e.getAttribute('role'),
      ariaLive: e.getAttribute('aria-live'),
      text: e.textContent.trim().slice(0, 80),
      visible: !!(e.offsetWidth || e.offsetHeight),
      selector: e.className || e.tagName,
    })),
);
console.log(JSON.stringify(live, null, 2));

console.log('\n=== canvas elements: role/name via AX tree, and DOM attrs ===');
const canvasInfo = await page.$$eval('canvas', (els) =>
  els.map((e) => ({
    ariaLabel: e.getAttribute('aria-label'),
    role: e.getAttribute('role'),
    tabindex: e.getAttribute('tabindex'),
    width: e.width,
    height: e.height,
  })),
);
console.log('DOM attrs:', JSON.stringify(canvasInfo, null, 2));
const axCanvasLike = nodes.filter((n) => n.role === 'image' || n.role === 'img' || n.role === 'canvas' || (n.name && n.name.includes('across') && n.name.includes('periods')));
console.log('AX nodes matching chart summaries:', JSON.stringify(axCanvasLike, null, 2));

console.log('\n=== All buttons: computed accessible name (AX tree) ===');
const buttonNodes = nodes.filter((n) => n.role === 'button');
for (const b of buttonNodes) {
  console.log(`name="${b.name ?? ''}"  ${!b.name || !b.name.trim() ? '<<< NO ACCESSIBLE NAME' : ''}`);
}

console.log('\n=== All links: computed accessible name ===');
const linkNodes = nodes.filter((n) => n.role === 'link');
for (const l of linkNodes) {
  console.log(`name="${l.name ?? ''}"  ${!l.name || !l.name.trim() ? '<<< NO ACCESSIBLE NAME' : ''}`);
}

console.log('\n=== Form inputs: role/name/required ===');
const inputNodes = nodes.filter((n) => ['textbox', 'checkbox', 'radio', 'combobox'].includes(n.role));
for (const i of inputNodes) {
  console.log(JSON.stringify(i));
}

console.log('\n=== Tables in DOM: caption presence, th scope ===');
const tables = await page.$$eval('table', (els) =>
  els.map((t) => ({
    hasCaption: !!t.querySelector('caption'),
    captionText: t.querySelector('caption')?.textContent?.trim().slice(0, 60),
    thWithScope: t.querySelectorAll('th[scope]').length,
    thTotal: t.querySelectorAll('th').length,
  })),
);
console.log(JSON.stringify(tables, null, 2));

console.log('\n=== Images: alt text audit ===');
const imgs = await page.$$eval('img', (els) => els.map((i) => ({ src: i.src.slice(-40), alt: i.alt })));
console.log(JSON.stringify(imgs, null, 2));

console.log('\n=== svg elements missing aria-hidden AND not otherwise labelled ===');
const svgIssues = await page.$$eval('svg', (els) =>
  els
    .map((s) => ({
      ariaHidden: s.getAttribute('aria-hidden'),
      role: s.getAttribute('role'),
      ariaLabel: s.getAttribute('aria-label'),
      hasTitle: !!s.querySelector('title'),
      parentTag: s.parentElement?.tagName,
      parentAriaLabel: s.parentElement?.getAttribute('aria-label'),
    }))
    .filter((s) => s.ariaHidden !== 'true' && !s.ariaLabel && !s.hasTitle),
);
console.log(`SVGs not aria-hidden and without their own label: ${svgIssues.length}`);
console.log(JSON.stringify(svgIssues, null, 2));

await browser.close();
