import fs from 'node:fs';
import { test, expect, DIST, blockNetwork } from './helpers';

// The claude.ai artifact preview: srcdoc iframe, allow-scripts only (no forms, no same origin).
// Storage throws there, so the in-memory shim carries accounts for the visit.
test('auth, plan, log and chat work inside a sandboxed srcdoc iframe', async ({ page }) => {
  await blockNetwork(page);
  const html = fs.readFileSync(DIST, 'utf8');
  await page.setContent('<!doctype html><html><body style="margin:0"><iframe id="f" sandbox="allow-scripts" style="border:0;width:100vw;height:100vh"></iframe></body></html>');
  await page.evaluate((h) => { (document.getElementById('f') as HTMLIFrameElement).srcdoc = h; }, html);
  await page.waitForFunction(() => {
    const f = document.getElementById('f') as HTMLIFrameElement;
    return f.contentWindow && f.contentWindow.frames !== undefined;
  });
  const frameEl = page.frameLocator('#f');
  await expect(frameEl.locator('#auth-overlay')).toBeVisible();
  const frame = page.frames().find((fr) => fr !== page.mainFrame())!;

  // Storage is blocked in this sandbox, so the shim must be in use
  expect(await frame.evaluate(() => { try { return typeof localStorage.getItem('x'); } catch (e) { return 'threw'; } })).toBe('object');

  // Create account → plan screen shows once
  await frameEl.locator('#auth-tab-signup').click();
  await frameEl.locator('#signup-name').fill('Lerato Dube');
  await frameEl.locator('#signup-email').fill('lerato@example.co.za');
  await frameEl.locator('#signup-password').fill('trout123');
  await frameEl.getByRole('button', { name: 'Create my account' }).click();
  await expect(frameEl.locator('#auth-overlay')).toBeHidden();
  await expect(frameEl.locator('#plan-screen')).toBeVisible();

  // Start trial → Pro
  await frameEl.locator('#plan-confirm-btn').click();
  await expect(frameEl.locator('#plan-screen')).toBeHidden();
  expect(await frame.evaluate(() => (window as any).isProUser())).toBe(true);

  // Catch log save responds
  await frame.evaluate(() => (window as any).go('log'));
  await frameEl.locator('#log-flies').fill('DDD #14');
  await frameEl.getByRole('button', { name: 'Save session' }).click();
  await expect(frameEl.locator('#entries-list .log-entry')).toHaveCount(1);

  // Chat send responds (no API key configured: setup message)
  await frame.evaluate(() => (window as any).go('chat'));
  await frameEl.locator('#chat-input').fill('Which fly for the Mooi in April?');
  await frameEl.locator('#chat-send-btn').click();
  await expect(frameEl.locator('#chat-messages .assistant-bubble')).toHaveCount(2);
  await frameEl.locator('#chat-input').fill('And in May?');
  await frameEl.locator('#chat-input').press('Enter');
  await expect(frameEl.locator('#chat-messages .assistant-bubble')).toHaveCount(3);

  // Sign out → Sign in tab, plan screen hidden, password cleared, email prefilled
  await frame.evaluate(() => (window as any).go('explore'));
  await frameEl.locator('#account-avatar').click();
  await frameEl.getByRole('button', { name: 'Sign out' }).click();
  await frameEl.locator('#confirm-ok').click();
  await expect(frameEl.locator('#auth-overlay')).toBeVisible();
  await expect(frameEl.locator('#plan-screen')).toBeHidden();
  await expect(frameEl.locator('#auth-tab-login')).toHaveClass(/active/);
  await expect(frameEl.locator('#auth-form-login')).toBeVisible();
  await expect(frameEl.locator('#login-password')).toHaveValue('');
  await expect(frameEl.locator('#login-email')).toHaveValue('lerato@example.co.za');

  // Wrong password
  await frameEl.locator('#login-password').fill('wrong-one');
  await frameEl.locator('#auth-form-login .auth-btn').click();
  await expect(frameEl.locator('#auth-error')).toHaveText('Incorrect password. Please try again.');

  // Sign in again: no plan screen
  await frameEl.locator('#login-password').fill('trout123');
  await frameEl.locator('#auth-form-login .auth-btn').click();
  await expect(frameEl.locator('#auth-overlay')).toBeHidden();
  await expect(frameEl.locator('#plan-screen')).toBeHidden();

  // Guest → avatar opens sign in → Enter key signs in
  await frameEl.locator('#account-avatar').click();
  await frameEl.getByRole('button', { name: 'Sign out' }).click();
  await frameEl.locator('#confirm-ok').click();
  await frameEl.getByRole('button', { name: 'Continue without an account (Dullstroom only)' }).click();
  await expect(frameEl.locator('#auth-overlay')).toBeHidden();
  await expect(frameEl.locator('#account-avatar')).toHaveText('?');
  await frameEl.locator('#account-avatar').click();
  await expect(frameEl.locator('#auth-overlay')).toBeVisible();
  await expect(frameEl.locator('#auth-form-login')).toBeVisible();
  await frameEl.locator('#login-email').fill('lerato@example.co.za');
  await frameEl.locator('#login-password').fill('trout123');
  await frameEl.locator('#login-password').press('Enter');
  await expect(frameEl.locator('#auth-overlay')).toBeHidden();
  await expect(frameEl.locator('#account-avatar')).toHaveText('L');
  await expect(frameEl.locator('#plan-screen')).toBeHidden();
});
