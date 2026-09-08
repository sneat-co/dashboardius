import { chromium } from '@playwright/test';

export const URL = 'http://127.0.0.1:4321/';

export async function openPage(opts = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: opts.viewport ?? { width: 1280, height: 900 },
    reducedMotion: opts.reducedMotion,
    colorScheme: opts.colorScheme,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(URL, { waitUntil: 'networkidle' });
  return { browser, context, page, cdp };
}

export async function fullAXTree(cdp) {
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  return nodes;
}

function val(prop) {
  if (prop == null) return undefined;
  return prop.value;
}

export function axSummary(nodes) {
  return nodes
    .filter((n) => !n.ignored)
    .map((n) => ({
      role: val(n.role),
      name: val(n.name),
      value: val(n.value),
      description: val(n.description),
      properties: Object.fromEntries((n.properties ?? []).map((p) => [p.name, val(p.value)])),
      backendDOMNodeId: n.backendDOMNodeId,
    }));
}

export function relLum([r, g, b]) {
  const lin = (c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [r, g, b].map(lin);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function ratioRGB(a, b) {
  const la = relLum(a);
  const lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
