import { expect } from '@playwright/test';
import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { seedDocumentCatalog, type DocumentCatalogRefs } from './documents.ts';
import {
  createEncounterViaApi,
  seedEncounterTaxonomy,
  type CreatedEncounter,
  type EncounterTaxonomyRefs,
} from './encounters.ts';
import {
  createPatientViaApi,
  uniqueMrn,
  type CreatedPatient,
} from './patients.ts';

/** Person details used to seed the patient of a document scenario. */
export interface ScenarioPerson {
  mrnPrefix: string;
  givenName: string;
  familyName: string;
}

export interface DocumentScenario {
  patient: CreatedPatient;
  taxonomy: EncounterTaxonomyRefs;
  catalog: DocumentCatalogRefs;
  encounter: CreatedEncounter;
}

/**
 * Seeds the full clinical-document workspace: patient, encounter taxonomy,
 * document catalog, and an open encounter ready to hold documents.
 */
export async function seedDocumentScenario(
  request: APIRequestContext,
  baseURL: string,
  person: ScenarioPerson,
): Promise<DocumentScenario> {
  const patient = await createPatientViaApi(request, baseURL, {
    mrn: uniqueMrn(person.mrnPrefix),
    givenName: person.givenName,
    familyName: person.familyName,
  });
  const taxonomy = await seedEncounterTaxonomy(request, baseURL);
  const catalog = await seedDocumentCatalog(request, baseURL, taxonomy);
  const encounter = await createEncounterViaApi(request, baseURL, {
    patientId: patient.id,
    facilityId: taxonomy.facilityId,
    clinicalAreaId: taxonomy.clinicalAreaId,
  });
  return { patient, taxonomy, catalog, encounter };
}

/** App-relative URL of a clinical document page. */
export function documentUrl(
  patientId: string,
  encounterId: string,
  documentId: string,
): string {
  return `/en/patients/${patientId}/encounters/${encounterId}/documents/${documentId}`;
}

/** The document status badge rendered in the page header. */
export function statusBadge(page: Page): Locator {
  return page.locator('header [data-slot=badge]');
}

/** Opens a document page and waits until the form is interactive. */
export async function openDocumentPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#chief-complaint')).toBeVisible({
    timeout: 30_000,
  });
}

/** The "Complete this document?" confirmation dialog. */
export function completeDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Complete this document?' });
}

/** Confirms the completion dialog once it is visible. */
export async function confirmCompleteDialog(page: Page): Promise<void> {
  const dialog = completeDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Complete document' }).click();
}
