#!/usr/bin/env node
/**
 * Writes the PrimeUI licence key into the bundle at build time.
 *
 * PrimeNG 21+ ships under the PrimeUI licence and, without a valid key, injects
 * a fixed banner into the bottom-right of the running page (see
 * `primeng/types/primeng-license.d.ts`). Sneat is well inside the free
 * Community tier, but the tier still issues a key and the key still has to be
 * present in the build, so this reads it from the environment rather than
 * committing it.
 *
 * `sneat-co/cicd`'s cf-deploy workflow already threads a `PRIMEUI_LICENSE`
 * secret into the build step, which is where this picks it up. With no key set
 * the build still succeeds and the banner appears — a visible, honest reminder
 * rather than a silent failure.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const key = process.env.PRIMEUI_LICENSE ?? '';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'environments', 'primeui-license.ts');

writeFileSync(
  out,
  `/** GENERATED at build time by scripts/write-primeui-license.mjs — do not edit. */\nexport const PRIMEUI_LICENSE = ${JSON.stringify(key)};\n`,
  'utf8',
);

console.log(key ? 'PrimeUI licence key baked in.' : 'PrimeUI licence key NOT set — the build will show the licence banner.');
