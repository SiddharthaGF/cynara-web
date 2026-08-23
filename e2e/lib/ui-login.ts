import type { Page } from '@playwright/test';

const EMAIL = process.env.E2E_USER_EMAIL ?? 'doctor@cynara.dev';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Cynara!Dev123';

/**
 * Signs in through the real CYN-96 route: start form -> identity provider
 * authorize round trip -> credential handoff form -> code callback exchange.
 *
 * The first button click depends on React hydration; clicking too early
 * triggers a native GET submit back to /en/login?, which the bounded retry
 * below tolerates.
 */
export async function performUiLogin(page: Page): Promise<void> {
  await page.goto('/en/login');
  await page.waitForLoadState('networkidle');

  let reachedHandoff = false;
  for (let attempt = 0; attempt < 3 && !reachedHandoff; attempt += 1) {
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForURL(
        (url) =>
          url.searchParams.has('client_id') &&
          url.searchParams.has('request_uri'),
        { timeout: 12_000 },
      );
      reachedHandoff = true;
    } catch {
      const current = new URL(page.url());
      // A premature native submit lands on the plain login page again;
      // anything else is a real failure.
      if (current.pathname !== '/en/login' || current.search !== '') {
        throw new Error(`unexpected login redirect: ${page.url()}`);
      }
    }
  }
  if (!reachedHandoff) {
    throw new Error('never reached the authorization handoff form');
  }

  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/en', {
    timeout: 30_000,
  });
}
