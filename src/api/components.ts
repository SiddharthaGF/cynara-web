import { ApiError } from '@/api/client.ts';
import {
  buildPaginatedQuery,
  jsonApiAction,
  jsonApiActionDelete,
  jsonApiGetResource,
  jsonApiGetCollection,
  jsonApiPatchResource,
  jsonApiPostResource,
  attrNumber,
  attrString,
  includedOfType,
  relatedIds,
  type JsonApiResource,
} from '@/api/json-api.ts';
import type { ComponentSummary } from '@/features/forms/types.ts';

interface ComponentDefinitionAttributes {
  code?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ComponentVersionAttributes {
  version?: string | null;
  status?: string;
  clinicalSchemaJson?: string;
  uiSchemaJson?: string | null;
  contentHash?: string | null;
  rowVersion?: number;
  createdAt?: string;
  publishedAt?: string | null;
  retiredAt?: string | null;
}

const COMPONENT_DEFINITIONS = 'componentDefinitions';
const COMPONENT_VERSIONS = 'componentVersions';

function listComponentsQuery(): string {
  return buildPaginatedQuery({
    include: ['versions'],
    pageSize: 100,
    sort: 'code',
  });
}

function versionById(
  included: JsonApiResource[],
): Map<string, JsonApiResource<ComponentVersionAttributes>> {
  const map = new Map<string, JsonApiResource<ComponentVersionAttributes>>();
  for (const item of includedOfType(included, COMPONENT_VERSIONS)) {
    map.set(item.id, item);
  }
  return map;
}

function mapSummary(
  definition: JsonApiResource<ComponentDefinitionAttributes>,
  versions: Map<string, JsonApiResource<ComponentVersionAttributes>>,
): ComponentSummary {
  const attrs = definition.attributes;
  const related = relatedIds(definition, 'versions')
    .map((id) => versions.get(id))
    .filter(
      (item): item is JsonApiResource<ComponentVersionAttributes> =>
        item !== undefined,
    );

  const draft = related.find(
    (item) => attrString(item.attributes, 'status') === 'draft',
  );
  const publishedVersions: string[] = [];
  for (const item of related) {
    if (attrString(item.attributes, 'status') === 'published') {
      const value = attrString(item.attributes, 'version');
      if (value !== null && value.length > 0) {
        publishedVersions.push(value);
      }
    }
  }
  publishedVersions.sort();

  return {
    code: attrString(attrs, 'code') ?? '',
    name: attrString(attrs, 'name') ?? '',
    createdAt: attrString(attrs, 'createdAt') ?? '',
    updatedAt: attrString(attrs, 'updatedAt') ?? '',
    draftVersionId: draft?.id ?? null,
    draftRowVersion: draft ? attrNumber(draft.attributes, 'rowVersion') : null,
    publishedVersions,
  };
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const { data, included } =
    await jsonApiGetCollection<ComponentDefinitionAttributes>(
      `/api/${COMPONENT_DEFINITIONS}?${listComponentsQuery()}`,
    );
  const versions = versionById(included);
  return data.map((definition) => mapSummary(definition, versions));
}

export interface CreateComponentDefinitionInput {
  code: string;
  name: string;
  initialClinicalSchemaJson?: string | null;
  initialUiSchemaJson?: string | null;
}

export async function createComponentDefinition(
  input: CreateComponentDefinitionInput,
): Promise<ComponentSummary> {
  await jsonApiPostResource<ComponentDefinitionAttributes>(
    COMPONENT_DEFINITIONS,
    {
      code: input.code,
      name: input.name,
      ...(input.initialClinicalSchemaJson !== undefined && {
        initialClinicalSchemaJson: input.initialClinicalSchemaJson,
      }),
      ...(input.initialUiSchemaJson !== undefined && {
        initialUiSchemaJson: input.initialUiSchemaJson,
      }),
    },
  );
  const components = await listComponents();
  const found = components.find((item) => item.code === input.code);
  if (!found) {
    throw new ApiError(
      500,
      'Create failed',
      `Component '${input.code}' could not be reloaded after create.`,
    );
  }
  return found;
}

export async function patchComponentDefinition(
  definitionId: string,
  input: { code?: string; name?: string },
): Promise<ComponentSummary> {
  await jsonApiPatchResource<ComponentDefinitionAttributes>(
    COMPONENT_DEFINITIONS,
    definitionId,
    input,
  );
  const components = await listComponents();
  const found = components.find((item) => item.code === input.code);
  if (!found) {
    throw new ApiError(
      404,
      'Not Found',
      `Component '${definitionId}' could not be reloaded after update.`,
    );
  }
  return found;
}

export async function deleteComponentDefinition(
  definitionId: string,
): Promise<void> {
  const response = await fetch(
    `/api/${COMPONENT_DEFINITIONS}/${definitionId}`,
    { method: 'DELETE' },
  );
  if (!response.ok && response.status !== 404) {
    throw new ApiError(
      response.status,
      'Delete failed',
      `Could not delete component '${definitionId}'.`,
    );
  }
}

export async function createComponentDraft(
  definitionId: string,
): Promise<void> {
  await jsonApiAction(COMPONENT_DEFINITIONS, definitionId, 'create-draft');
}

export async function softDeleteComponentDraft(
  definitionId: string,
): Promise<void> {
  await jsonApiActionDelete(
    COMPONENT_DEFINITIONS,
    definitionId,
    'soft-delete-draft',
  );
}

/*
 * There is no documented `retire` action on `componentDefinitions` in the live
 * cynara-api Swagger contract. The only `retire` route we expose is
 * `componentVersions/{id}/retire`. The helper below retires a *version* and
 * intentionally excludes the definition.
 */

export interface CreateComponentVersionInput {
  componentDefinitionId: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rowVersion: number;
}

export async function createComponentVersion(
  input: CreateComponentVersionInput,
): Promise<void> {
  await jsonApiPostResource<ComponentVersionAttributes>(
    COMPONENT_VERSIONS,
    {
      clinicalSchemaJson: input.clinicalSchemaJson,
      ...(input.uiSchemaJson !== undefined && {
        uiSchemaJson: input.uiSchemaJson,
      }),
      rowVersion: input.rowVersion,
    },
    {
      componentDefinition: {
        data: {
          type: COMPONENT_DEFINITIONS,
          id: input.componentDefinitionId,
        },
      },
    },
  );
}

export interface PatchComponentVersionInput {
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rowVersion: number;
}

export async function patchComponentVersion(
  versionId: string,
  input: PatchComponentVersionInput,
): Promise<void> {
  await jsonApiPatchResource<ComponentVersionAttributes>(
    COMPONENT_VERSIONS,
    versionId,
    {
      clinicalSchemaJson: input.clinicalSchemaJson,
      ...(input.uiSchemaJson !== undefined && {
        uiSchemaJson: input.uiSchemaJson,
      }),
      rowVersion: input.rowVersion,
    },
  );
}

export async function publishComponentVersion(
  versionId: string,
  rowVersion: number,
): Promise<void> {
  await jsonApiAction(
    COMPONENT_VERSIONS,
    versionId,
    'publish',
    new URLSearchParams({ rowVersion: String(rowVersion) }).toString(),
  );
}

export async function retireComponentVersion(
  versionId: string,
  rowVersion: number,
): Promise<void> {
  await jsonApiAction(
    COMPONENT_VERSIONS,
    versionId,
    'retire',
    new URLSearchParams({ rowVersion: String(rowVersion) }).toString(),
  );
}

export async function getComponentVersion(
  versionId: string,
): Promise<JsonApiResource<ComponentVersionAttributes>> {
  return jsonApiGetResource<ComponentVersionAttributes>(
    `/api/${COMPONENT_VERSIONS}/${versionId}`,
  );
}
