import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
  stubEmptyFormsCatalog,
  stubEmptyPatients,
} from './fixtures/capabilities.ts';
import { test } from './fixtures/test';

async function mockCapabilities(
  page: Page,
  grants: { codes: string[] },
): Promise<void> {
  await page.route('**/api/me/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.api+json',
      body: JSON.stringify({
        actorId: 'designer-user',
        capabilities: grants.codes,
      }),
    });
  });
}

async function refetchCapabilitiesOnFocus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const browserWindow = globalThis as unknown as {
      dispatchEvent: (event: unknown) => boolean;
      Event: new (type: string) => unknown;
    };
    browserWindow.dispatchEvent(new browserWindow.Event('visibilitychange'));
  });
}

function patientSearchForm(page: Page) {
  return page.getByRole('search', { name: 'Find a patient' });
}

/** The "Register patient" action in the page header (desktop nav action). */
function headerRegisterAction(page: Page) {
  return page
    .locator('header')
    .getByRole('button', { name: 'Register patient' });
}

/** The floating mobile-only "Register patient" action. */
function mobileRegisterAction(page: Page) {
  return page.getByLabel('Register patient');
}

test.describe('capability-aware navigation and clinical actions (CYN-54)', () => {
  test('denies direct navigation without the required capability', async ({
    page,
  }) => {
    grantCapabilities(page, []);
    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Access denied', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('hides the Patients nav entry without patients.read', async ({
    page,
  }) => {
    grantCapabilities(page, ['catalog.read']);
    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Access denied', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    const sidebar = page.getByRole('navigation', {
      name: 'Primary navigation',
    });
    await expect(sidebar.getByRole('link', { name: 'Forms' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Patients' })).toHaveCount(
      0,
    );
  });

  test('shows the register action when patients.write is granted', async ({
    page,
  }) => {
    grantCapabilities(page, ['patients.read', 'patients.write']);
    stubEmptyPatients(page);
    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    await expect(patientSearchForm(page)).toBeVisible({
      timeout: 30_000,
    });
    await expect(headerRegisterAction(page)).toBeVisible();
    await expect(mobileRegisterAction(page)).toBeHidden();
  });

  test('hides the register action without patients.write', async ({ page }) => {
    grantCapabilities(page, ['patients.read']);
    stubEmptyPatients(page);
    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    await expect(patientSearchForm(page)).toBeVisible({
      timeout: 30_000,
    });
    await expect(headerRegisterAction(page)).toHaveCount(0);
    await expect(mobileRegisterAction(page)).toHaveCount(0);
  });

  test('hides the create-form card without catalog.write', async ({ page }) => {
    grantCapabilities(page, ['catalog.read']);
    stubEmptyFormsCatalog(page);
    await page.goto('/en/forms/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('New draft')).toHaveCount(0);
  });

  test('redirects the legacy /forms path into the locale tree', async ({
    page,
  }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    stubEmptyFormsCatalog(page);
    await page.goto('/forms', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/forms\/?(\?.*)?$/);
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('re-evaluates action controls after a capability is revoked', async ({
    page,
  }) => {
    const grants = { codes: ['patients.read', 'patients.write'] };
    await mockCapabilities(page, grants);
    stubEmptyPatients(page);
    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    await expect(patientSearchForm(page)).toBeVisible({
      timeout: 30_000,
    });
    await expect(headerRegisterAction(page)).toBeVisible();

    grants.codes = ['patients.read'];
    await refetchCapabilitiesOnFocus(page);

    await expect(headerRegisterAction(page)).toHaveCount(0, {
      timeout: 30_000,
    });
  });

  test('denies a route again once access is revoked', async ({ page }) => {
    const grants = { codes: ['patients.read'] };
    await mockCapabilities(page, grants);
    stubEmptyPatients(page);
    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    await expect(patientSearchForm(page)).toBeVisible({
      timeout: 30_000,
    });

    grants.codes = [];
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Access denied', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });
});
