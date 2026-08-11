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
    await expect(page.getByRole('tab', { name: 'Consultations' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('tab', { name: 'Consultations' }).click();
    const encountersPanel = page.locator('[data-slot=card]', {
      hasText: 'Open visits and historical consultations for this patient.',
    });
    await expect(encountersPanel).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('No consultations yet')).toBeVisible();

    await encountersPanel
      .getByRole('button', { name: 'New consultation', exact: true })
      .first()
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Create consultation' }),
    ).toBeVisible();

    await page.getByLabel('Facility').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: taxonomy.facilityName })
      .click();

    await page.getByLabel('Clinical area').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: taxonomy.clinicalAreaName })
      .click();

    await page.getByLabel('Consultation type').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: 'Ambulatory' })
      .click();

    await page
      .getByRole('button', { name: 'Create consultation', exact: true })
      .click();

    // Creation navigates straight to the new consultation detail.
    await expect(
      page.getByRole('heading', { name: 'Consultation', exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('status').filter({ hasText: 'Open' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Complete', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Cancel consultation', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Entered in error', exact: true }),
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
    await expect(
      page.getByRole('heading', { name: 'Consultation', exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Complete this consultation?' }),
    ).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Complete this consultation?' })
      .getByRole('button', { name: 'Complete consultation', exact: true })
      .click();

    await expect(
      page.getByRole('status').filter({ hasText: 'Completed' }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(
        'This encounter is closed. It remains readable for the clinical record.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Complete', exact: true }),
    ).toHaveCount(0);

    await page.goto(`/en/patients/${patient.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('tab', { name: 'Consultations' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('tab', { name: 'Consultations' }).click();
    const row = page
      .getByRole('listitem')
      .filter({ hasText: 'Emergency' })
      .first();
    await expect(row).toHaveAttribute('data-historical', 'true');
    await expect(row).toHaveAttribute('data-status', 'completed');
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
    await expect(
      page.getByRole('heading', { name: 'Consultation', exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });

    await completeEncounterViaApi(
      request,
      baseURL,
      encounter.id,
      encounter.rowVersion,
    );

    await page
      .getByRole('button', { name: 'Cancel consultation', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Cancel this consultation?' })
      .getByRole('button', { name: 'Cancel consultation', exact: true })
      .click();

    await expect(
      page.getByText(
        'This consultation changed while you were working. Reload the latest version before continuing.',
      ),
    ).toBeVisible({
      timeout: 30_000,
    });
  });
});
