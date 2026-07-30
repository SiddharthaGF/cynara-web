import { resolveApiUrl } from '@/api/client.ts';
import {
  buildPaginatedQuery,
  jsonApiAction,
  jsonApiGet,
  jsonApiGetCollection,
  jsonApiPatchResource,
  jsonApiPatchToOneRelationship,
  jsonApiPostResource,
  attrBoolean,
  attrNumber,
  attrString,
  relatedIds,
  JSON_API_MEDIA,
  type JsonApiResource,
} from '@/api/json-api.ts';

export const DOCUMENT_DEFINITIONS = 'documentDefinitions';

export const DOCUMENT_DEFINITION_RELATIONSHIPS = [
  'formDefinition',
  'formVersion',
  'facility',
  'clinicalArea',
  'discipline',
] as const;

export type DocumentDefinitionRelationship =
  (typeof DOCUMENT_DEFINITION_RELATIONSHIPS)[number];

export type DocumentDefinitionStatus = 'active' | 'retired';

export interface DocumentDefinition {
  id: string;
  formDefinitionId: string | null;
  formVersionId: string | null;
  facilityId: string | null;
  clinicalAreaId: string | null;
  disciplineId: string | null;
  status: DocumentDefinitionStatus;
  allowsMultipleInstancesPerEncounter: boolean;
  requiresActorForCreation: boolean;
  requiresActorForCompletion: boolean;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  retiredAt: string | null;
}

interface DocumentDefinitionAttributes {
  status?: string;
  allowsMultipleInstancesPerEncounter?: boolean;
  requiresActorForCreation?: boolean;
  requiresActorForCompletion?: boolean;
  rowVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  retiredAt?: string | null;
}

function asStatus(value: string | null): DocumentDefinitionStatus {
  if (value === 'retired') {
    return 'retired';
  }
  return 'active';
}

function readNullableId(attributes: object, name: string): string | null {
  const value = (attributes as Record<string, unknown>)[name];
  if (value === null) {
    return null;
  }
  return typeof value === 'string' ? value : null;
}

function mapResource(
  resource: JsonApiResource<DocumentDefinitionAttributes>,
): DocumentDefinition {
  return {
    id: resource.id,
    formDefinitionId: relatedIds(resource, 'formDefinition')[0] ?? null,
    formVersionId: relatedIds(resource, 'formVersion')[0] ?? null,
    facilityId: relatedIds(resource, 'facility')[0] ?? null,
    clinicalAreaId: relatedIds(resource, 'clinicalArea')[0] ?? null,
    disciplineId: relatedIds(resource, 'discipline')[0] ?? null,
    status: asStatus(attrString(resource.attributes, 'status')),
    allowsMultipleInstancesPerEncounter:
      attrBoolean(resource.attributes, 'allowsMultipleInstancesPerEncounter') ??
      false,
    requiresActorForCreation:
      attrBoolean(resource.attributes, 'requiresActorForCreation') ?? false,
    requiresActorForCompletion:
      attrBoolean(resource.attributes, 'requiresActorForCompletion') ?? false,
    rowVersion: attrNumber(resource.attributes, 'rowVersion') ?? 0,
    createdAt: attrString(resource.attributes, 'createdAt') ?? '',
    updatedAt: attrString(resource.attributes, 'updatedAt') ?? '',
    retiredAt: readNullableId(resource.attributes, 'retiredAt'),
  };
}

function isRelationshipName(
  value: string,
): value is DocumentDefinitionRelationship {
  return (DOCUMENT_DEFINITION_RELATIONSHIPS as readonly string[]).includes(
    value,
  );
}

