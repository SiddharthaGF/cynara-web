import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import { seedDocumentCatalog } from './fixtures/documents.ts';
import { seedEncounterTaxonomy } from './fixtures/encounters.ts';
import { uniqueMrn } from './fixtures/patients.ts';
import { test } from './fixtures/test';

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
  input: { mrn: string; givenName: string; familyName: string },
): Promise<void> {
  await page.goto('/en/patients/register/', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('form', { name: 'Register a patient' }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole('button', { name: 'Register patient' }),
  ).toBeEnabled();

  await page.getByLabel('Medical record number (MRN)').fill(input.mrn);
  await page.getByLabel('National ID').fill(`NID-${input.mrn}`);
  await page.getByLabel('First name').fill(input.givenName);
  await page.getByLabel('Last name').fill(input.familyName);
  await pickBirthDate(page, '1990-01-01');

  const sexTrigger = page.getByLabel('Sex');
  await sexTrigger.click();
  await page
    .locator('[data-slot=select-item]')
    .filter({ hasText: 'Female' })
    .click();
  await expect(sexTrigger).toContainText('Female');

  const bloodTypeTrigger = page.getByLabel('Blood type');
  await bloodTypeTrigger.click();
  await page
    .locator('[data-slot=select-item]')
    .filter({ hasText: 'O+' })
    .click();
  await expect(bloodTypeTrigger).toContainText('O+');

  await page.getByRole('button', { name: 'Register patient' }).click();
}

/** The clinical document status badge rendered in the document page header. */
function documentStatusBadge(page: Page): Locator {
  return page.locator('header [data-slot=badge]');
}

test.describe('clinical workspace (CYN-58)', () => {
  test.beforeEach(async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
  });

  test('completes the stage 2 journey: register, search, encounter, document', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);

    // Register and search a patient through the UI.
    const mrn = uniqueMrn('WS');
    await registerPatientInUi(page, {
      mrn,
      givenName: 'Florence',
      familyName: 'Nightingale',
    });
    await expect(
      page.getByRole('heading', { name: 'Florence Nightingale' }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    const searchForm = page.getByRole('search', { name: 'Find a patient' });
    await expect(searchForm).toBeVisible({ timeout: 30_000 });
    await searchForm.getByLabel('MRN').fill(mrn);
    await searchForm
      .getByRole('button', { name: 'Search', exact: true })
      .click();
    const searchRow = page.getByRole('row').filter({ hasText: mrn });
    await expect(searchRow).toBeVisible({ timeout: 20_000 });
    await searchRow
      .getByRole('button', { name: 'Open clinical record' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Florence Nightingale' }),
    ).toBeVisible();
    const patientId = new URL(page.url()).pathname.split('/')[3];

    // The chart opens as a clinical record with breadcrumbs and tabs. Both
    // The site header and the chart render breadcrumbs; scope to the chart's.
    const chartBreadcrumb = page
      .locator('[data-slot=breadcrumb]')
      .filter({ hasText: 'Florence Nightingale' });
    await expect(chartBreadcrumb).toContainText('Patients');
    await expect(chartBreadcrumb).toContainText('Florence Nightingale');
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Consultations' }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Documents' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Journey' })).toBeVisible();
    await expect(
      page
        .locator('[data-slot=empty]')
        .filter({ hasText: 'No open consultations' }),
    ).toBeVisible({ timeout: 20_000 });

    // New consultation in one click from the chart header.
    await page
      .locator('header')
      .getByRole('button', { name: 'New consultation', exact: true })
      .click();
    const createDialog = page.getByRole('dialog', {
      name: 'Create consultation',
    });
    await expect(createDialog).toBeVisible();

    await createDialog.getByLabel('Facility').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: taxonomy.facilityName })
      .click();
    await createDialog.getByLabel('Clinical area').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: taxonomy.clinicalAreaName })
      .click();
    await createDialog.getByLabel('Consultation type').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: 'Ambulatory' })
      .click();
    await createDialog
      .getByRole('button', { name: 'Create consultation' })
      .click();

    // Creation navigates straight to the new consultation detail.
    await expect(
      page.getByRole('heading', { name: 'Consultation' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page
        .locator('[data-slot=breadcrumb]')
        .filter({ hasText: 'Consultation' }),
    ).toBeVisible();
    const encounterId = lastUrlSegment(page.url());

    // Start a configured clinical document from the encounter in one click.
    const documentsPanel = page.locator('[data-slot=card]').filter({
      hasText: 'Clinical documents started within this consultation.',
    });
    await expect(documentsPanel).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Available forms')).toBeVisible();
    await page.getByRole('button', { name: catalog.definitionName }).click();

    await expect(
      page.getByRole('heading', { name: catalog.definitionName }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(documentStatusBadge(page)).toHaveText('In progress');

    // Fill the draft and save.
    await page
      .locator('#chief-complaint')
      .fill('Fever and cough since yesterday');
    await page
      .locator('#clinical-notes')
      .fill('Patient reports onset last evening.');
    await page.locator('#weight').fill('72.5');
    await page
      .locator('[data-field-id="smoker"]')
      .locator('[data-slot=checkbox]')
      .click();
    const savedResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/api/formResponses/'),
    );
    await page.getByRole('button', { name: 'Save draft' }).click();
    await savedResponse;
    await expect(page.locator('[data-slot=alert]')).toHaveCount(0);

    // Reload: the draft is recovered from the saved form response.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: catalog.definitionName }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#chief-complaint')).toHaveValue(
      'Fever and cough since yesterday',
    );
    await expect(page.locator('#weight')).toHaveValue('72.5');
    await expect(page.locator('#smoker')).toBeChecked();

    // Complete the document and verify the read-only historical rendering.
    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    const confirmDialog = page.getByRole('dialog', {
      name: 'Complete this document?',
    });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole('button', { name: 'Complete document' })
      .click();

    await expect(documentStatusBadge(page)).toHaveText('Completed', {
      timeout: 30_000,
    });
    await expect(
      page
        .locator('[data-slot=alert]')
        .filter({ hasText: 'This document is closed' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Complete', exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('#chief-complaint')).toBeDisabled();
    await expect(page.locator('#smoker')).toBeDisabled();
    await expect(page.getByText('Form version:')).toContainText(
      catalog.publishedVersion,
    );

    // Historical rendering: the encounter and patient chart keep the record.
    await page.goto(`/en/patients/${patientId}/encounters/${encounterId}/`, {
      waitUntil: 'domcontentloaded',
    });
    const encounterDocuments = page.locator('[data-slot=card]').filter({
      hasText: 'Clinical documents started within this consultation.',
    });
    await expect(encounterDocuments).toBeVisible({ timeout: 30_000 });
    const listRow = encounterDocuments
      .getByRole('listitem')
      .filter({ hasText: catalog.definitionName });
    await expect(listRow).toHaveAttribute('data-status', 'completed');
    await expect(listRow).toHaveAttribute('data-terminal', 'true');

    await page.goto(`/en/patients/${patientId}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('tab', { name: 'Documents' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('tab', { name: 'Documents' }).click();
    const timelinePanel = page
      .locator('[data-slot=card]')
      .filter({ hasText: 'Document history' });
    await expect(timelinePanel).toBeVisible({ timeout: 30_000 });
    const timelineRow = timelinePanel
      .getByRole('listitem')
      .filter({ hasText: catalog.definitionName });
    await expect(timelineRow).toHaveAttribute('data-status', 'completed');
    await expect(timelineRow).toHaveAttribute('data-terminal', 'true');
  });
});

function lastUrlSegment(url: string): string {
  return url.split('/').filter(Boolean).at(-1) ?? '';
}
