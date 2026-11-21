import { test, expect, openApp, asGuest, asOwner, scrollToMap, waitFlight, shotPath, REGIONS } from './helpers';

const inside = (r: any, s: any, tol = 0.5) => r.left >= s.left - tol && r.right <= s.right + tol && r.top >= s.top - tol && r.bottom <= s.bottom + tol;

test('country view fits South Africa with no clipped region labels', async ({ page }) => {
  await openApp(page); await asGuest(page); await scrollToMap(page);
  const res = await page.evaluate(() => {
    const st = document.getElementById('map-stage')!.getBoundingClientRect();
    const labels = [...document.querySelectorAll('.mk-region .mk-text')].map((e) => e.getBoundingClientRect().toJSON());
    const M = (window as any).MAP;
    const a = (window as any).proj([16.45, -22.1]), b = (window as any).proj([32.9, -34.85]);
    const toScreen = (p: number[]) => [(p[0] - M.cam.x) * M.cam.s + M.W / 2, (p[1] - M.cam.y) * M.cam.s + M.H / 2];
    return { st: st.toJSON(), labels, a: toScreen(a), b: toScreen(b), W: M.W, H: M.H };
  });
  for (const l of res.labels) expect(inside(l, res.st), JSON.stringify(l)).toBe(true);
  // South Africa's extremes are on screen
  for (const p of [res.a, res.b]) { expect(p[0]).toBeGreaterThanOrEqual(0); expect(p[0]).toBeLessThanOrEqual(res.W); expect(p[1]).toBeGreaterThanOrEqual(0); expect(p[1]).toBeLessThanOrEqual(res.H); }
  // labels do not overlap each other
  for (let i = 0; i < res.labels.length; i++) for (let j = i + 1; j < res.labels.length; j++) {
    const A = res.labels[i], B = res.labels[j];
    const overlap = A.left < B.right && B.left < A.right && A.top < B.bottom && B.top < A.bottom;
    expect(overlap, `labels ${i} and ${j} overlap`).toBe(false);
  }
});

test('each region flies in with sharp detail imagery', async ({ page }, info) => {
  await openApp(page); await asOwner(page); await scrollToMap(page);
  for (const k of REGIONS) {
    await page.locator(`.mk[data-r="${k}"] .mk-btn`).click();
    await waitFlight(page);
    await page.waitForFunction((k) => {
      const img = document.querySelector(`.map-img[data-id="${k}-detail"]`) as HTMLImageElement;
      return img && img.classList.contains('on') && getComputedStyle(img).opacity === '1';
    }, k);
    const d = await page.evaluate((k) => {
      const img = document.querySelector(`.map-img[data-id="${k}-detail"]`) as HTMLImageElement;
      const r = img.getBoundingClientRect();
      return { mode: (window as any).MAP.mode, density: img.naturalWidth / r.width, region: (window as any).currentRegion };
    }, k);
    expect(d.mode).toBe(k);
    expect(d.density, 'image pixels per CSS pixel').toBeGreaterThanOrEqual(1);
    expect(d.region).toBe(k); // owner: app region switches after landing
    await expect(page.locator(`.mk[data-k="venue-${k}"]`)).toHaveCount(4);
    await page.locator('#map-card').screenshot({ path: info.outputPath(`map-region-${k}.jpg`), type: 'jpeg', quality: 80 });
    await page.keyboard.press('Escape');
    await waitFlight(page);
    expect(await page.evaluate(() => (window as any).MAP.mode)).toBe('country');
  }
});

test('pin opens detail and Fish here sets the venue', async ({ page }) => {
  await openApp(page); await asOwner(page); await scrollToMap(page);
  await page.locator('.mk[data-r="kzn"] .mk-btn').click();
  await waitFlight(page);
  await page.locator('.mk[data-i="Vkzn1"] .v-btn').click();
  await expect(page.locator('#map-side .venue-detail')).toContainText('Mooi River');
  await page.locator('#map-side .venue-detail').getByRole('button', { name: 'Fish here' }).click();
  await expect(page.locator('#panel-recommend')).toBeVisible();
  await expect(page.locator('#venue')).toHaveValue('mooi');
  await expect(page.locator('#toast')).toHaveText('Venue set to Mooi River');
});

test('guest sees the Pro lock on a Pro region and Fish here opens the plan screen', async ({ page }) => {
  await openApp(page); await asGuest(page); await scrollToMap(page);
  await expect(page.locator('.mk[data-r="cape"] .mk-lock')).toHaveCount(1);
  await page.locator('.mk[data-r="cape"] .mk-btn').click();
  await waitFlight(page);
  await expect(page.locator('#map-side .lock-banner')).toContainText('Cape Streams is part of FlyGuide Pro');
  expect(await page.evaluate(() => (window as any).currentRegion)).toBe('dullstroom');
  await page.locator('.mk[data-i="Vcape0"] .v-btn').click();
  await page.locator('#map-side .venue-detail').getByRole('button', { name: 'Fish here' }).click();
  await expect(page.locator('#plan-screen')).toBeVisible();
});

test('keyboard focus never scrolls the clipped stage or clips the breadcrumb', async ({ page }) => {
  await openApp(page); await asOwner(page); await scrollToMap(page);
  for (const mode of ['country', 'ec']) {
    if (mode !== 'country') { await page.evaluate((k) => (window as any).mapRegion(k), mode); await waitFlight(page); }
    await page.locator('#crumb-home').focus();
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const st = document.getElementById('map-stage')!, c = document.getElementById('crumb')!.getBoundingClientRect(), s = st.getBoundingClientRect();
        return { sl: st.scrollLeft, stp: st.scrollTop, inside: c.left >= s.left && c.top >= s.top && c.right <= s.right };
      });
      expect(r.sl).toBe(0); expect(r.stp).toBe(0); expect(r.inside).toBe(true);
    }
  }
});

test('Ctrl + wheel zooms about the cursor, plain wheel does not', async ({ page, isMobile }, info) => {
  test.skip(info.project.name !== 'desktop', 'mouse wheel on desktop');
  await openApp(page); await asGuest(page); await scrollToMap(page);
  const box = (await page.locator('#map-stage').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const s0 = await page.evaluate(() => (window as any).MAP.cam.s);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).MAP.cam.s)).toBeCloseTo(s0, 5);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).MAP.cam.s)).toBeGreaterThan(s0 * 1.5);
});

test('two finger pinch zooms (emulated touch)', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch emulation on the phone project');
  await openApp(page); await asGuest(page); await scrollToMap(page);
  const box = (await page.locator('#map-stage').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const s0 = await page.evaluate(() => (window as any).MAP.cam.s);
  const cdp = await page.context().newCDPSession(page);
  const pts = (d: number) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(30) });
  for (let d = 34; d <= 110; d += 4) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).MAP.cam.s)).toBeGreaterThan(s0 * 2);
});

test('double click zooms and Escape returns to the country view', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'mouse');
  await openApp(page); await asGuest(page); await scrollToMap(page);
  await page.locator('.mk[data-r="dullstroom"] .mk-btn').click();
  await waitFlight(page);
  await page.keyboard.press('Escape');
  await waitFlight(page);
  expect(await page.evaluate(() => (window as any).MAP.mode)).toBe('country');
  const box = (await page.locator('#map-stage').boundingBox())!;
  const s0 = await page.evaluate(() => (window as any).MAP.cam.s);
  await page.mouse.dblclick(box.x + 80, box.y + box.height - 160);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).MAP.cam.s)).toBeCloseTo(s0 * 1.8, 3);
});
