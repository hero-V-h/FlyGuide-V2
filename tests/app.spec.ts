import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { test, expect, openApp, asGuest, asOwner, go, REGIONS } from './helpers';

test('Recommend returns four cards for every region and venue, and the print card renders', async ({ page }) => {
  await openApp(page); await asOwner(page);
  await page.evaluate(() => { (window as any).print = () => {}; });
  await go(page, 'recommend');
  for (const k of REGIONS) {
    await page.evaluate((k) => (window as any).setRegion(k, { silent: true }), k);
    const vals = await page.locator('#venue option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
    expect(vals.length).toBeGreaterThan(5);
    for (const v of vals) {
      await page.locator('#venue').selectOption(v);
      await page.getByRole('button', { name: 'Get recommendation' }).click();
      await expect(page.locator('#results .fly-list .fly')).toHaveCount(4);
      await expect(page.locator('#results .fly.lead')).toHaveCount(1);
    }
  }
  await page.getByRole('button', { name: 'Print card' }).click();
  await expect(page.locator('#print-card-area .print-card .top-fly-row')).toHaveCount(4);
});

test('paywall: guest sees banners and locked content; the owner gets everything', async ({ page }) => {
  await openApp(page); await asGuest(page);
  for (const p of ['rig', 'tippet']) {
    await go(page, p);
    await expect(page.locator(`#panel-${p} .paywall-banner`)).toBeVisible();
    await expect(page.locator(`#panel-${p} .pw-content`)).toHaveClass(/locked-content/);
  }
  await go(page, 'log'); await expect(page.locator('#paywall-log')).toBeVisible(); await expect(page.locator('#log-content')).toHaveClass(/locked-content/);
  await go(page, 'stats'); await expect(page.locator('#paywall-stats')).toBeVisible();
  await go(page, 'chat'); await expect(page.locator('#paywall-chat')).toBeVisible(); await expect(page.locator('#chat-container')).toBeHidden();
  await page.evaluate(() => (window as any).openMoreSheet());
  await expect(page.locator('#more-sheet .more-pro:visible')).toHaveCount(5);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => ['kzn', 'ec', 'cape'].map((k) => (window as any).canUseRegion(k)))).toEqual([false, false, false]);
  // switching to a locked region opens the plan screen
  await page.evaluate(() => (window as any).setRegion('cape'));
  await expect(page.locator('#plan-screen')).toBeVisible();
});

test('owner email has full access', async ({ page }) => {
  await openApp(page); await asOwner(page);
  await expect(page.locator('#trial-chip')).toHaveText('Owner');
  for (const p of ['rig', 'tippet', 'log', 'stats', 'chat']) {
    await go(page, p);
    await expect(page.locator(`#panel-${p} .paywall-banner`)).toBeHidden();
  }
  await expect(page.locator('#chat-container')).toBeVisible();
  expect(await page.evaluate(() => ['dullstroom', 'kzn', 'ec', 'cape'].every((k) => (window as any).canUseRegion(k)))).toBe(true);
});

test('catch log: save, delete through the confirm sheet, export CSV', async ({ page }) => {
  await openApp(page); await asOwner(page);
  await go(page, 'log');
  await page.locator('#log-venue-text').fill('Bushmans River');
  await page.locator('#log-fish').fill('3');
  await page.locator('#log-flies').fill("DDD #14, Walker's Killer #8");
  await page.locator('.star').nth(3).click();
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.locator('#entries-list .log-entry')).toHaveCount(1);
  await expect(page.locator('#stat-fish')).toHaveText('3');
  await expect(page.locator('#toast')).toHaveText('Session saved');
  const threw = await page.evaluate(() => { try { (window as any).exportCSV(); return false; } catch (e) { return String(e); } });
  expect(threw).toBe(false);
  await page.getByRole('button', { name: 'Compare sessions' }).click();
  await expect(page.locator('#compare-cards .compare-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete session' }).click();
  await expect(page.locator('#confirm-sheet')).toHaveClass(/open/);
  await page.locator('#confirm-ok').click();
  await expect(page.locator('#entries-list .log-entry')).toHaveCount(0);
  await expect(page.locator('#entries-list')).toContainText('No sessions yet');
});

