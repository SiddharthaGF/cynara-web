import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { AUTH_STATE_PATH } from './lib/auth';
import { performUiLogin } from './lib/ui-login';

/**
 * Signs in through the real login route once per run so the suite starts
 * with a valid sealed `cynara-auth` session cookie (shared storage state).
 */
test('sign in as the seeded demo clinician', async ({ page }) => {
  await performUiLogin(page);

  const cookies = await page.context().cookies();
  expect(
    cookies.some((cookie) => cookie.name === 'cynara-auth'),
    'the sealed auth session cookie must exist after sign-in',
  ).toBe(true);

  mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
