import type { APIRequestContext } from '@playwright/test';

import { uniqueCode } from './encounters.ts';

const JSON_API_MEDIA = 'application/vnd.api+json';
const ACTOR = 'designer-user';
const HOSPITAL = process.env.VITE_HOSPITAL_CODE ?? 'default';

function apiOrigin(baseURL: string): string {
  return process.env.VITE_API_ORIGIN?.replace(/\/$/u, '') || baseURL;
}

function headers(): Record<string, string> {
  return {
    'Accept': JSON_API_MEDIA,
    'Content-Type': JSON_API_MEDIA,
    'X-Actor-Id': ACTOR,
    'X-Hospital-Code': HOSPITAL,
  };
}

/**
 * Minimal clinical schema used to seed the document catalog. Field ids double
 * as the input `id` attributes the browser renderer renders, so tests target
 * them directly (`#chief-complaint`, `#weight`, …).
 */
export const WORKSPACE_CLINICAL = {
  schemaVersion: '1.0.0',
  fields: [
    {
      id: 'chief-complaint',
      code: 'encounter.chief-complaint',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      id: 'clinical-notes',
      code: 'encounter.notes',
      type: 'textarea',
      maxLength: 4000,
    },
    {
      id: 'weight',
      code: 'body.weight.kg',
      type: 'number',
      minimum: 1,
      maximum: 400,
      multipleOf: 0.1,
      decimalPlaces: 1,
    },
    {
      id: 'smoker',
      code: 'history.smoker',
      type: 'boolean',
    },
  ],
};

export const WORKSPACE_UI = {
  schemaVersion: '1.0.0',
  clinicalSchemaVersion: '1.0.0',
  fields: {
    'chief-complaint': { label: 'Chief complaint', widget: 'text-input' },
    'clinical-notes': { label: 'Clinical notes', widget: 'textarea' },
    'weight': { label: 'Weight (kg)', widget: 'number-input' },
    'smoker': { label: 'Smoker', widget: 'checkbox' },
  },
  layout: [
    { type: 'field', fieldId: 'chief-complaint' },
    { type: 'field', fieldId: 'clinical-notes' },
    { type: 'field', fieldId: 'weight' },
    { type: 'field', fieldId: 'smoker' },
  ],
};

export const WORKSPACE_RULES = {
  schemaVersion: '1.0.0',
  clinicalSchemaVersion: '1.0.0',
  fields: {},
  validations: [],
};

/** Valid draft answers keyed by field code, matching the schema above. */
export const WORKSPACE_ANSWERS = {
  'encounter.chief-complaint': 'Fever and cough since yesterday',
  'body.weight.kg': 72.5,
  'history.smoker': true,
};

export interface CreatedClinicalDocument {
  id: string;
  formResponseId: string;
  status: string;
  rowVersion: number;
  documentDefinitionId: string;
}

export interface DocumentCatalogRefs {
  facilityId: string;
  clinicalAreaId: string;
  disciplineId: string;
  formDefinitionId: string;
  formVersionId: string;
  /** Semver assigned on publish, e.g. "1.0.0". */
  publishedVersion: string;
  definitionId: string;
  definitionName: string;
  code: string;
}

interface FormDefinitionDocument {
  data: {
    id: string;
  };
}

interface IncludedFormVersion {
  type: string;
  id: string;
  attributes: {
    rowVersion: number;
    version?: string | null;
  };
}

interface FormVersionDocument {
  data: {
    id: string;
    attributes: {
      rowVersion: number;
      version?: string | null;
    };
  };
}

/**
 * Creates the minimum hospital structure + document catalog for the clinical
 * workspace: a discipline, a published form (with the workspace schema), and
 * a document definition pinned to the published version. Reuses the facility
 * and clinical area created by `seedEncounterTaxonomy` so the definition
 * matches an encounter in that facility/area.
 */
