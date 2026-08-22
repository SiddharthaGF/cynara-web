import { expect, test } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import {
  completeClinicalDocumentViaApi,
  enterClinicalDocumentInErrorViaApi,
  seedWorkspaceDocument,
  startClinicalDocumentViaApi,
  WORKSPACE_ANSWERS,
} from './fixtures/documents.ts';
import {
  completeDialog,
  confirmCompleteDialog,
  documentUrl,
  openDocumentPage,
  seedDocumentScenario,
  statusBadge,
} from './fixtures/documentScenario.ts';

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

    const { patient, encounter, catalog } = await seedDocumentScenario(
      request,
      baseURL,
      {
        mrnPrefix: 'WSB',
        givenName: 'Rosalind',
        familyName: 'Franklin',
      },
    );

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

    const { patient, encounter, catalog } = await seedDocumentScenario(
      request,
      baseURL,
      {
        mrnPrefix: 'WSV',
        givenName: 'Marie',
        familyName: 'Curie',
      },
    );
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
    const dialog = completeDialog(page);
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

    const { patient, encounter, catalog } = await seedDocumentScenario(
      request,
      baseURL,
      {
        mrnPrefix: 'WSF',
        givenName: 'Barbara',
        familyName: 'McClintock',
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
    await confirmCompleteDialog(page);

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

    const { patient, encounter, catalog } = await seedDocumentScenario(
      request,
      baseURL,
      {
        mrnPrefix: 'WSS',
        givenName: 'Hypatia',
        familyName: 'Alexandria',
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

    // Complete the document from another client while the page holds its
    // Stale rowVersion.
    await completeClinicalDocumentViaApi(
      request,
      baseURL,
      document.id,
      document.rowVersion,
    );

    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    await confirmCompleteDialog(page);

    await expect(
      page
        .locator('[data-slot=alert]')
        .filter({ hasText: 'This document changed while you were working' }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