test('Learn: all seven tabs render and accordions toggle with the keyboard', async ({ page }) => {
  await openApp(page); await asGuest(page);
  await go(page, 'knowledge');
  const tabs = page.locator('.know-nav-btn');
  await expect(tabs).toHaveCount(7);
  const ids = ['species', 'entomology', 'water', 'casting', 'knots', 'temp', 'regs'];
  for (let i = 0; i < 7; i++) {
    await tabs.nth(i).click();
    const sec = page.locator('#know-' + ids[i]);
    await expect(sec).toBeVisible();
    expect((await sec.innerText()).length).toBeGreaterThan(200);
  }
  await tabs.nth(1).click();
  const head = page.locator('#know-entomology .know-card-header').first();
  await head.focus();
  const before = await head.getAttribute('aria-expanded');
  await page.keyboard.press('Enter');
  await expect(head).toHaveAttribute('aria-expanded', before === 'true' ? 'false' : 'true');
  await page.keyboard.press(' ');
  await expect(head).toHaveAttribute('aria-expanded', before!);
});

test('hatch, rig and tippet tools produce results', async ({ page }) => {
  await openApp(page); await asOwner(page);
  await go(page, 'hatch');
  await expect(page.locator('#hatch-content .hatch-table tr')).toHaveCount(13);
  await expect(page.locator('#hatch-content tr.now')).toHaveCount(1);
  await go(page, 'rig');
  await page.getByRole('button', { name: 'Build my rig' }).click();
  await expect(page.locator('#rig-result .rig-step')).toHaveCount(4);
  await expect(page.locator('#rig-result .rig-step.fly')).toHaveCount(0);
  await go(page, 'tippet');
  await page.locator('#tip-clarity').selectOption('crystal');
  await page.getByRole('button', { name: 'Calculate tippet' }).click();
  await expect(page.locator('#tippet-result .stat-card')).toHaveCount(4);
  await expect(page.locator('.tippet-table tr.highlight')).toHaveCount(1);
  // size 18 dry is 5X, one finer for crystal water
  await expect(page.locator('#tippet-result .rig-header')).toHaveText('6X tippet for a size 18 dry');
});

test('no horizontal overflow at 390 px on any panel', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone width');
  await openApp(page); await asOwner(page);
  for (const p of ['explore', 'recommend', 'flybox', 'knowledge', 'hatch', 'rig', 'tippet', 'log', 'stats', 'chat']) {
    await go(page, p);
    if (p === 'recommend') await page.getByRole('button', { name: 'Get recommendation' }).click();
    const w = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    expect(w, p).toBeLessThanOrEqual(390);
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('map jumps instantly and nothing animates transforms', async ({ page }) => {
    await openApp(page); await asOwner(page);
    await page.evaluate(() => document.getElementById('map-card')!.scrollIntoView({ behavior: 'instant' as ScrollBehavior }));
    const r = await page.evaluate(() => {
      const w = window as any; w.mapRegion('kzn');
      const target = w.clampCam(w.regionCam('kzn'));
      return { anim: w.MAP.anim, s: w.MAP.cam.s, ts: target.s, mode: w.MAP.mode };
    });
    expect(r.anim).toBeNull();
    expect(r.s).toBeCloseTo(r.ts, 5);
    await go(page, 'recommend');
    await page.getByRole('button', { name: 'Get recommendation' }).click();
    await page.evaluate(() => (window as any).openSheet('more-sheet'));
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => {
      const kf = (a.effect as KeyframeEffect).getKeyframes();
      return kf.some((k) => 'transform' in k || 'translate' in k || 'scale' in k);
    }).map((a) => (a as any).animationName || (a as any).transitionProperty));
    expect(moving).toEqual([]);
  });
});

test('size budget', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'once');
  const rep = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../dist/build-report.json'), 'utf8'));
  console.log(`HTML ${(rep.htmlBytes / 1048576).toFixed(2)} MB, map imagery ${(rep.mapImageryRawBytes / 1048576).toFixed(2)} MB raw`);
  expect(rep.htmlBytes).toBeLessThanOrEqual(4 * 1024 * 1024);
  expect(rep.mapImageryRawBytes).toBeLessThanOrEqual(2.5 * 1024 * 1024);
  const html = fs.readFileSync(path.resolve(__dirname, '../dist/FlyGuide_v20.html'), 'utf8');
  // only the allowed external hosts appear as script/style/link sources
  const ext = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1]).host);
  for (const h of ext) expect(['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cloudless.eox.at']).toContain(h);
  expect(html).not.toMatch(/<form/i);
});
