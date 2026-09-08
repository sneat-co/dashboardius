#!/usr/bin/env node
/**
 * Build-time PrimeNG palette generator.
 *
 * Adapted from sneat-co/gametable (founder decision 2026-08-19, ionic-primeng-spike follow-up): PrimeNG's
 * eleven primary shade slots should be generated at BUILD TIME as literal
 * hex values — two full ramps, one for light mode and one for dark mode,
 * selected via `providePrimeNG({ theme: { options: { darkModeSelector } } })`
 * — rather than pinned to `var(--color-accent)` references. No product
 * needs runtime colour changes, so paying the one-time generation cost here
 * buys a real eleven-tint palette instead of the spike's two-tone fallback.
 *
 * Run with `pnpm generate:palette` (or `node scripts/generate-primeng-palette.mjs`)
 * whenever BASE_ACCENT_HEX changes. It overwrites the checked-in
 * `libs/extensions/gametable/runtime/src/lib/theme/generated-palette.ts`.
 *
 * Pure HSL math, no dependencies — this only needs to run offline, so a
 * from-scratch @primeuix/themes/primeng peer dependency isn't worth adding.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The ONE brand token every ramp below is derived from. Keep this in sync
// with `--brand` in `src/styles.scss` — that file is what the Dashboardius
// chrome reads live at runtime; this script bakes the same starting colour
// into literal PrimeNG shades instead of reading the CSS variable.
const BASE_ACCENT_HEX = '#0B7285'; // Dashboardius "gauge teal"

// Target lightness (0-100) per shade slot. DELIBERATELY DARK-ANCHORED: slot 500
// sits at the brand's own lightness (~28) rather than the ~58 a pastel-anchored
// ramp would use, because Dashboardius' accent is a deep instrument teal, not a
// mid-tone. 600/700 stay darker than 500 so PrimeNG's hover/active chain still
// reads as "pressed harder", and 50/100 stay light enough to be subtle
// selection backgrounds.
const LIGHT_LIGHTNESS = {
  50: 96,
  100: 91,
  200: 82,
  300: 66,
  400: 44,
  500: 28,
  600: 24,
  700: 20,
  800: 17,
  900: 14,
  950: 10,
};

// Dark-scheme ramp: same hue, lifted lightness so the same eleven steps read
// with correct contrast against a dark surface (a straight reuse of the
// light ramp under-lights badly on dark backgrounds — this is a real second
// ramp, not the light one relabelled).
const DARK_LIGHTNESS_OFFSET = 10;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN:
        h = ((gN - bN) / d + (gN < bN ? 6 : 0)) * 60;
        break;
      case gN:
        h = ((bN - rN) / d + 2) * 60;
        break;
      default:
        h = ((rN - gN) / d + 4) * 60;
    }
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let rP = 0;
  let gP = 0;
  let bP = 0;
  if (h < 60) [rP, gP, bP] = [c, x, 0];
  else if (h < 120) [rP, gP, bP] = [x, c, 0];
  else if (h < 180) [rP, gP, bP] = [0, c, x];
  else if (h < 240) [rP, gP, bP] = [0, x, c];
  else if (h < 300) [rP, gP, bP] = [x, 0, c];
  else [rP, gP, bP] = [c, 0, x];
  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rP)}${toHex(gP)}${toHex(bP)}`;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** Desaturate slightly at the extremes so 50/100 aren't neon pastels and 950 isn't a flat near-black. */
function saturationFor(baseSaturation, lightness) {
  if (lightness >= 85) {
    const t = clamp((lightness - 85) / 15, 0, 1);
    return baseSaturation * (1 - 0.4 * t);
  }
  if (lightness <= 20) {
    const t = clamp((20 - lightness) / 20, 0, 1);
    return baseSaturation * (1 - 0.3 * t);
  }
  return baseSaturation;
}

function buildRamp(baseHsl, lightnessOffset) {
  /** @type {Record<string,string>} */
  const ramp = {};
  for (const [shade, targetL] of Object.entries(LIGHT_LIGHTNESS)) {
    const l = clamp(targetL + lightnessOffset, 2, 98);
    const s = saturationFor(baseHsl.s, l);
    ramp[shade] = hslToHex(baseHsl.h, s, l);
  }
  return ramp;
}

const baseHsl = rgbToHsl(hexToRgb(BASE_ACCENT_HEX));
const lightRamp = buildRamp(baseHsl, 0);
const darkRamp = buildRamp(baseHsl, DARK_LIGHTNESS_OFFSET);

const rampLiteral = (ramp) =>
  `{\n${Object.entries(ramp)
    .map(([shade, hex]) => `    ${shade}: '${hex}',`)
    .join('\n')}\n  }`;

const output = `/**
 * GENERATED FILE — do not hand-edit.
 * Produced by scripts/generate-primeng-palette.mjs from BASE_ACCENT_HEX
 * (${BASE_ACCENT_HEX}, the same value as --brand in src/styles.scss).
 * Re-run \`pnpm generate:palette\` after changing the brand token there.
 */

export interface PrimeNgShadeRamp {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export const LIGHT_PRIMARY_RAMP: PrimeNgShadeRamp = ${rampLiteral(lightRamp)};

export const DARK_PRIMARY_RAMP: PrimeNgShadeRamp = ${rampLiteral(darkRamp)};
`;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'src', 'app', 'theme', 'generated-palette.ts');
writeFileSync(outPath, output, 'utf8');
console.log(`Wrote ${outPath}`);
console.log('Light 500 (should read close to the brand accent):', lightRamp['500']);
console.log('Dark 400 (should read close to the brand accent, lifted for dark bg):', darkRamp['400']);
