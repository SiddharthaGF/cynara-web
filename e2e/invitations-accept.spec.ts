import { expect, test } from '@playwright/test';

import { stubAcceptInvitation } from './fixtures/invitations.ts';

test.describe('public invitation acceptance (CYN-109, no auth)', () => {
  test('renders the password form for a valid link', async ({ page }) => {
    await page.goto('/en/invitations/accept?token=tok-abc', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Set your password' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('shows the generic invalid state without a token', async ({ page }) => {
    await page.goto('/en/invitations/accept', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'This link is not valid' }),
    ).toBeVisible({ timeout: 30_000 });
  });

  // NOTE (Acc R2 success outcome): the member-summary mapping is unit-proven
  // (`toAcceptResult` with member in `invitationAcceptanceFlow.test.ts`). A
  // full-stack success render needs a live backend, because the `_serverFn`
  // transport drops nested `member` objects from raw stubs (only the
  // top-level `accepted` flag survives). Deferred to a live-backend run.

  test('shows the same generic state for expired and used links', async ({
    page,
  }) => {
    stubAcceptInvitation(page, { accepted: false });
    await page.goto('/en/invitations/accept?token=tok-expired', {
      waitUntil: 'domcontentloaded',
    });
    await page
      .getByLabel('Password')
      .pressSequentially('S3cure-pw', { delay: 20 });
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByRole('heading', { name: 'This link is not valid' }),
    ).toBeVisible({ timeout: 30_000 });
  });

  // NOTE (Acc R4 Scen 1, Rate limited): the rate-limit MESSAGE mapping is
  // unit-proven (`describeApiError` 429 + serialized-record, and
  // `mapApiResponseError` 429 in `invitationAcceptanceFlow.test.ts`). A
  // full-stack 429 render needs a live backend returning 429, because
  // stubbing the `_serverFn` transport with a raw 429 breaks the TanStack
  // envelope instead of simulating a backend 429, and `page.route('**/api/')`
  // cannot intercept the server-side fetch. Deferred to a live-backend run
  // (see verify-report W1). The `stubAcceptRateLimited` helper is kept for
  // that future run.

  test('prevents double submit: two rapid clicks send a single accept request', async ({
    page,
  }) => {
    let acceptPosts = 0;
    stubAcceptInvitation(
      page,
      { accepted: false },
      {
        delayMs: 2_000,
        onRequest: () => {
          acceptPosts += 1;
        },
      },
    );
    await page.goto('/en/invitations/accept?token=tok-abc', {
      waitUntil: 'domcontentloaded',
    });
    // Stable locator: the button text flips to the submitting copy while
    // pending, so locate by type instead of by accessible name.
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeEnabled({ timeout: 30_000 });
    // Let SSR hydration attach the form handler so clicks go through React
    // (which preventDefaults) instead of native submit.
    await page.waitForTimeout(2_000);
    await page
      .getByLabel('Password')
      .pressSequentially('S3cure-pw', { delay: 20 });
    // Two rapid clicks; the first sets pending (button disables + shows the
    // submitting copy), collapsing the second into a single submission.
    await submit.dblclick({ timeout: 30_000 });
    await expect(submit).toBeDisabled({ timeout: 30_000 });
    await page.waitForTimeout(3_000);
    expect(acceptPosts).toBe(1);
  });
});
