import type { Page } from '@playwright/test';

export const FULL_CAPABILITIES = [
  'patients.read',
  'patients.write',
  'encounters.read',
  'encounters.write',
  'clinical-documents.read',
  'clinical-documents.write',
  'form-responses.read',
  'form-responses.write',
  'audit.read',
  'catalog.read',
  'catalog.write',
  'workspace.read',
  'workspace.write',
  'capabilities.read',
  'capabilities.write',
];

const CAPABILITIES_URL = '**/api/me/capabilities';

export function grantCapabilities(page: Page, capabilities: string[]): void {
  void page.route(CAPABILITIES_URL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.api+json',
      body: JSON.stringify({
        actorId: 'designer-user',
        capabilities,
      }),
    });
  });
}

export function stubEmptyPatients(page: Page): void {
  void page.route('**/api/patients', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.api+json',
      body: JSON.stringify({
        patients: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
      }),
    });
  });
}

export function stubEmptyFormsCatalog(page: Page): void {
  void page.route('**/api/formDefinitions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.api+json',
      body: JSON.stringify({
        data: [],
        included: [],
        links: {},
        meta: {},
      }),
    });
  });
}
