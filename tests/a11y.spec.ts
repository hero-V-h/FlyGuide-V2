import { test, expect, openApp, asGuest, asOwner, go } from './helpers';

test('ARIA state follows the visual state', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#auth-tab-login')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#auth-tab-signup').click();
  await expect(page.locator('#auth-tab-signup')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#auth-tab-login')).toHaveAttribute('aria-selected', 'false');
  await page.locator('#auth-tab-login').click();
  await asGuest(page);
  await go(page, 'recommend');
  await page.locator('#pressureRow .press-btn', { hasText: 'Falling' }).click();
  await expect(page.locator('#pressureRow .press-btn', { hasText: 'Falling' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#pressureRow .press-btn', { hasText: 'Rising' })).toHaveAttribute('aria-checked', 'false');
  await go(page, 'flybox');
  await page.getByRole('button', { name: 'Nymph', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nymph', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('rating stars are a keyboard radio group', async ({ page }) => {
  await openApp(page); await asOwner(page);
  await go(page, 'log');
  await page.locator('#star-row .star').first().focus();
  await page.keyboard.press('Space');                 // selects 1 star
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');   // moves to 3
  await expect(page.locator('#star-row .star').nth(2)).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#star-row .star.lit')).toHaveCount(3);
  await expect(page.locator('#star-label')).toHaveText('Good');
  await expect(page.locator('#star-row .star').nth(2)).toBeFocused();
});

test('password show and hide', async ({ page }) => {
  await openApp(page);
  await page.locator('#login-password').fill('trout123');
  const t = page.locator('#auth-form-login .pw-toggle');
  await t.click();
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
  await expect(t).toHaveAttribute('aria-pressed', 'true');
  await t.click();
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'password');
});

test('focus stays inside an open sheet and moves to the new view heading', async ({ page }) => {
  await openApp(page); await asGuest(page);
  await page.evaluate(() => (window as any).openMoreSheet());
  await page.waitForTimeout(150);
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('more-sheet')!.contains(document.activeElement))).toBe(true);
  }
  await page.locator('#more-sheet .more-item', { hasText: 'Hatch calendar' }).click();
  await expect(page.locator('#ha-h')).toBeFocused();
});

for (const scheme of ['light', 'dark'] as const) test.describe(scheme + ' theme', () => {
test.use({ colorScheme: scheme });
test('text contrast passes AA on every panel', async ({ page }) => {
  await openApp(page); await asOwner(page);
  for (const p of ['explore', 'recommend', 'flybox', 'knowledge', 'hatch', 'rig', 'tippet', 'log', 'stats', 'chat']) {
    await go(page, p);
    const fails = await page.evaluate(() => {
      const parse = (c: string) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const L = (c: any) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const out: string[] = [];
      document.querySelectorAll('#main *').forEach((el) => {
        if (!(el as HTMLElement).offsetParent || el.closest('.map-stage,.hero,[aria-hidden="true"]')) return;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) return;
        const s = getComputedStyle(el); let fg = parse(s.color)!; let e: Element | null = el, bg: any = null;
        while (e) { const st = getComputedStyle(e); if (st.backgroundImage !== 'none' && !st.backgroundImage.includes('svg')) return; const c = parse(st.backgroundColor); if (c && c.a >= 1) { bg = c; break; } e = e.parentElement; }
        bg = bg || { r: 245, g: 243, b: 238 };
        if (fg.a < 1) fg = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
        const cr = (Math.max(L(fg), L(bg)) + 0.05) / (Math.min(L(fg), L(bg)) + 0.05);
        const fs = parseFloat(s.fontSize), large = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 600);
        if (cr < (large ? 3 : 4.5)) out.push(cr.toFixed(2) + ' ' + el.className + ' ' + el.textContent!.trim().slice(0, 30));
      });
      return out;
    });
    expect(fails, p).toEqual([]);
  }
});
});

test('theme button switches light and dark and remembers the choice', async ({ page }) => {
  await openApp(page); await asGuest(page);
  const btn = page.locator('#theme-btn');
  await expect(btn).toBeVisible();
  const before = await page.evaluate(() => (window as any).currentTheme());
  await btn.click();
  const after = await page.evaluate(() => (window as any).currentTheme());
  expect(after).not.toBe(before);
  await expect(page.locator('html')).toHaveAttribute('data-theme', after);
  await expect(btn).toHaveAttribute('aria-label', after === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe(after === 'dark' ? 'rgb(18, 19, 16)' : 'rgb(234, 229, 218)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', after);
});
