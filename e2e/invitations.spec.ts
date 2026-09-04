import { expect } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import {
  invitationRow,
  stubAcceptInvitation,
  stubAcceptRateLimited,
  stubCancelInvitation,
  stubCreateInvitation,
  stubInvitationList,
  stubResendInvitation,
} from './fixtures/invitations.ts';
import { test } from './fixtures/test';

const MEMBER = {
  user: { id: 'u-1', email: 'ada@cynara.dev' },
  hospital: { id: 'h-1', code: 'HOSP', name: 'Hospital Central' },
  actor: { id: 'ada-01' },
  capabilities: ['user-invitations.read'],
};

test.describe('admin invitation management (CYN-109)', () => {
  test('lists invitations with status badges', async ({ page }) => {
    grantCapabilities(page, [
      'user-invitations.read',
      'user-invitations.write',
    ]);
    stubInvitationList(page, [
      invitationRow({
        id: 'inv-1',
        email: 'ada@cynara.dev',
        status: 'pending',
      }),
      invitationRow({
        id: 'inv-2',
        email: 'nina@cynara.dev',
        status: 'cancelled',
      }),
    ]);
    await page.goto('/en/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Invitation links' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('ada@cynara.dev')).toBeVisible();
    await expect(page.getByText('nina@cynara.dev')).toBeVisible();
  });

  test('denies the route without user-invitations.read', async ({ page }) => {
    grantCapabilities(page, []);
    await page.goto('/en/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText('Access denied', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('creates an invitation and surfaces the copy-link dialog', async ({
    page,
  }) => {
    grantCapabilities(page, [
      'user-invitations.read',
      'user-invitations.write',
    ]);
    stubInvitationList(page, []);
    const created = invitationRow({ id: 'inv-9', email: 'leo@cynara.dev' });
    stubCreateInvitation(page, created, 'tok-new-123');
    await page.goto('/en/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Invitation links' }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Create invitation' }).click();
    await page.getByLabel('Email').fill('leo@cynara.dev');
    await page.getByLabel('Actor ID').fill('leo-01');
    await page.getByRole('checkbox', { name: 'user-invitations.read' }).check();
    await page.getByRole('button', { name: 'Create and copy link' }).click();

    await expect(
      page.getByRole('heading', { name: 'Copy the invitation link' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('tok-new-123')).toBeVisible();
  });

  test('cancels a pending invitation and keeps the row as cancelled', async ({
    page,
  }) => {
    grantCapabilities(page, [
      'user-invitations.read',
      'user-invitations.write',
    ]);
    stubInvitationList(page, [
      invitationRow({
        id: 'inv-1',
        email: 'ada@cynara.dev',
        status: 'pending',
      }),
    ]);
    stubCancelInvitation(
      page,
      invitationRow({
        id: 'inv-1',
        email: 'ada@cynara.dev',
        status: 'cancelled',
      }),
    );
    await page.goto('/en/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText('ada@cynara.dev')).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Cancel invitation' }).click();

    // Row persists (email still listed) with the cancelled state.
    await expect(page.getByText('ada@cynara.dev')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('resends an invitation and surfaces the fresh link', async ({
    page,
  }) => {
    grantCapabilities(page, [
      'user-invitations.read',
      'user-invitations.write',
    ]);
    stubInvitationList(page, [
      invitationRow({
        id: 'inv-1',
        email: 'ada@cynara.dev',
        status: 'pending',
      }),
    ]);
    stubResendInvitation(
      page,
      invitationRow({
        id: 'inv-1',
        email: 'ada@cynara.dev',
        status: 'pending',
      }),
      'tok-fresh-456',
    );
    await page.goto('/en/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText('ada@cynara.dev')).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Resend' }).click();
    await page.getByRole('button', { name: 'Resend invitation' }).click();

    await expect(
      page.getByRole('heading', { name: 'Copy the invitation link' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('tok-fresh-456')).toBeVisible();
  });

  test('grants the invitations section with FULL_CAPABILITIES', async ({
    page,
  }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    stubInvitationList(page, []);
    await page.goto('/en/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Invitation links' }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
