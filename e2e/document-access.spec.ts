import { expect, test } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import {
  seedWorkspaceDocument,
  startClinicalDocumentViaApi,
  WORKSPACE_ANSWERS,
} from './fixtures/documents.ts';
import {
  documentUrl,
  openDocumentPage,
  seedDocumentScenario,
} from './fixtures/documentScenario.ts';

const READ_ONLY_CLINICAL_CAPABILITIES = [
  'patients.read',
  'encounters.read',
  'clinical-documents.read',
  'form-responses.read',
  'catalog.read',
];

test.describe('clinical document access control (CYN-58)', () => {
  test.beforeEach(async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
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

    const { patient, encounter, catalog } = await seedDocumentScenario(
      request,
      baseURL,
      {
        mrnPrefix: 'WSD',
        givenName: 'Lise',
        familyName: 'Meitner',
      },
    );
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

    const { patient, encounter, catalog } = await seedDocumentScenario(
      request,
      baseURL,
      {
        mrnPrefix: 'WSR',
        givenName: 'Dorothy',
        familyName: 'Hodgkin',
      },
    );
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
