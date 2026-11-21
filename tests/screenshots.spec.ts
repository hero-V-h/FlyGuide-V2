import { test, expect, openApp, asOwner, go, scrollToMap, waitFlight, shotPath, REGIONS } from './helpers';
import type { Page } from '@playwright/test';

// Screenshots of every screen, both sizes, into dist/screenshots.
// Google Fonts and cdnjs are allowed here so the shots show Geist and real charts;
// every other host is blocked like the rest of the suite.
test.use({ deviceScaleFactor: 2 });
test.describe.configure({ mode: 'serial' });

async function shot(page: Page, project: string, name: string, full = false) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: shotPath(project, name), type: 'jpeg', quality: 78, fullPage: full });
}

test('screens', async ({ page }, info) => {
  test.setTimeout(240_000);
  const P = info.project.name;
  await openApp(page, { allow: /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/ });
  await page.evaluate(() => (document as any).fonts.ready);
  await shot(page, P, '01-auth');
  await asOwner(page);
  await page.evaluate(() => { (window as any).print = () => {}; document.getElementById('toast')!.style.visibility = 'hidden'; });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await shot(page, P, '02-explore-home');
  await scrollToMap(page);
  await page.evaluate(() => window.scrollBy({ top: -96, behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(500);
  await shot(page, P, '03-map-country');
  for (const k of REGIONS) {
    await page.locator(`.mk[data-r="${k}"] .mk-btn`).click();
    await waitFlight(page);
    await page.evaluate(() => { document.getElementById('map-card')!.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }); window.scrollBy({ top: -96, behavior: 'instant' as ScrollBehavior }); });
    await shot(page, P, `04-map-region-${k}`);
    if (k === 'cape') {
      await page.locator('.mk[data-i="Vcape0"] .v-btn').click();
      await page.waitForTimeout(250);
      await shot(page, P, '05-map-venue-selected');
      if (P === 'phone') { await page.locator('#map-side .venue-detail').scrollIntoViewIfNeeded(); await shot(page, P, '05b-map-venue-detail-panel'); }
    }
    await page.evaluate(() => (window as any).mapHome());
    await waitFlight(page);
  }
  await page.evaluate(() => (window as any).setRegion('dullstroom', { silent: true }));
  await go(page, 'recommend');
  await page.getByRole('button', { name: 'Get recommendation' }).click();
  await page.waitForTimeout(700);
  if (P === 'desktop') await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await shot(page, P, '06-recommend-results');
  await go(page, 'flybox'); await shot(page, P, '07-fly-box');
  await go(page, 'knowledge');
  await page.locator('.know-nav-btn').nth(1).click();
  const head = page.locator('#know-entomology .know-card-header').first();
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  await page.waitForTimeout(300);
  await shot(page, P, '08-learn-accordion-open');
  await go(page, 'hatch'); await shot(page, P, '09-hatch');
  await go(page, 'rig'); await page.getByRole('button', { name: 'Build my rig' }).click();
  await page.locator('#rig-result').scrollIntoViewIfNeeded(); await shot(page, P, '10-rig-result');
  await go(page, 'tippet'); await page.getByRole('button', { name: 'Calculate tippet' }).click();
  await page.locator('#tippet-result').scrollIntoViewIfNeeded(); await shot(page, P, '11-tippet-result');
  await go(page, 'log'); await shot(page, P, '12-catch-log');
  await go(page, 'stats'); await expect(page.locator('#stats-empty')).toBeVisible(); await shot(page, P, '13-stats-empty');
  await go(page, 'chat'); await shot(page, P, '14-chat');
  await go(page, 'explore');
  await page.evaluate(() => (window as any).openMoreSheet()); await page.waitForTimeout(600); await shot(page, P, '15-more-sheet');
  await page.evaluate(() => (window as any).closeSheets()); await page.waitForTimeout(350);
  await page.locator('#account-avatar').click(); await page.waitForTimeout(600); await shot(page, P, '16-account-sheet');
  await page.evaluate(() => (window as any).closeSheets()); await page.waitForTimeout(350);
  await page.evaluate(() => (window as any).showNotifications()); await page.waitForTimeout(600); await shot(page, P, '17-alerts');
  await page.evaluate(() => (window as any).closeSheets()); await page.waitForTimeout(350);
  await page.evaluate(() => (window as any).showPlanScreen()); await shot(page, P, '18-plan-screen');
  await page.evaluate(() => (window as any).closePlanScreen());
  await page.evaluate(() => (window as any).showLegal('privacy')); await shot(page, P, '19-legal-modal');
});

// Dark theme: the key screens again
test.describe('dark theme', () => {
  test.use({ colorScheme: 'dark' });
  test('screens (dark)', async ({ page }, info) => {
    test.setTimeout(180_000);
    const P = info.project.name + '-dark';
    await openApp(page, { allow: /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/ });
    await page.evaluate(() => (document as any).fonts.ready);
    await shot(page, P, '01-auth');
    await asOwner(page);
    await page.evaluate(() => { document.getElementById('toast')!.style.visibility = 'hidden'; window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); });
    await shot(page, P, '02-explore-home');
    await page.locator('.mk[data-r="kzn"] .mk-btn').click();
    await waitFlight(page);
    await page.locator('.mk[data-i="Vkzn1"] .v-btn').click();
    await page.evaluate(() => { document.getElementById('map-card')!.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }); window.scrollBy({ top: -96, behavior: 'instant' as ScrollBehavior }); });
    await shot(page, P, '04-map-region-kzn');
    await page.evaluate(() => (window as any).mapHome()); await waitFlight(page);
    await page.evaluate(() => (window as any).setRegion('dullstroom', { silent: true }));
    await page.evaluate(() => { document.querySelector('.overview')!.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }); window.scrollBy({ top: -96, behavior: 'instant' as ScrollBehavior }); });
    await shot(page, P, '03-explore-overview');
    await go(page, 'recommend');
    await page.getByRole('button', { name: 'Get recommendation' }).click();
    await page.waitForTimeout(700);
    if (info.project.name === 'desktop') await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
    await shot(page, P, '06-recommend-results');
    await go(page, 'knowledge');
    await page.locator('.know-nav-btn').nth(4).click();
    const head = page.locator('#know-knots .know-card-header').first();
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
    await page.waitForTimeout(300);
    await shot(page, P, '08-learn-knots');
    await go(page, 'log'); await shot(page, P, '12-catch-log');
    await page.evaluate(() => (window as any).showPlanScreen()); await shot(page, P, '18-plan-screen');
  });
});
