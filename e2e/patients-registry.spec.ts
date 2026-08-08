import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import { createPatientViaApi, uniqueMrn } from './fixtures/patients.ts';

async function openPatientList(page: Page): Promise<void> {
  await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('patient-search-form')).toBeVisible({
    timeout: 30_000,
  });
}

async function pickBirthDate(page: Page, isoDate: string): Promise<void> {
  const [year, month] = isoDate.split('-');
  await page.getByTestId('patient-register-birthDate').click();
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
  await expect(page.getByTestId('patient-register-form')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('patient-register-submit')).toBeEnabled();

  await page.getByTestId('patient-register-mrn').fill(input.mrn);
  await page
    .getByTestId('patient-register-nationalId')
    .fill(input.nationalId ?? `NID-${input.mrn}`);
  await page.getByTestId('patient-register-givenName').fill(input.givenName);
  await page.getByTestId('patient-register-familyName').fill(input.familyName);
  await pickBirthDate(page, input.birthDate);

  const sexTrigger = page.getByTestId('patient-register-sex');
  await sexTrigger.click();
  await page
    .locator('[data-slot=select-item]')
    .filter({ hasText: 'Female' })
    .click();
  await expect(sexTrigger).toContainText('Female');

  await page.getByTestId('patient-register-submit').click();
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

    await expect(page.getByTestId('patient-detail-view')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId('patient-detail-view').getByRole('code'),
    ).toHaveText(mrn);
    await expect(
      page.getByTestId('patient-detail-view').getByRole('heading', {
        name: 'Ada Lovelace',
      }),
    ).toBeVisible();

    await openPatientList(page);
    await page.getByTestId('patient-search-mrn').fill(mrn);
    await page.getByTestId('patient-search-submit').click();

    const row = page.getByTestId('patient-search-row').filter({ hasText: mrn });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByTestId('patient-search-view').click();
    await expect(page.getByTestId('patient-detail-view')).toBeVisible();
    await expect(
      page.getByTestId('patient-detail-view').getByRole('code'),
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

    await expect(page.getByTestId('patient-register-mrn-error')).toContainText(
      /already exists|MRN/i,
      { timeout: 20_000 },
    );
    await expect(page).toHaveURL(/\/patients\/register\/?/);
  });

  test('shows client validation before calling the API', async ({ page }) => {
    await page.goto('/en/patients/register/', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('patient-register-form')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('patient-register-submit')).toBeEnabled();

    await page.getByTestId('patient-register-submit').click();
    await expect(page.getByTestId('patient-register-mrn-error')).toHaveText(
      'MRN is required.',
    );
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
    await expect(page.getByTestId('patient-detail-view')).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId('patient-detail-edit').click();
    await expect(page.getByTestId('patient-edit-form')).toBeVisible();
    await expect(page.getByTestId('patient-edit-mrn')).toBeDisabled();

    await page.getByTestId('patient-edit-givenName').fill('Kate');
    await page.getByTestId('patient-edit-save').click();

    await expect(page.getByTestId('patient-detail-view')).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByTestId('patient-detail-view').getByRole('heading', {
        name: 'Kate Johnson',
      }),
    ).toBeVisible();
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
    await expect(page.getByTestId('hc-tab-overview')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/[?&]tab=overview/);

    await page.getByTestId('hc-tab-documents').click();
    await expect(page).toHaveURL(/[?&]tab=documents/);
    await expect(page.getByTestId('patient-documents-timeline')).toBeVisible({
      timeout: 20_000,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/[?&]tab=documents/);
    await expect(page.getByTestId('patient-documents-timeline')).toBeVisible({
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
    await expect(page.getByTestId('patient-search-pagination')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('patient-search-row')).toHaveCount(20);

    const firstPageMrn = await page
      .getByTestId('patient-search-row')
      .first()
      .locator('code')
      .innerText();
    const range = page.getByTestId('patient-search-pagination').locator('p');
    await expect(range).toContainText('Showing 1–20 of');

    await page.getByTestId('patient-search-page-next').click();
    await expect(page.getByTestId('patient-search-page-prev')).toBeEnabled({
      timeout: 20_000,
    });
    await expect(range).toContainText('Showing 21–');
    await expect(
      page.getByTestId('patient-search-row').first().locator('code'),
    ).not.toHaveText(firstPageMrn);
  });
});
