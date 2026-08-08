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

test.describe('clinical document status (CYN-58)', () => {
  test.beforeEach(async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
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
    // Either way the server rejects the empty required field.
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
    // Stale rowVersion.
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
