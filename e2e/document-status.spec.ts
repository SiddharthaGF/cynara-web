import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

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

/** The document status badge rendered in the page header. */
function statusBadge(page: Page): Locator {
  return page.locator('header [data-slot=badge]');
}

async function openDocumentPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#chief-complaint')).toBeVisible({
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
    await expect(statusBadge(page)).toHaveText('Completed');
    await expect(
      page
        .locator('[data-slot=alert]')
        .filter({ hasText: 'This document is closed' }),
    ).toBeVisible();
    await expect(page.getByText('Form version:')).toContainText(
      catalog.publishedVersion,
    );
    await expect(page.locator('#chief-complaint')).toBeDisabled();
    await expect(page.locator('#chief-complaint')).toHaveValue(
      'Fever and cough since yesterday',
    );
    await expect(page.locator('#smoker')).toBeDisabled();
    await expect(page.locator('#smoker')).toBeChecked();
    await expect(
      page.getByRole('button', { name: 'Complete', exact: true }),
    ).toHaveCount(0);

    await openDocumentPage(
      page,
      documentUrl(patient.id, encounter.id, inError.id),
    );
    await expect(statusBadge(page)).toHaveText('Entered in error');
    await expect(
      page
        .locator('[data-slot=alert]')
        .filter({ hasText: 'This document is closed' }),
    ).toBeVisible();
    await expect(page.getByText('Seeded duplicate record')).toBeVisible();
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

    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    // The confirm dialog may open when the client-side guard raced the render;
    // Either way the server rejects the empty required field.
    const dialog = page.getByRole('dialog', {
      name: 'Complete this document?',
    });
    await dialog
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => undefined);
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Complete document' }).click();
    }

    await expect(page.locator('[data-slot=alert]').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(statusBadge(page)).toHaveText('In progress');
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
    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Complete this document?',
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Complete document' }).click();

    await expect(
      page.locator('[data-slot=alert]').filter({
        hasText: 'You do not have permission to change this document',
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('button', { name: 'Complete', exact: true }),
    ).toHaveCount(0);
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

    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Complete this document?',
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Complete document' }).click();

    await expect(
      page
        .locator('[data-slot=alert]')
        .filter({ hasText: 'This document changed while you were working' }),
    ).toBeVisible({ timeout: 20_000 });
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
    await expect(page.getByText('Access denied', { exact: true })).toBeVisible({
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
    await expect(
      page.locator('[data-slot=alert]').filter({ hasText: 'Read-only view' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Complete', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save draft' })).toHaveCount(
      0,
    );
    await expect(page.locator('#chief-complaint')).toBeDisabled();
    await expect(page.locator('#weight')).toBeDisabled();
    await expect(page.locator('#smoker')).toBeDisabled();

    // The encounter panel still lists documents but hides the start actions.
    await page.goto(`/en/patients/${patient.id}/encounters/${encounter.id}/`, {
      waitUntil: 'domcontentloaded',
    });
    const documentsPanel = page.locator('[data-slot=card]').filter({
      hasText: 'Clinical documents started within this consultation.',
    });
    await expect(documentsPanel).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Available forms')).toHaveCount(0);
    const listRow = documentsPanel
      .getByRole('listitem')
      .filter({ hasText: catalog.definitionName });
    await expect(listRow).toHaveAttribute('data-status', 'inProgress');
  });
});
