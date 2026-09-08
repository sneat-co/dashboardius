#!/usr/bin/env node
/**
 * Renders `public/og.png` (1200×630) and `public/apple-touch-icon.png` (180×180).
 *
 * Playwright is already a dependency for the browser tests, so the social card
 * is drawn from real HTML with real type rather than assembled by hand or
 * shipped as an SVG that no link-preview crawler will rasterise. Run it after
 * changing the brand or the tagline:
 *
 *   pnpm generate:og
 *
 * The output is committed, so a normal build and deploy never needs a browser.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

const BRAND = '#0b7285';
const PAPER = '#f7f6f3';
const INK = '#15181d';
const MUTED = '#5c6470';
const HAIRLINE = '#e3e1dc';
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

const FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Sign-ups, the same shape as the demo board's headline series. */
const SERIES_VALUES = [42, 51, 47, 63, 58, 71, 84, 79, 96, 108, 121, 134];

const areaPath = (values, w, h) => {
  const max = Math.max(...values) * 1.12;
  const pts = values.map((v, i) => [
    (w / (values.length - 1)) * i,
    h - (v / max) * h,
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return { line, area: `${line} L${w},${h} L0,${h} Z` };
};

const { line, area } = areaPath(SERIES_VALUES, 470, 104);

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${PAPER}; font-family: ${FONT};
         color: ${INK}; display: grid; grid-template-rows: auto 1fr auto; padding: 54px 58px; }
  .top { display: flex; align-items: center; gap: 12px; }
  .mark { width: 38px; height: 38px; }
  .word { font-size: 31px; font-weight: 680; letter-spacing: -0.025em; }
  .chip { margin-left: auto; border: 1px solid ${HAIRLINE}; border-radius: 999px;
          padding: 5px 14px; font-size: 15px; font-weight: 620; color: ${MUTED}; }
  h1 { font-size: 53px; font-weight: 680; letter-spacing: -0.032em; line-height: 1.03;
       margin-top: 26px; max-width: 15ch; }
  .sub { margin-top: 13px; font-size: 19px; color: ${MUTED}; max-width: 60ch; line-height: 1.4; }
  .cards { display: grid; grid-template-columns: 1fr 300px; gap: 16px; margin-top: 26px; }
  .card { background: #fff; border: 1px solid ${HAIRLINE}; border-radius: 14px;
          box-shadow: 0 1px 2px rgba(21,24,29,.05); padding: 16px 18px; }
  .card h2 { font-size: 14px; font-weight: 640; color: ${MUTED}; letter-spacing: .01em; }
  .fig { font-size: 36px; font-weight: 660; letter-spacing: -0.03em; margin-top: 2px; }
  .tiles { display: grid; grid-template-rows: repeat(3, 1fr); gap: 10px; }
  .tile { display: flex; align-items: baseline; justify-content: space-between; }
  .tile span { font-size: 13px; color: ${MUTED}; }
  .tile b { font-size: 21px; font-weight: 650; letter-spacing: -0.02em; }
  .dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 7px; }
</style></head><body>
  <div class="top">
    <svg class="mark" viewBox="0 0 22 22" fill="none">
      <path d="M2.6 16.2a10 10 0 1 1 16.8 0" stroke="${BRAND}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M11 12.6 15.6 6.9" stroke="${BRAND}" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="11" cy="13.1" r="1.9" fill="${BRAND}"/>
    </svg>
    <div class="word">Dashboardius</div>
    <div class="chip">dashboardius.com</div>
  </div>

  <div>
    <h1>Any data.<br/>Your metrics.<br/>One view.</h1>
    <p class="sub">The homepage is a working dashboard. Move the cards, add a hidden metric,
      ask for a change in a sentence, reset when you are done.</p>

    <div class="cards">
      <div class="card">
        <h2>Sign-ups</h2>
        <div class="fig">134</div>
        <svg width="470" height="104" style="margin-top:6px">
          <path d="${area}" fill="${SERIES[0]}" fill-opacity="0.14"/>
          <path d="${line}" fill="none" stroke="${SERIES[0]}" stroke-width="2.5"/>
        </svg>
      </div>
      <div class="card tiles">
        <div class="tile"><span><i class="dot" style="background:${SERIES[1]}"></i>Dashboards</span><b>1,284</b></div>
        <div class="tile"><span><i class="dot" style="background:${SERIES[2]}"></i>Cards viewed</span><b>96,510</b></div>
        <div class="tile"><span><i class="dot" style="background:${SERIES[3]}"></i>Commands run</span><b>742</b></div>
      </div>
    </div>
  </div>
</body></html>`;

const iconHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 180px; height: 180px; background: ${BRAND}; display: grid; place-items: center; }
</style></head><body>
  <svg width="128" height="128" viewBox="0 0 22 22" fill="none">
    <path d="M2.6 16.2a10 10 0 1 1 16.8 0" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M11 12.6 15.6 6.9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="11" cy="13.1" r="2" fill="#fff"/>
  </svg>
</body></html>`;

const browser = await chromium.launch();

const shoot = async (html, width, height, file) => {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const buffer = await page.screenshot({ type: 'png' });
  writeFileSync(join(publicDir, file), buffer);
  await page.close();
  console.log(`wrote public/${file} (${width}×${height})`);
};

await shoot(ogHtml, 1200, 630, 'og.png');
await shoot(iconHtml, 180, 180, 'apple-touch-icon.png');

await browser.close();
