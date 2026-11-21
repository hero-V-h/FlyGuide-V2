import { test as base, expect, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DIST = path.resolve(__dirname, '../dist/FlyGuide_v20.html');
export const FILE_URL = 'file://' + DIST;
export const OWNER = 'owner@flyguide.app';
export const REGIONS = ['dullstroom', 'kzn', 'ec', 'cape'] as const;

// Every test fails if the page throws: page errors and console errors are collected
// for the whole test and checked at the end.
export const test = base.extend<{ errors: string[] }>({
  errors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // blocked network requests are expected in tests
      if (/ERR_FAILED|ERR_BLOCKED|ERR_INTERNET|net::|Failed to load resource/i.test(t)) return;
      errors.push('console: ' + t);
    });
    await use(errors);
    expect(errors, 'page errors').toEqual([]);
  }, { auto: true }]
});
export { expect };

export async function blockNetwork(page: Page, allow: RegExp | null = null) {
  await page.context().route(/^https?:\/\//, (route) => {
    if (allow && allow.test(route.request().url())) return route.continue();
    return route.abort();
  });
}

export async function openApp(page: Page, opts: { allow?: RegExp } = {}) {
  await blockNetwork(page, opts.allow || null);
  await page.goto(FILE_URL);
  await expect(page.locator('#auth-overlay')).toBeVisible();
}

export async function asGuest(page: Page) {
  await page.getByRole('button', { name: 'Continue without an account (Dullstroom only)' }).click();
  await expect(page.locator('#auth-overlay')).toBeHidden();
}

export async function signUp(page: Page, email: string, name = 'Thabo Nkosi', pw = 'secret123') {
  await page.locator('#auth-tab-signup').click();
  await page.locator('#signup-name').fill(name);
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(pw);
  await page.getByRole('button', { name: 'Create my account' }).click();
}

export async function asOwner(page: Page) {
  await signUp(page, OWNER, 'Owner');
  await expect(page.locator('#auth-overlay')).toBeHidden();
  await expect(page.locator('#plan-screen')).toBeHidden();
}

export async function go(page: Page, panel: string) {
  await page.evaluate((p) => (window as any).go(p), panel);
  await expect(page.locator('#panel-' + panel)).toBeVisible();
}

export async function scrollToMap(page: Page) {
  await page.evaluate(() => document.getElementById('map-card')!.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(100);
}

export async function waitFlight(page: Page) {
  await page.waitForFunction(() => !(window as any).MAP.anim);
  await page.waitForTimeout(450); // crossfades and pin entrances
}

export function shotPath(project: string, name: string) {
  const dir = path.resolve(__dirname, '../dist/screenshots');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${project}-${name}.jpg`);
}
