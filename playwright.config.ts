import { defineConfig } from '@playwright/test';

// Two viewports from the brief. External network is blocked inside each test
// (see tests/helpers.ts) so a missing font or CDN can never hide a failure.
export default defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 3,
  reporter: [['list']],
  use: { trace: 'off', deviceScaleFactor: 1 },
  projects: [
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } }
  ]
});