export interface ListDocumentDefinitionsOptions {
  facilityId?: string;
  clinicalAreaId?: string;
  disciplineId?: string;
  formDefinitionId?: string;
  status?: DocumentDefinitionStatus;
  include?: readonly string[];
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

export async function listDocumentDefinitions(
  options: ListDocumentDefinitionsOptions = {},
): Promise<DocumentDefinition[]> {
  const filters: Record<string, string | number | boolean | undefined> = {};
  if (options.facilityId) {
    filters['facility.id'] = options.facilityId;
  }
  if (options.clinicalAreaId) {
    filters['clinicalArea.id'] = options.clinicalAreaId;
  }
  if (options.disciplineId) {
    filters['discipline.id'] = options.disciplineId;
  }
  if (options.formDefinitionId) {
    filters['formDefinition.id'] = options.formDefinitionId;
  }
  if (options.status) {
    filters.status = options.status;
  }
  const query = buildPaginatedQuery({
    include: options.include,
    filters,
    sort: options.sort,
    pageNumber: options.pageNumber,
    pageSize: options.pageSize,
  });
  const { data } = await jsonApiGetCollection<DocumentDefinitionAttributes>(
    `/api/${DOCUMENT_DEFINITIONS}?${query}`,
  );
  return data.map((resource) => mapResource(resource));
}

export async function getDocumentDefinition(
  id: string,
  options: { include?: readonly string[] } = {},
): Promise<DocumentDefinition> {
  const include = options.include ?? [...DOCUMENT_DEFINITION_RELATIONSHIPS];
  const query = buildPaginatedQuery({ include });
  const document = await jsonApiGet(
    `/api/${DOCUMENT_DEFINITIONS}/${id}?${query}`,
  );
  const resource = selectSingle(document.data, id);
  return mapResource(resource);
}

export interface DocumentDefinitionRelationshipsInput {
  formDefinitionId: string;
  formVersionId: string;
  facilityId: string;
  clinicalAreaId: string;
  disciplineId: string;
}

export interface CreateDocumentDefinitionInput {
  allowsMultipleInstancesPerEncounter?: boolean;
  requiresActorForCreation?: boolean;
  requiresActorForCompletion?: boolean;
  relationships: DocumentDefinitionRelationshipsInput;
}

export async function createDocumentDefinition(
  input: CreateDocumentDefinitionInput,
): Promise<DocumentDefinition> {
  const attributes: Record<string, unknown> = {
    ...(input.allowsMultipleInstancesPerEncounter !== undefined && {
      allowsMultipleInstancesPerEncounter:
        input.allowsMultipleInstancesPerEncounter,
    }),
    ...(input.requiresActorForCreation !== undefined && {
      requiresActorForCreation: input.requiresActorForCreation,
    }),
    ...(input.requiresActorForCompletion !== undefined && {
      requiresActorForCompletion: input.requiresActorForCompletion,
    }),
  };
  const relationships = {
    formDefinition: {
      data: {
        type: 'formDefinitions',
        id: input.relationships.formDefinitionId,
      },
    },
    formVersion: {
      data: { type: 'formVersions', id: input.relationships.formVersionId },
    },
    facility: {
      data: { type: 'facilities', id: input.relationships.facilityId },
    },
    clinicalArea: {
      data: { type: 'clinicalAreas', id: input.relationships.clinicalAreaId },
    },
    discipline: {
      data: { type: 'disciplines', id: input.relationships.disciplineId },
    },
  };
  const resource = await jsonApiPostResource<DocumentDefinitionAttributes>(
    DOCUMENT_DEFINITIONS,
    attributes,
    relationships,
  );
  return mapResource(resource);
}

export interface PatchDocumentDefinitionAttributesInput {
  allowsMultipleInstancesPerEncounter?: boolean;
  requiresActorForCreation?: boolean;
  requiresActorForCompletion?: boolean;
  rowVersion: number;
}

export interface PatchDocumentDefinitionInput {
  attributes: PatchDocumentDefinitionAttributesInput;
  relationships?: Partial<DocumentDefinitionRelationshipsInput>;
}

const RELATIONSHIP_TYPE: Record<DocumentDefinitionRelationship, string> = {
  formDefinition: 'formDefinitions',
  formVersion: 'formVersions',
  facility: 'facilities',
  clinicalArea: 'clinicalAreas',
  discipline: 'disciplines',
};

export async function patchDocumentDefinition(
  id: string,
  input: PatchDocumentDefinitionInput,
): Promise<DocumentDefinition> {
  const relationships: Record<string, unknown> = {};
  if (input.relationships) {
    if (input.relationships.formDefinitionId !== undefined) {
      relationships.formDefinition = {
        data: {
          type: RELATIONSHIP_TYPE.formDefinition,
          id: input.relationships.formDefinitionId,
        },
      };
    }
    if (input.relationships.formVersionId !== undefined) {
      relationships.formVersion = {
        data: {
          type: RELATIONSHIP_TYPE.formVersion,
          id: input.relationships.formVersionId,
        },
      };
    }
    if (input.relationships.facilityId !== undefined) {
      relationships.facility = {
        data: {
          type: RELATIONSHIP_TYPE.facility,
          id: input.relationships.facilityId,
        },
      };
    }
    if (input.relationships.clinicalAreaId !== undefined) {
      relationships.clinicalArea = {
        data: {
          type: RELATIONSHIP_TYPE.clinicalArea,
          id: input.relationships.clinicalAreaId,
        },
      };
    }
    if (input.relationships.disciplineId !== undefined) {
      relationships.discipline = {
        data: {
          type: RELATIONSHIP_TYPE.discipline,
          id: input.relationships.disciplineId,
        },
      };
    }
  }
  const attributes: Record<string, unknown> = {
    rowVersion: input.attributes.rowVersion,
  };
  if (input.attributes.allowsMultipleInstancesPerEncounter !== undefined) {
    attributes.allowsMultipleInstancesPerEncounter =
      input.attributes.allowsMultipleInstancesPerEncounter;
  }
  if (input.attributes.requiresActorForCreation !== undefined) {
    attributes.requiresActorForCreation =
      input.attributes.requiresActorForCreation;
  }
  if (input.attributes.requiresActorForCompletion !== undefined) {
    attributes.requiresActorForCompletion =
      input.attributes.requiresActorForCompletion;
  }
  const resource = await jsonApiPatchResource<DocumentDefinitionAttributes>(
    DOCUMENT_DEFINITIONS,
    id,
    attributes,
    Object.keys(relationships).length > 0 ? relationships : undefined,
  );
  return mapResource(resource);
}

export async function patchDocumentDefinitionRelationship(
  id: string,
  relationship: string,
  relatedId: string | null,
): Promise<DocumentDefinition> {
  if (!isRelationshipName(relationship)) {
    throw new Error(
      `Unknown document-definition relationship: ${relationship}.`,
    );
  }
  const relatedType = RELATIONSHIP_TYPE[relationship];
  const resource = await jsonApiPatchToOneRelationship(
    DOCUMENT_DEFINITIONS,
    id,
    relationship,
    relatedType,
    relatedId,
  );
  return mapResource(resource);
}

export async function deleteDocumentDefinition(
  id: string,
  options: { rowVersion?: number } = {},
): Promise<void> {
  const base = `/api/${DOCUMENT_DEFINITIONS}/${id}`;
  const path =
    options.rowVersion === undefined
      ? base
      : `${base}?${new URLSearchParams({ rowVersion: String(options.rowVersion) }).toString()}`;
  const response = await fetch(resolveApiUrl(path), {
    method: 'DELETE',
    headers: new Headers({ Accept: JSON_API_MEDIA }),
  });
  if (!response.ok && response.status !== 404) {
    const bodyText = await response.text();
    throw new Error(
      `Failed to delete documentDefinition '${id}': ${response.status} ${bodyText}`,
    );
  }
}

export async function retireDocumentDefinition(
  id: string,
  rowVersion: number,
): Promise<DocumentDefinition> {
  const query = new URLSearchParams({
    rowVersion: String(rowVersion),
  }).toString();
  const resource = await jsonApiAction<DocumentDefinitionAttributes>(
    DOCUMENT_DEFINITIONS,
    id,
    'retire',
    query,
  );
  return mapResource(resource);
}

function selectSingle(
  data: JsonApiResource | JsonApiResource[] | undefined,
  fallbackId: string,
): JsonApiResource<DocumentDefinitionAttributes> {
  if (Array.isArray(data)) {
    const [candidate] = data;
    if (!candidate) {
      throw new Error(`DocumentDefinition '${fallbackId}' was not found.`);
    }
    return candidate;
  }
  if (!data) {
    throw new Error(`DocumentDefinition '${fallbackId}' was not found.`);
  }
  return data;
}
