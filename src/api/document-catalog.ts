import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getDocumentDefinitionCollection as sdkGetDocumentDefinitionCollection,
  patchDocumentDefinition as sdkPatchDocumentDefinition,
  postApiDocumentDefinitionsByIdRetire as sdkRetireDocumentDefinition,
  postDocumentDefinition as sdkPostDocumentDefinition,
  type DataInDocumentDefinitionResponse,
  type DocumentDefinitionStatus,
} from '@/api/generated';
import {
  buildPaginatedQuery,
  fetchAllCollectionPages,
  relationshipId,
} from '@/api/json-api-utils.ts';

const DOCUMENT_DEFINITIONS = 'documentDefinitions';

/** Page size requested from the catalog; large enough for one round trip. */
const DEFINITIONS_PAGE_SIZE = 100;

/**
 * Flat read model for a clinical document catalog entry. Resolved from the
 * JSON:API resource document with relationship ids promoted onto the record
 * so screens never navigate JSON:API envelopes directly.
 */
export interface DocumentDefinitionDto {
  id: string;
  code: string;
  name: string;
  status: DocumentDefinitionStatus;
  allowsMultipleInstancesPerEncounter: boolean;
  requiresActorForCreation: boolean;
  requiresActorForCompletion: boolean;
  formDefinitionId: string;
  formVersionId: string;
  facilityId: string;
  clinicalAreaId: string;
  disciplineId: string;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  retiredAt: string | null;
}

export type DocumentCatalogStatus = DocumentDefinitionStatus;

export interface ListDocumentDefinitionsParams {
  includeRetired?: boolean;
}

export interface CreateDocumentDefinitionInput {
  code: string;
  name: string;
  formDefinitionId: string;
  formVersionId: string;
  facilityId: string;
  clinicalAreaId: string;
  disciplineId: string;
  allowsMultipleInstancesPerEncounter: boolean;
  requiresActorForCreation: boolean;
  requiresActorForCompletion: boolean;
}

export interface UpdateDocumentDefinitionInput {
  name: string;
  allowsMultipleInstancesPerEncounter: boolean;
  requiresActorForCreation: boolean;
  requiresActorForCompletion: boolean;
  rowVersion: number;
}

type DocumentDefinitionResource = Pick<
  DataInDocumentDefinitionResponse,
  'id' | 'attributes' | 'relationships'
>;

function documentDefinitionQuery(
  params: ListDocumentDefinitionsParams = {},
): Record<string, string> {
  const query = buildPaginatedQuery({
    include: [
      'formDefinition',
      'formVersion',
      'facility',
      'clinicalArea',
      'discipline',
    ],
    sort: 'code',
    pageSize: DEFINITIONS_PAGE_SIZE,
  });
  if (params.includeRetired) {
    query.includeRetired = 'true';
  }
  return query;
}

function mapDocumentDefinition(
  resource: DocumentDefinitionResource,
): DocumentDefinitionDto {
  const { attributes, relationships } = resource;
  return {
    id: resource.id,
    code: attributes?.code ?? '',
    name: attributes?.name ?? '',
    status: attributes?.status ?? 'active',
    allowsMultipleInstancesPerEncounter:
      attributes?.allowsMultipleInstancesPerEncounter ?? false,
    requiresActorForCreation: attributes?.requiresActorForCreation ?? false,
    requiresActorForCompletion: attributes?.requiresActorForCompletion ?? false,
    formDefinitionId: relationshipId(relationships?.formDefinition) ?? '',
    formVersionId: relationshipId(relationships?.formVersion) ?? '',
    facilityId: relationshipId(relationships?.facility) ?? '',
    clinicalAreaId: relationshipId(relationships?.clinicalArea) ?? '',
    disciplineId: relationshipId(relationships?.discipline) ?? '',
    rowVersion: attributes?.rowVersion ?? 0,
    createdAt: attributes?.createdAt ?? '',
    updatedAt: attributes?.updatedAt ?? '',
    retiredAt: attributes?.retiredAt ?? null,
  };
}

export async function listDocumentDefinitions(
  params: ListDocumentDefinitionsParams = {},
): Promise<DocumentDefinitionDto[]> {
  const collection = await fetchAllCollectionPages(
    documentDefinitionQuery(params),
    DEFINITIONS_PAGE_SIZE,
    async (query) => {
      const { data } = await sdkGetDocumentDefinitionCollection({
        headers: contractHeaders(),
        query: { query },
      });
      return data;
    },
  );
  return collection.data.map(mapDocumentDefinition);
}

/**
 * CYN-55: the generated `data.type` carries the OpenAPI discriminator value
 * instead of the wire resource type; the narrow cast bridges the mismatch.
 */
export async function createDocumentDefinition(
  input: CreateDocumentDefinitionInput,
): Promise<DocumentDefinitionDto> {
  const { data } = await sdkPostDocumentDefinition({
    headers: contractHeaders(),
    body: {
      data: {
        type: DOCUMENT_DEFINITIONS,
        attributes: {
          code: input.code,
          name: input.name,
          allowsMultipleInstancesPerEncounter:
            input.allowsMultipleInstancesPerEncounter,
          requiresActorForCreation: input.requiresActorForCreation,
          requiresActorForCompletion: input.requiresActorForCompletion,
        },
        relationships: {
          formDefinition: {
            data: { type: 'formDefinitions', id: input.formDefinitionId },
          },
          formVersion: {
            data: { type: 'formVersions', id: input.formVersionId },
          },
          facility: {
            data: { type: 'facilities', id: input.facilityId },
          },
          clinicalArea: {
            data: { type: 'clinicalAreas', id: input.clinicalAreaId },
          },
          discipline: {
            data: { type: 'disciplines', id: input.disciplineId },
          },
        },
      },
    } as never,
  });
  const createdId = data?.data?.id;
  if (!createdId) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Created document definition did not return an identifier.',
    );
  }
  return {
    ...input,
    id: createdId,
    status: 'active',
    rowVersion: 0,
    createdAt: '',
    updatedAt: '',
    retiredAt: null,
  };
}

export async function patchDocumentDefinition(
  id: string,
  input: UpdateDocumentDefinitionInput,
): Promise<DocumentDefinitionDto> {
  const { data } = await sdkPatchDocumentDefinition({
    path: { id },
    headers: contractHeaders(),
    body: {
      data: {
        id,
        type: DOCUMENT_DEFINITIONS,
        attributes: {
          name: input.name,
          allowsMultipleInstancesPerEncounter:
            input.allowsMultipleInstancesPerEncounter,
          requiresActorForCreation: input.requiresActorForCreation,
          requiresActorForCompletion: input.requiresActorForCompletion,
          rowVersion: input.rowVersion,
        },
      },
    } as never,
  });
  if (!data?.data) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Document definition update did not return the updated resource.',
    );
  }
  return mapDocumentDefinition(data.data);
}

export async function retireDocumentDefinition(
  id: string,
  rowVersion: number,
): Promise<void> {
  await sdkRetireDocumentDefinition({
    path: { id },
    headers: contractHeaders(),
    query: { rowVersion },
  });
}

export function isForbiddenDocumentCatalogError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

export function isStaleDocumentCatalogError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function isDuplicateDocumentCodeError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status !== 409 && error.status !== 422 && error.status !== 400) {
    return false;
  }
  const detail = `${error.title ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    detail.includes('code') &&
    (detail.includes('unique') ||
      detail.includes('already exists') ||
      detail.includes('duplicate') ||
      detail.includes('in use'))
  );
}

export type { GetDocumentDefinitionCollectionData } from '@/api/generated';
