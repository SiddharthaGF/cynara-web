import type { APIRequestContext } from '@playwright/test';

import { apiHeaders, apiOrigin } from '../lib/auth';
import type { DocumentCatalogRefs } from './documents.ts';

export { apiOrigin };

export interface CreatedClinicalDocument {
  id: string;
  formResponseId: string;
  status: string;
  rowVersion: number;
  documentDefinitionId: string;
}

export async function startClinicalDocumentViaApi(
  request: APIRequestContext,
  baseURL: string,
  input: { documentDefinitionId: string; encounterId: string },
): Promise<CreatedClinicalDocument> {
  const origin = apiOrigin(baseURL);
  const response = await request.post(`${origin}/api/clinicalDocuments`, {
    data: {
      documentDefinitionId: input.documentDefinitionId,
      encounterId: input.encounterId,
    },
    headers: await apiHeaders(),
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to start clinical document (${response.status()}): ${await response.text()}`,
    );
  }
  const body = (await response.json()) as CreatedClinicalDocument;
  return {
    id: body.id,
    formResponseId: body.formResponseId,
    status: body.status,
    rowVersion: body.rowVersion,
    documentDefinitionId: body.documentDefinitionId,
  };
}

export async function updateFormResponseViaApi(
  request: APIRequestContext,
  baseURL: string,
  id: string,
  answersJson: string,
  rowVersion: number,
): Promise<{ rowVersion: number }> {
  const origin = apiOrigin(baseURL);
  const response = await request.patch(`${origin}/api/formResponses/${id}`, {
    data: {
      data: {
        id,
        type: 'formResponses',
        attributes: { answersJson, rowVersion },
      },
    },
    headers: await apiHeaders(),
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to update form response (${response.status()}): ${await response.text()}`,
    );
  }
  const body = (await response.json()) as {
    data: { attributes: { rowVersion: number } };
  };
  return { rowVersion: body.data.attributes.rowVersion };
}

export async function completeClinicalDocumentViaApi(
  request: APIRequestContext,
  baseURL: string,
  documentId: string,
  rowVersion: number,
): Promise<CreatedClinicalDocument> {
  const origin = apiOrigin(baseURL);
  const response = await request.post(
    `${origin}/api/clinicalDocuments/${documentId}/complete`,
    {
      data: { rowVersion },
      headers: await apiHeaders(),
    },
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to complete clinical document (${response.status()}): ${await response.text()}`,
    );
  }
  return (await response.json()) as CreatedClinicalDocument;
}

export async function enterClinicalDocumentInErrorViaApi(
  request: APIRequestContext,
  baseURL: string,
  documentId: string,
  rowVersion: number,
  reason: string,
): Promise<CreatedClinicalDocument> {
  const origin = apiOrigin(baseURL);
  const response = await request.post(
    `${origin}/api/clinicalDocuments/${documentId}/enter-in-error`,
    {
      data: { rowVersion, reason },
      headers: await apiHeaders(),
    },
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to enter clinical document in error (${response.status()}): ${await response.text()}`,
    );
  }
  return (await response.json()) as CreatedClinicalDocument;
}

/**
 * Seeds a complete document fixture (patient + encounter + answers) and
 * returns the document.
 */
export async function seedWorkspaceDocument(
  request: APIRequestContext,
  baseURL: string,
  patientId: string,
  encounterId: string,
  catalog: DocumentCatalogRefs,
  answersJson: string = '{}',
): Promise<CreatedClinicalDocument> {
  const document = await startClinicalDocumentViaApi(request, baseURL, {
    documentDefinitionId: catalog.definitionId,
    encounterId,
  });
  await updateFormResponseViaApi(
    request,
    baseURL,
    document.formResponseId,
    answersJson,
    0,
  );
  return document;
}
