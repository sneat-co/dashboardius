import { defineConfig, devices } from '@playwright/test';

/** A dedicated port, so a stray dev server on 4200 cannot be mistaken for this app. */
const PORT = Number(process.env.E2E_PORT || 4322);
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

/**
 * Browser end-to-end tests for the landing page.
 *
 * They run against `ng serve` rather than the prerendered build, because what
 * they are checking is the interactive half — drag, menus, the command
 * pipeline, undo and reset. The prerendered half is covered by its own build
 * assertions in `e2e/prerender.spec.ts`, which read the built HTML directly.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line']] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `pnpm exec ng serve --host 127.0.0.1 --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 240_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
