import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import { seedDocumentCatalog } from './fixtures/documents.ts';
import { seedEncounterTaxonomy } from './fixtures/encounters.ts';
import { uniqueMrn } from './fixtures/patients.ts';

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
  input: { mrn: string; givenName: string; familyName: string },
): Promise<void> {
  await page.goto('/en/patients/register/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('patient-register-form')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('patient-register-submit')).toBeEnabled();

  await page.getByTestId('patient-register-mrn').fill(input.mrn);
  await page
    .getByTestId('patient-register-nationalId')
    .fill(`NID-${input.mrn}`);
  await page.getByTestId('patient-register-givenName').fill(input.givenName);
  await page.getByTestId('patient-register-familyName').fill(input.familyName);
  await pickBirthDate(page, '1990-01-01');

  const sexTrigger = page.getByTestId('patient-register-sex');
  await sexTrigger.click();
  await page
    .locator('[data-slot=select-item]')
    .filter({ hasText: 'Female' })
    .click();
  await expect(sexTrigger).toContainText('Female');

  await page.getByTestId('patient-register-submit').click();
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
    await expect(page.getByTestId('patient-detail-view')).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/en/patients/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('patient-search-form')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId('patient-search-mrn').fill(mrn);
    await page.getByTestId('patient-search-submit').click();
    const searchRow = page
      .getByTestId('patient-search-row')
      .filter({ hasText: mrn });
    await expect(searchRow).toBeVisible({ timeout: 20_000 });
    await searchRow.getByTestId('patient-search-view').click();
    await expect(page.getByTestId('patient-detail-view')).toBeVisible();
    const patientId = new URL(page.url()).pathname.split('/')[3];

    // The chart opens as a clinical record with breadcrumbs and tabs.
    const breadcrumb = page.locator('[data-slot=breadcrumb]');
    await expect(breadcrumb).toContainText('Patients');
    await expect(breadcrumb).toContainText('Florence Nightingale');
    await expect(page.getByTestId('hc-tab-overview')).toBeVisible();
    await expect(page.getByTestId('hc-tab-encounters')).toBeVisible();
    await expect(page.getByTestId('hc-tab-documents')).toBeVisible();
    await expect(page.getByTestId('hc-tab-journeys')).toBeVisible();
    await expect(
      page.getByTestId('patient-overview-encounter-empty'),
    ).toBeVisible({ timeout: 20_000 });

    // New consultation in one click from the chart header.
    await page.getByTestId('hc-new-encounter').click();
    await expect(page.getByTestId('encounter-create-dialog')).toBeVisible();

    await page.getByTestId('encounter-create-facility').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: taxonomy.facilityName })
      .click();
    await page.getByTestId('encounter-create-clinicalArea').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: taxonomy.clinicalAreaName })
      .click();
    await page.getByTestId('encounter-create-type').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: 'Ambulatory' })
      .click();
    await page.getByTestId('encounter-create-submit').click();

    // Creation navigates straight to the new consultation detail.
    await expect(page.getByTestId('encounter-detail-view')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-slot=breadcrumb]')).toContainText(
      'Consultation',
    );
    const encounterId = lastUrlSegment(page.url());

    // Start a configured clinical document from the encounter in one click.
    await expect(page.getByTestId('encounter-documents-panel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('encounter-available-forms')).toBeVisible();
    await page
      .getByTestId('start-document-action')
      .filter({ hasText: catalog.definitionName })
      .click();

    await expect(page.getByTestId('document-detail-view')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('document-detail-status')).toContainText(
      'In progress',
    );

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
    await page.getByTestId('document-action-save').click();
    await savedResponse;
    await expect(page.getByTestId('document-detail-action-error')).toHaveCount(
      0,
    );

    // Reload: the draft is recovered from the saved form response.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('document-detail-view')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('#chief-complaint')).toHaveValue(
      'Fever and cough since yesterday',
    );
    await expect(page.locator('#weight')).toHaveValue('72.5');
    await expect(page.locator('#smoker')).toBeChecked();

    // Complete the document and verify the read-only historical rendering.
    await page.getByTestId('document-action-complete').click();
    await expect(page.getByTestId('document-transition-confirm')).toBeVisible();
    await page.getByTestId('document-transition-confirm-submit').click();

    await expect(page.getByTestId('document-detail-status')).toContainText(
      'Completed',
      { timeout: 30_000 },
    );
    await expect(page.getByTestId('document-detail-terminal')).toBeVisible();
    await expect(page.getByTestId('document-action-complete')).toHaveCount(0);
    await expect(page.locator('#chief-complaint')).toBeDisabled();
    await expect(page.locator('#smoker')).toBeDisabled();
    await expect(page.getByTestId('document-detail-view')).toContainText(
      catalog.publishedVersion,
    );

    // Historical rendering: the encounter and patient chart keep the record.
    await page.goto(`/en/patients/${patientId}/encounters/${encounterId}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('encounter-documents-panel')).toBeVisible({
      timeout: 30_000,
    });
    const listRow = page
      .getByTestId('document-list-row')
      .filter({ hasText: catalog.definitionName });
    await expect(listRow).toHaveAttribute('data-status', 'completed');
    await expect(listRow).toHaveAttribute('data-terminal', 'true');

    await page.goto(`/en/patients/${patientId}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('hc-tab-documents')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId('hc-tab-documents').click();
    await expect(page.getByTestId('patient-documents-timeline')).toBeVisible({
      timeout: 30_000,
    });
    const timelineRow = page
      .getByTestId('patient-documents-row')
      .filter({ hasText: catalog.definitionName });
    await expect(timelineRow).toHaveAttribute('data-status', 'completed');
    await expect(timelineRow).toHaveAttribute('data-terminal', 'true');
  });
});

function lastUrlSegment(url: string): string {
  return url.split('/').filter(Boolean).at(-1) ?? '';
}
