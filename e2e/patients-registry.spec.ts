import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import { createPatientViaApi, uniqueMrn } from './fixtures/patients.ts';

async function openPatientList(page: Page): Promise<void> {
  await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('search', { name: 'Find a patient' }),
  ).toBeVisible({
    timeout: 30_000,
  });
}

async function pickBirthDate(page: Page, isoDate: string): Promise<void> {
  const [year, month] = isoDate.split('-');
  await page.getByLabel('Date of birth').click();
  const popover = page.locator('[data-slot=popover-content]');
  await expect(popover).toBeVisible();

  const selects = popover.locator('select');
  const selectCount = await selects.count();
  if (selectCount >= 2) {
    const monthSelect = selects.nth(0);
    const yearSelect = selects.nth(selectCount - 1);
    await yearSelect.selectOption(year);
    await monthSelect.selectOption({ index: Number(month) - 1 });
  }

  await popover.locator(`[data-day="${isoDate}"] button`).click();
}

async function registerPatientInUi(
  page: Page,
  input: {
    mrn: string;
    givenName: string;
    familyName: string;
    birthDate: string;
    nationalId?: string;
  },
): Promise<void> {
  await page.goto('/en/patients/register/', {
    waitUntil: 'networkidle',
  });
  await expect(
    page.getByRole('form', { name: 'Register a patient' }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole('button', { name: 'Register patient' }),
  ).toBeEnabled();

  await page.getByLabel('Medical record number (MRN)').fill(input.mrn);
  await page
    .getByLabel('National ID')
    .fill(input.nationalId ?? `NID-${input.mrn}`);
  await page.getByLabel('First name').fill(input.givenName);
  await page.getByLabel('Last name').fill(input.familyName);
  await pickBirthDate(page, input.birthDate);

  const sexTrigger = page.getByLabel('Sex');
  await sexTrigger.click();
  await page
    .locator('[data-slot=select-item]')
    .filter({ hasText: 'Female' })
    .click();
  await expect(sexTrigger).toContainText('Female');

  await page.getByRole('button', { name: 'Register patient' }).click();
}

test.describe('patient registration and search (CYN-50)', () => {
  test.beforeEach(async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
  });

  test('registers, searches by MRN, and opens patient detail', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const mrn = uniqueMrn('UI');
    await registerPatientInUi(page, {
      mrn,
      givenName: 'Ada',
      familyName: 'Lovelace',
      birthDate: '1990-01-01',
    });

    await expect(
      page.getByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('code').filter({ hasText: mrn }).first(),
    ).toHaveText(mrn);
    await expect(
      page.getByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeVisible();

    await openPatientList(page);
    await page.getByLabel('MRN').fill(mrn);
    await page
      .getByRole('search', { name: 'Find a patient' })
      .getByRole('button', { name: 'Search' })
      .click();

    const row = page.locator('[data-patient-id]').filter({ hasText: mrn });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole('button', { name: 'Open clinical record' }).click();
    await expect(
      page.getByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeVisible();
    await expect(
      page.getByRole('code').filter({ hasText: mrn }).first(),
    ).toHaveText(mrn);
    const seeded = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('API'),
    });
    expect(seeded.id).toBeTruthy();
  });

  test('maps duplicate MRN conflicts to the MRN field', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const mrn = uniqueMrn('DUP');
    await createPatientViaApi(request, baseURL, {
      mrn,
      givenName: 'Alan',
      familyName: 'Turing',
    });

    await registerPatientInUi(page, {
      mrn,
      givenName: 'Grace',
      familyName: 'Hopper',
      birthDate: '1985-06-15',
    });

    await expect(
      page.getByRole('alert').filter({ hasText: /already exists|MRN/i }),
    ).toContainText(/already exists|MRN/i, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/patients\/register\/?/);
  });

  test('shows client validation before calling the API', async ({ page }) => {
    await page.goto('/en/patients/register/', {
      waitUntil: 'networkidle',
    });
    await expect(
      page.getByRole('form', { name: 'Register a patient' }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('button', { name: 'Register patient' }),
    ).toBeEnabled();

    await page.getByRole('button', { name: 'Register patient' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'MRN is required.' }),
    ).toHaveText('MRN is required.');
    await expect(
      page.getByRole('alert').filter({ hasText: 'National ID is required.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'First name is required.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Last name is required.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Date of birth is required.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Sex is required.' }),
    ).toBeVisible();
  });

  test('edits mutable demographics with immutable MRN', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const created = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('EDIT'),
      givenName: 'Katherine',
      familyName: 'Johnson',
    });

    await page.goto(`/en/patients/${created.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Katherine Johnson' }),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(
      page.getByRole('form', { name: 'Edit patient' }),
    ).toBeVisible();
    await expect(page.getByLabel('Medical record number')).toBeDisabled();

    await page.getByLabel('First name').fill('Kate');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(
      page.getByRole('heading', { name: 'Kate Johnson' }),
    ).toBeVisible({
      timeout: 20_000,
    });
  });

  test('keeps the chart tab in the URL across reloads', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const created = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('TAB'),
    });

    await page.goto(`/en/patients/${created.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/[?&]tab=overview/);

    await page.getByRole('tab', { name: 'Documents' }).click();
    await expect(page).toHaveURL(/[?&]tab=documents/);
    await expect(page.getByText('Document history')).toBeVisible({
      timeout: 20_000,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/[?&]tab=documents/);
    await expect(page.getByText('Document history')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('paginates search results from the API', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const stamp = Date.now().toString();
    for (let index = 0; index < 21; index += 1) {
      await createPatientViaApi(request, baseURL, {
        mrn: `PAGE-${stamp}-${String(index).padStart(2, '0')}`,
        givenName: `Page${String(index)}`,
        familyName: `Batch${stamp}`,
        nationalId: `NID-PAGE-${stamp}-${String(index)}`,
      });
    }

    await openPatientList(page);
    await expect(
      page.getByRole('navigation', { name: 'pagination' }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-patient-id]')).toHaveCount(20);

    const firstPageMrn = await page
      .locator('[data-patient-id]')
      .first()
      .locator('code')
      .innerText();
    const range = page.getByText(/Showing/);
    await expect(range).toContainText('Showing 1–20 of');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled({
      timeout: 20_000,
    });
    await expect(range).toContainText('Showing 21–');
    await expect(
      page.locator('[data-patient-id]').first().locator('code'),
    ).not.toHaveText(firstPageMrn);
  });
});
