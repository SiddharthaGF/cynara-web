import { expect, test as base } from '@playwright/test';

import { AUTH_STATE_PATH } from '../lib/auth';
import { performUiLogin } from '../lib/ui-login';

export const test = base.extend({});

export { expect };

/**
 * The sealed auth session stores a ROTATING refresh token: every proxied API
 * call redeems it and re-seals the cookie, and OpenIddict rejects tokens that
 * were redeemed before. Per-test contexts restored from a shared storage
 * state therefore start from a snapshot that may already be one generation
 * behind.
 *
 * Recovery instead of fragility: probe the session through the BFF proxy and,
 * when it is dead, sign in again through the real route inside this very test
 * (a few seconds) instead of letting every assertion drown in redirects.
 */
test.beforeEach(async ({ page }) => {
  const probe = await page.request.get('/api/me/hospitals');
  if (probe.status() === 401) {
    await performUiLogin(page);
    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === 'cynara-auth');
    // Persist immediately so the next test starts warm when possible. A
    // cleared or failed session leaves a short deletion stub; never save it.
    if (session && session.value.length > 64) {
      await page.context().storageState({ path: AUTH_STATE_PATH });
    }
  } else if (probe.status() >= 400) {
    throw new Error(
      `session probe failed (${probe.status()}): ${await probe.text()}`,
    );
  }
});

test.afterEach(async ({ page }) => {
  try {
    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === 'cynara-auth');
    if (session && session.value.length > 64) {
      await page.context().storageState({ path: AUTH_STATE_PATH });
    }
  } catch {
    // Persistence is best-effort; recovery handles dead sessions per test.
  }
});