export async function seedDocumentCatalog(
  request: APIRequestContext,
  baseURL: string,
  taxonomy: { facilityId: string; clinicalAreaId: string },
): Promise<DocumentCatalogRefs> {
  const origin = apiOrigin(baseURL);
  const suffix = uniqueCode('ws');

  const disciplineResponse = await request.post(`${origin}/api/disciplines`, {
    data: {
      code: `disc-${suffix}`,
      name: `Workspace discipline ${suffix}`,
      clinicalAreaId: taxonomy.clinicalAreaId,
    },
    headers: headers(),
  });
  if (!disciplineResponse.ok()) {
    throw new Error(
      `Failed to create discipline (${disciplineResponse.status()}): ${await disciplineResponse.text()}`,
    );
  }
  const discipline = (await disciplineResponse.json()) as { id: string };

  const formResponse = await request.post(`${origin}/api/formDefinitions`, {
    data: {
      data: {
        type: 'formDefinitions',
        attributes: {
          code: `form-${suffix}`,
          name: `Workspace form ${suffix}`,
          initialClinicalSchemaJson: JSON.stringify(WORKSPACE_CLINICAL),
          initialUiSchemaJson: JSON.stringify(WORKSPACE_UI),
          initialRulesSchemaJson: JSON.stringify(WORKSPACE_RULES),
        },
      },
    },
    headers: headers(),
  });
  if (!formResponse.ok()) {
    throw new Error(
      `Failed to create form (${formResponse.status()}): ${await formResponse.text()}`,
    );
  }
  const formDefinitionId = (
    (await formResponse.json()) as FormDefinitionDocument
  ).data.id;

  const definitionDocument = await request.get(
    `${origin}/api/formDefinitions/${formDefinitionId}?include=versions`,
    { headers: headers() },
  );
  if (!definitionDocument.ok()) {
    throw new Error(
      `Failed to load form definition (${definitionDocument.status()}): ${await definitionDocument.text()}`,
    );
  }
  const definitionBody = (await definitionDocument.json()) as {
    included?: IncludedFormVersion[];
  };
  const draft = definitionBody.included?.find(
    (item) => item.type === 'formVersions',
  );
  if (!draft) {
    throw new Error('seedDocumentCatalog: draft form version was not included');
  }
  const formVersionId = draft.id;

  const submitted = await request.post(
    `${origin}/api/formVersions/${formVersionId}/submit-review?rowVersion=${draft.attributes.rowVersion}`,
    { headers: headers() },
  );
  if (!submitted.ok()) {
    throw new Error(
      `Failed to submit form for review (${submitted.status()}): ${await submitted.text()}`,
    );
  }
  const afterReview = (await submitted.json()) as FormVersionDocument;

  const published = await request.post(
    `${origin}/api/formVersions/${formVersionId}/publish?rowVersion=${afterReview.data.attributes.rowVersion}`,
    { headers: headers() },
  );
  if (!published.ok()) {
    throw new Error(
      `Failed to publish form version (${published.status()}): ${await published.text()}`,
    );
  }
  const publishedDocument = (await published.json()) as FormVersionDocument;
  const publishedVersion =
    publishedDocument.data.attributes.version ??
    afterReview.data.attributes.version ??
    formVersionId;

  const definitionName = `Triage note ${suffix}`;
  const definitionResponse = await request.post(
    `${origin}/api/documentDefinitions`,
    {
      data: {
        data: {
          type: 'documentDefinitions',
          attributes: {
            code: `def-${suffix}`,
            name: definitionName,
            allowsMultipleInstancesPerEncounter: true,
            requiresActorForCreation: true,
            requiresActorForCompletion: true,
          },
          relationships: {
            formDefinition: {
              data: { type: 'formDefinitions', id: formDefinitionId },
            },
            formVersion: {
              data: { type: 'formVersions', id: formVersionId },
            },
            facility: {
              data: { type: 'facilities', id: taxonomy.facilityId },
            },
            clinicalArea: {
              data: { type: 'clinicalAreas', id: taxonomy.clinicalAreaId },
            },
            discipline: {
              data: { type: 'disciplines', id: discipline.id },
            },
          },
        },
      },
      headers: headers(),
    },
  );
  if (!definitionResponse.ok()) {
    throw new Error(
      `Failed to create document definition (${definitionResponse.status()}): ${await definitionResponse.text()}`,
    );
  }
  const definitionId = (
    (await definitionResponse.json()) as FormDefinitionDocument
  ).data.id;

  return {
    facilityId: taxonomy.facilityId,
    clinicalAreaId: taxonomy.clinicalAreaId,
    disciplineId: discipline.id,
    formDefinitionId,
    formVersionId,
    publishedVersion,
    definitionId,
    definitionName,
    code: `def-${suffix}`,
  };
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
    headers: headers(),
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
    headers: headers(),
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
      headers: headers(),
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
      headers: headers(),
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
 * returns the document plus the encounters list page URL.
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
