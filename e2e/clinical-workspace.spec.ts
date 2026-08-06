import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import {
  completeClinicalDocumentViaApi,
  enterClinicalDocumentInErrorViaApi,
  seedDocumentCatalog,
  seedWorkspaceDocument,
  startClinicalDocumentViaApi,
  WORKSPACE_ANSWERS,
} from './fixtures/documents.ts';
import {
  createEncounterViaApi,
  seedEncounterTaxonomy,
} from './fixtures/encounters.ts';
import { createPatientViaApi, uniqueMrn } from './fixtures/patients.ts';

const READ_ONLY_CLINICAL_CAPABILITIES = [
  'patients.read',
  'encounters.read',
  'clinical-documents.read',
  'form-responses.read',
  'catalog.read',
];

function documentUrl(
  patientId: string,
  encounterId: string,
  documentId: string,
): string {
  return `/en/patients/${patientId}/encounters/${encounterId}/documents/${documentId}`;
}

async function openDocumentPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('document-detail-view')).toBeVisible({
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

    // Open an encounter for the patient.
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
    const encounterRow = page.getByTestId('encounter-list-row').first();
    await expect(encounterRow).toHaveAttribute('data-status', 'open');
    await page.getByTestId('encounter-list-open').first().click();
    await expect(page.getByTestId('encounter-detail-view')).toBeVisible({
      timeout: 30_000,
    });
    const encounterId = lastUrlSegment(page.url());

    // Start a configured clinical document from the encounter.
    await expect(page.getByTestId('encounter-documents-panel')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId('start-document-open').click();
    await expect(page.getByTestId('start-document-dialog')).toBeVisible();
    await page.locator('#start-document-definition').click();
    await page
      .locator('[data-slot=select-item]')
      .filter({ hasText: catalog.definitionName })
      .click();
    await page.getByTestId('start-document-submit').click();

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
    await expect(page.getByTestId('patient-documents-timeline')).toBeVisible({
      timeout: 30_000,
    });
    const timelineRow = page
      .getByTestId('patient-documents-row')
      .filter({ hasText: catalog.definitionName });
    await expect(timelineRow).toHaveAttribute('data-status', 'completed');
    await expect(timelineRow).toHaveAttribute('data-terminal', 'true');
  });

  test('renders completed and entered-in-error documents with status and version metadata', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('WSB'),
      givenName: 'Rosalind',
      familyName: 'Franklin',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
    });

    const completed = await seedWorkspaceDocument(
      request,
      baseURL,
      patient.id,
      encounter.id,
      catalog,
      JSON.stringify(WORKSPACE_ANSWERS),
    );
    await completeClinicalDocumentViaApi(
      request,
      baseURL,
      completed.id,
      completed.rowVersion,
    );

    const inError = await seedWorkspaceDocument(
      request,
      baseURL,
      patient.id,
      encounter.id,
      catalog,
      JSON.stringify(WORKSPACE_ANSWERS),
    );
    await enterClinicalDocumentInErrorViaApi(
      request,
      baseURL,
      inError.id,
      inError.rowVersion,
      'Seeded duplicate record',
    );

    await openDocumentPage(
      page,
      documentUrl(patient.id, encounter.id, completed.id),
    );
    await expect(page.getByTestId('document-detail-status')).toContainText(
      'Completed',
    );
    await expect(page.getByTestId('document-detail-terminal')).toBeVisible();
    await expect(page.getByTestId('document-detail-view')).toContainText(
      catalog.publishedVersion,
    );
    await expect(page.locator('#chief-complaint')).toBeDisabled();
    await expect(page.locator('#chief-complaint')).toHaveValue(
      'Fever and cough since yesterday',
    );
    await expect(page.locator('#smoker')).toBeDisabled();
    await expect(page.locator('#smoker')).toBeChecked();
    await expect(page.getByTestId('document-action-complete')).toHaveCount(0);

    await openDocumentPage(
      page,
      documentUrl(patient.id, encounter.id, inError.id),
    );
    await expect(page.getByTestId('document-detail-status')).toContainText(
      'Entered in error',
    );
    await expect(page.getByTestId('document-detail-terminal')).toBeVisible();
    await expect(page.getByTestId('document-detail-view')).toContainText(
      'Seeded duplicate record',
    );
    await expect(page.locator('#chief-complaint')).toBeDisabled();
  });

  test('rejects completion of an empty required field', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('WSV'),
      givenName: 'Marie',
      familyName: 'Curie',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
    });
    const document = await startClinicalDocumentViaApi(request, baseURL, {
      documentDefinitionId: catalog.definitionId,
      encounterId: encounter.id,
    });

    await openDocumentPage(
      page,
      documentUrl(patient.id, encounter.id, document.id),
    );

    await page.getByTestId('document-action-complete').click();
    // The confirm dialog may open when the client-side guard raced the render;
    // either way the server rejects the empty required field.
    const dialog = page.getByTestId('document-transition-confirm');
    await dialog
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => undefined);
    if (await dialog.isVisible()) {
      await page.getByTestId('document-transition-confirm-submit').click();
    }

    await expect(page.getByTestId('document-detail-action-error')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('document-detail-status')).toContainText(
      'In progress',
    );
  });

  test('shows a forbidden alert when the mutation is denied', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('WSF'),
      givenName: 'Barbara',
      familyName: 'McClintock',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
    });
    const document = await seedWorkspaceDocument(
      request,
      baseURL,
      patient.id,
      encounter.id,
      catalog,
      JSON.stringify(WORKSPACE_ANSWERS),
    );

    await page.route('**/api/clinicalDocuments/*/complete', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({
          errors: [
            {
              status: '403',
              title: 'Forbidden',
              detail: 'Insufficient capability',
            },
          ],
        }),
      });
    });

    await openDocumentPage(
      page,
      documentUrl(patient.id, encounter.id, document.id),
    );
    await page.getByTestId('document-action-complete').click();
    await expect(page.getByTestId('document-transition-confirm')).toBeVisible();
    await page.getByTestId('document-transition-confirm-submit').click();

    await expect(page.getByTestId('document-detail-forbidden')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('document-action-complete')).toHaveCount(0);
  });

  test('shows a stale conflict when the document was modified elsewhere', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('WSS'),
      givenName: 'Hypatia',
      familyName: 'Alexandria',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
    });
    const document = await seedWorkspaceDocument(
      request,
      baseURL,
      patient.id,
      encounter.id,
      catalog,
      JSON.stringify(WORKSPACE_ANSWERS),
    );

    await openDocumentPage(
      page,
      documentUrl(patient.id, encounter.id, document.id),
    );

    // Complete the document from another client while the page holds its
    // stale rowVersion.
    await completeClinicalDocumentViaApi(
      request,
      baseURL,
      document.id,
      document.rowVersion,
    );

    await page.getByTestId('document-action-complete').click();
    await expect(page.getByTestId('document-transition-confirm')).toBeVisible();
    await page.getByTestId('document-transition-confirm-submit').click();

    await expect(page.getByTestId('document-detail-stale')).toBeVisible({
      timeout: 20_000,
    });
  });

  test('blocks route access without clinical-documents.read', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }
    grantCapabilities(page, ['patients.read', 'encounters.read']);

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('WSD'),
      givenName: 'Lise',
      familyName: 'Meitner',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
    });
    const document = await startClinicalDocumentViaApi(request, baseURL, {
      documentDefinitionId: catalog.definitionId,
      encounterId: encounter.id,
    });

    await page.goto(documentUrl(patient.id, encounter.id, document.id), {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('access-denied')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('renders documents read-only without clinical-documents.write', async ({
    page,
    request,
    baseURL,
  }) => {
    if (!baseURL) {
      test.skip(true, 'Playwright baseURL is required');
      return;
    }
    grantCapabilities(page, READ_ONLY_CLINICAL_CAPABILITIES);

    const patient = await createPatientViaApi(request, baseURL, {
      mrn: uniqueMrn('WSR'),
      givenName: 'Dorothy',
      familyName: 'Hodgkin',
    });
    const taxonomy = await seedEncounterTaxonomy(request, baseURL);
    const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);
    const encounter = await createEncounterViaApi(request, baseURL, {
      patientId: patient.id,
      facilityId: taxonomy.facilityId,
      clinicalAreaId: taxonomy.clinicalAreaId,
    });
    const document = await seedWorkspaceDocument(
      request,
      baseURL,
      patient.id,
      encounter.id,
      catalog,
      JSON.stringify(WORKSPACE_ANSWERS),
    );

    await openDocumentPage(
      page,
      documentUrl(patient.id, encounter.id, document.id),
    );
    await expect(page.getByTestId('insufficient-permission')).toBeVisible();
    await expect(page.getByTestId('document-action-complete')).toHaveCount(0);
    await expect(page.getByTestId('document-action-save')).toHaveCount(0);
    await expect(page.locator('#chief-complaint')).toBeDisabled();
    await expect(page.locator('#weight')).toBeDisabled();
    await expect(page.locator('#smoker')).toBeDisabled();

    // The encounter panel still lists documents but hides the start button.
    await page.goto(`/en/patients/${patient.id}/encounters/${encounter.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('encounter-documents-panel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('start-document-open')).toHaveCount(0);
    await expect(
      page
        .getByTestId('document-list-row')
        .filter({ hasText: catalog.definitionName }),
    ).toHaveAttribute('data-status', 'inProgress');
  });
});

function lastUrlSegment(url: string): string {
  return url.split('/').filter(Boolean).at(-1) ?? '';
}
