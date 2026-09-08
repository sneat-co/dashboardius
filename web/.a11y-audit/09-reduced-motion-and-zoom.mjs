import { openPage } from './lib.mjs';

console.log('=== Reduced motion: emulated prefers-reduced-motion: reduce ===');
{
  const { browser, page } = await openPage({ reducedMotion: 'reduce' });
  const anim = await page.evaluate(() => {
    // Trigger the arrive/spin/pulse animations by running a command and
    // opening a card menu, then sample computed animation/transition
    // durations on a few elements known to animate.
    return null;
  });
  // Run a suggestion so a card "arrives" (.is-arriving) and the trace
  // (.trace, slide-in) mount while reduced-motion is active.
  await page.getByRole('button', { name: 'Add a DataTug card' }).first().click();
  await page.waitForTimeout(200);
  const durations = await page.evaluate(() => {
    const check = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, found: false };
      const cs = getComputedStyle(el);
      return {
        sel,
        found: true,
        animationDuration: cs.animationDuration,
        transitionDuration: cs.transitionDuration,
      };
    };
    return [
      check('.is-arriving'),
      check('.trace'),
      check(':root'), // global scroll-behavior check happens separately
    ];
  });
  console.log(JSON.stringify(durations, null, 2));

  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  console.log('documentElement scroll-behavior (reduced motion):', scrollBehavior);

  await browser.close();
}

console.log('\n=== Without reduced motion (baseline) ===');
{
  const { browser, page } = await openPage();
  await page.getByRole('button', { name: 'Add a DataTug card' }).first().click();
  await page.waitForTimeout(50);
  const durations = await page.evaluate(() => {
    const el = document.querySelector('.is-arriving');
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    return { found: true, animationDuration: cs.animationDuration };
  });
  console.log(JSON.stringify(durations, null, 2));
  await browser.close();
}

console.log('\n=== Zoom / reflow: 320px CSS width, no horizontal scroll ===');
{
  const { browser, page } = await openPage({ viewport: { width: 320, height: 720 } });
  await page.waitForTimeout(300);
  const reflow = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    horizontalScrollNeeded: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  console.log('320px viewport:', JSON.stringify(reflow));
  await page.screenshot({ path: '.a11y-audit/shots/320-top.png' });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(200);
  await page.screenshot({ path: '.a11y-audit/shots/320-scrolled.png' });
  // Find any element WIDER than the viewport (a common reflow culprit)
  const overflowers = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const all = Array.from(document.querySelectorAll('body *'));
    const offenders = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width > w + 2 && r.width < 5000) {
        offenders.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), width: Math.round(r.width) });
      }
      if (offenders.length > 15) break;
    }
    return offenders;
  });
  console.log('Elements wider than 320px viewport:', JSON.stringify(overflowers, null, 2));
  await browser.close();
}

console.log('\n=== 200% zoom simulation (1280x800 -> CSS zoom 2) ===');
{
  const { browser, page } = await openPage({ viewport: { width: 1280, height: 800 } });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await page.waitForTimeout(300);
  const reflow = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    horizontalScrollNeeded: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  console.log('200% zoom reflow check:', JSON.stringify(reflow));
  await page.screenshot({ path: '.a11y-audit/shots/zoom200-top.png' });
  const overflowers = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const all = Array.from(document.querySelectorAll('body *'));
    const offenders = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width > w + 2 && r.width < 5000) {
        offenders.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), width: Math.round(r.width) });
      }
      if (offenders.length > 15) break;
    }
    return offenders;
  });
  console.log('Elements wider than viewport at 200% zoom:', JSON.stringify(overflowers, null, 2));
  await browser.close();
}
