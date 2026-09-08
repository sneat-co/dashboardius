import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * What a crawler and a cold visitor get BEFORE any JavaScript runs.
 *
 * The board is an application, but the page is also dashboardius.com's only
 * marketing surface, so the prerendered HTML has to stand on its own. These
 * read the built file directly rather than a running browser — running it in a
 * browser would prove hydration works, not that the HTML shipped complete.
 *
 * Requires `pnpm build` to have run. Skipped rather than failed when it has
 * not, so a `pnpm test:e2e` on a clean checkout is not a confusing red.
 */

const DIST = join(process.cwd(), 'dist', 'dashboardius', 'browser', 'index.html');

let html = '';
try {
  html = readFileSync(DIST, 'utf8');
} catch {
  html = '';
}

test.describe('prerendered homepage', () => {
  test.skip(() => !html, 'run `pnpm build` first — no prerendered index.html found');

  test('carries the head a search engine and a link preview need', () => {
    expect(html).toContain('<title>Dashboardius — Any data. Your metrics. One view.</title>');
    expect(html).toMatch(/<meta name="description" content="[^"]{80,}"/);
    expect(html).toContain('<link rel="canonical" href="https://dashboardius.com/"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('application/ld+json');
  });

  test('ships the board as real markup, not an empty shell', () => {
    expect(html).toContain('Dashboardius');
    expect(html).toContain('Any data. Your metrics. One view.');
    // Cards, their titles and their prose are all in the HTML.
    for (const text of ['Sign-ups', 'Members', 'DataTug gets the data', 'Product pulse']) {
      expect(html).toContain(text);
    }
    // A chart's values are readable as a table even before hydration.
    expect(html).toContain('<table');
  });

  test('states plainly that the numbers are samples', () => {
    expect(html).toContain('Sample data');
  });

  test('has exactly one h1 and a sensible heading order', () => {
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    expect(h1s).toHaveLength(1);
    expect(html).toMatch(/<h2[\s>]/);
  });
});
