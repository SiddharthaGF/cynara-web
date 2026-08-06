import { expect, test } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import {
  completeEncounterViaApi,
  createEncounterViaApi,
  seedEncounterTaxonomy,
} from './fixtures/encounters.ts';
import { createPatientViaApi, uniqueMrn } from './fixtures/patients.ts';

test.describe('encounter views and lifecycle (CYN-52)', () => {
  test.beforeEach(async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
  });

  test('creates an encounter from the patient chart and opens detail', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('ENC'),
      givenName: 'Grace',
      familyName: 'Hopper',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);

    await page.goto(`/en/patients/${patient.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('patient-encounters-panel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('encounter-list-empty')).toBeVisible();

    await page.getByTestId('encounter-create-open').click();
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

    await expect(page.getByTestId('encounter-list')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId('encounter-list-row').first(),
    ).toHaveAttribute('data-status', 'open');

    await page.getByTestId('encounter-list-open').first().click();
    await expect(page.getByTestId('encounter-detail-view')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('encounter-detail-status')).toContainText(
      'Open',
    );
    await expect(page.getByTestId('encounter-action-complete')).toBeVisible();
    await expect(page.getByTestId('encounter-action-cancel')).toBeVisible();
    await expect(
      page.getByTestId('encounter-action-enter-in-error'),
    ).toBeVisible();
  });

  test('completes an open encounter and keeps historical row readable', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('ENCC'),
      givenName: 'Alan',
      familyName: 'Turing',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
      type: 'emergency',
    });

    await page.goto(`/en/patients/${patient.id}/encounters/${encounter.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('encounter-detail-view')).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId('encounter-action-complete').click();
    await expect(
      page.getByTestId('encounter-transition-confirm'),
    ).toBeVisible();
    await page.getByTestId('encounter-transition-confirm-submit').click();

    await expect(page.getByTestId('encounter-detail-status')).toContainText(
      'Completed',
      { timeout: 30_000 },
    );
    await expect(page.getByTestId('encounter-detail-historical')).toBeVisible();
    await expect(page.getByTestId('encounter-action-complete')).toHaveCount(0);

    await page.goto(`/en/patients/${patient.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByTestId('encounter-list-row').first(),
    ).toHaveAttribute('data-historical', 'true');
    await expect(
      page.getByTestId('encounter-list-row').first(),
    ).toHaveAttribute('data-status', 'completed');
  });

  test('shows stale error when completing with outdated row version', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('ENCS'),
      givenName: 'Katherine',
      familyName: 'Johnson',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
    });

    await page.goto(`/en/patients/${patient.id}/encounters/${encounter.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('encounter-detail-view')).toBeVisible({
      timeout: 30_000,
    });

    await completeEncounterViaApi(
      request,
      baseURL,
      encounter.id,
      encounter.rowVersion,
    );

    await page.getByTestId('encounter-action-cancel').click();
    await page.getByTestId('encounter-transition-confirm-submit').click();

    await expect(page.getByTestId('encounter-detail-stale')).toBeVisible({
      timeout: 30_000,
    });
  });
});
