import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getFormDefinition as sdkGetFormDefinition,
  getFormDefinitionCollection as sdkGetFormDefinitionCollection,
  getFormVersion as sdkGetFormVersion,
  patchFormVersion as sdkPatchFormVersion,
  postFormDefinition as sdkPostFormDefinition,
  type AttributesInUpdateFormVersionRequest,
  type DataInFormDefinitionResponse,
  type DataInFormVersionResponse,
  type FormVersionStatus,
  type ResourceInResponse,
} from '@/api/generated';
import {
  buildPaginatedQuery,
  includedResources,
  relationshipId,
  relationshipIds,
} from '@/api/json-api-utils.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

const FORM_DEFINITIONS = 'formDefinitions';
const FORM_VERSIONS = 'formVersions';

type FormDefinitionResource = Pick<
  DataInFormDefinitionResponse,
  'id' | 'attributes' | 'relationships'
>;
type FormVersionResource = Pick<
  DataInFormVersionResponse,
  'id' | 'attributes' | 'relationships'
>;

function listFormsQuery(): Record<string, string> {
  return buildPaginatedQuery({
    include: ['versions'],
    pageSize: 100,
    sort: 'code',
  });
}

function isEditableStatus(
  status: FormVersionStatus | null | undefined,
): boolean {
  return status === 'draft' || status === 'review';
}

function versionById(
  included: readonly ResourceInResponse[],
): Map<string, FormVersionResource> {
  const map = new Map<string, FormVersionResource>();
  for (const item of includedResources<DataInFormVersionResponse>(
    included,
    FORM_VERSIONS,
  )) {
    map.set(item.id, item);
  }
  return map;
}

function requireDefinition(
  data: FormDefinitionResource | FormDefinitionResource[],
): FormDefinitionResource {
  if (Array.isArray(data)) {
    const [first] = data;
    if (!first) {
      throw new ApiError(404, 'Not Found', 'Form definition was not found.');
    }
    return first;
  }
  return data;
}

function mapSummary(
  definition: FormDefinitionResource,
  versions: Map<string, FormVersionResource>,
): FormSummary {
  const attrs = definition.attributes;
  const related = relationshipIds(definition.relationships?.versions)
    .map((id) => versions.get(id))
    .filter((item): item is FormVersionResource => item !== undefined);

  const editable = related.find((item) =>
    isEditableStatus(item.attributes?.status),
  );
  const publishedVersions: string[] = [];
  for (const item of related) {
    if (item.attributes?.status === 'published') {
      const value = item.attributes?.version;
      if (value !== null && value !== undefined && value.length > 0) {
        publishedVersions.push(value);
      }
    }
  }
  publishedVersions.sort();

  return {
    code: attrs?.code ?? '',
    name: attrs?.name ?? '',
    createdAt: attrs?.createdAt ?? '',
    updatedAt: attrs?.updatedAt ?? '',
    editableVersionId: editable?.id ?? null,
    editableStatus: editable ? (editable.attributes?.status ?? null) : null,
    editableRowVersion: editable
      ? (editable.attributes?.rowVersion ?? null)
      : null,
    publishedVersions,
  };
}

function mapVersion(version: FormVersionResource, code: string): FormVersion {
  const attrs = version.attributes;
  return {
    id: version.id,
    code,
    version: attrs?.version ?? null,
    status: attrs?.status ?? '',
    clinicalSchemaJson: attrs?.clinicalSchemaJson ?? '',
    uiSchemaJson: attrs?.uiSchemaJson ?? null,
    rulesSchemaJson: attrs?.rulesSchemaJson ?? null,
    contentHash: attrs?.contentHash ?? null,
    dependencyMetadataJson: attrs?.dependencyMetadataJson ?? null,
    rowVersion: attrs?.rowVersion ?? 0,
    createdAt: attrs?.createdAt ?? '',
    submittedForReviewAt: attrs?.submittedForReviewAt ?? null,
    publishedAt: attrs?.publishedAt ?? null,
    retiredAt: attrs?.retiredAt ?? null,
  };
}

async function fetchDefinitionDocument(id: string): Promise<{
  definition: FormDefinitionResource;
  versions: Map<string, FormVersionResource>;
}> {
  const { data } = await sdkGetFormDefinition({
    path: { id },
    headers: contractHeaders(),
    query: { query: buildPaginatedQuery({ include: ['versions'] }) },
  });
  const definition = requireDefinition(data.data);
  return {
    definition,
    versions: versionById(data.included ?? []),
  };
}

async function getDefinitionByCode(code: string): Promise<{
  definition: FormDefinitionResource;
  versions: Map<string, FormVersionResource>;
}> {
  const { data } = await sdkGetFormDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listFormsQuery() },
  });
  const definition = data.data.find((item) => item.attributes?.code === code);
  if (!definition) {
    throw new ApiError(404, 'Not Found', `Form '${code}' was not found.`);
  }
  return {
    definition,
    versions: versionById(data.included ?? []),
  };
}

export async function getFormVersion(
  versionId: string,
  expectedCode?: string,
): Promise<FormVersion> {
  const { data } = await sdkGetFormVersion({
    path: { id: versionId },
    headers: contractHeaders(),
    query: { query: buildPaginatedQuery({ include: ['formDefinition'] }) },
  });
  const version: FormVersionResource = data.data;
  const definitions = includedResources<DataInFormDefinitionResponse>(
    data.included ?? [],
    FORM_DEFINITIONS,
  );
  const relatedDefinitionId = relationshipId(
    version.relationships?.formDefinition,
  );
  const definition =
    definitions.find((item) => item.id === relatedDefinitionId) ??
    definitions[0];
  const code = definition?.attributes?.code ?? '';
  if (expectedCode && code !== expectedCode) {
    throw new ApiError(
      404,
      'Not Found',
      `Form version '${versionId}' does not belong to '${expectedCode}'.`,
    );
  }
  if (!isEditableStatus(version.attributes?.status)) {
    throw new ApiError(
      409,
      'Conflict',
      `Form version '${versionId}' is not an editable draft.`,
    );
  }
  return mapVersion(version, code || (expectedCode ?? ''));
}

export async function listForms(): Promise<FormSummary[]> {
  const { data } = await sdkGetFormDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listFormsQuery() },
  });
  const versions = versionById(data.included ?? []);
  return data.data.map((definition) => mapSummary(definition, versions));
}

export async function createForm(input: {
  code: string;
  name: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
}): Promise<FormSummary> {
  // CYN-55: generated `data.type` is the document discriminator, but the API expects the resource type on the wire; the narrow cast bridges the mismatch.
  const { data } = await sdkPostFormDefinition({
    headers: contractHeaders(),
    body: {
      data: {
        type: FORM_DEFINITIONS,
        attributes: {
          code: input.code,
          name: input.name,
          initialClinicalSchemaJson: input.clinicalSchemaJson,
          ...(input.uiSchemaJson
            ? { initialUiSchemaJson: input.uiSchemaJson }
            : {}),
          ...(input.rulesSchemaJson
            ? { initialRulesSchemaJson: input.rulesSchemaJson }
            : {}),
        },
      },
    } as never,
  });
  const createdId = data?.data?.id;
  if (!createdId) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Created form definition did not return an identifier.',
    );
  }
  const { definition, versions } = await fetchDefinitionDocument(createdId);
  return mapSummary(definition, versions);
}

async function patchFormVersion(
  versionId: string,
  input: {
    clinicalSchemaJson: string;
    uiSchemaJson: string | null;
    rulesSchemaJson: string | null;
    rowVersion: number;
  },
): Promise<FormVersion> {
  // CYN-55: same `data.type` discriminator mismatch as `createForm`.
  const { data } = await sdkPatchFormVersion({
    path: { id: versionId },
    headers: contractHeaders(),
    body: {
      data: {
        id: versionId,
        type: FORM_VERSIONS,
        attributes: {
          clinicalSchemaJson: input.clinicalSchemaJson,
          uiSchemaJson: input.uiSchemaJson,
          rulesSchemaJson: input.rulesSchemaJson,
          rowVersion: input.rowVersion,
        } satisfies Omit<
          AttributesInUpdateFormVersionRequest,
          'openapi:discriminator'
        >,
      },
    } as never,
  });
  if (!data) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Form version update did not return the updated resource.',
    );
  }
  return mapVersion(data.data, '');
}

export async function getFormDraft(code: string): Promise<FormVersion> {
  const { definition, versions } = await getDefinitionByCode(code);
  const related = relationshipIds(definition.relationships?.versions)
    .map((id) => versions.get(id))
    .filter((item): item is FormVersionResource => item !== undefined);
  const editable = related.find((item) =>
    isEditableStatus(item.attributes?.status),
  );
  if (!editable) {
    throw new ApiError(
      404,
      'Not Found',
      `Form '${code}' has no editable draft.`,
    );
  }
  return mapVersion(editable, definition.attributes?.code ?? code);
}

export async function updateFormDraft(
  code: string,
  input: {
    clinicalSchemaJson: string;
    uiSchemaJson: string | null;
    rulesSchemaJson: string | null;
    rowVersion: number;
  },
): Promise<FormVersion> {
  const draft = await getFormDraft(code);
  const updated = await patchFormVersion(draft.id, input);
  return { ...updated, code };
}

export async function resolveFormDefinitionId(code: string): Promise<string> {
  const { definition } = await getDefinitionByCode(code);
  return definition.id;
}

export interface PublishedFormVersionOption {
  id: string;
  version: string;
}

export interface FormVersionPickerOption {
  formDefinitionId: string;
  code: string;
  name: string;
  publishedVersions: PublishedFormVersionOption[];
}

/**
 * Form definitions with their published versions, used by the clinical
 * document catalog form selector. Only published versions can back a catalog
 * entry, so draft/review versions are omitted.
 */
export async function listFormVersionPickerOptions(): Promise<
  FormVersionPickerOption[]
> {
  const { data } = await sdkGetFormDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listFormsQuery() },
  });
  const versions = versionById(data.included ?? []);
  return data.data.map((definition) => {
    const related = relationshipIds(definition.relationships?.versions)
      .map((id) => versions.get(id))
      .filter((item): item is FormVersionResource => item !== undefined);
    const publishedVersions = related
      .flatMap((item) =>
        item.attributes?.status === 'published'
          ? [
              {
                id: item.id,
                version: item.attributes?.version ?? item.id,
              },
            ]
          : [],
      )
      // The mapped array is freshly created, so an in-place sort is safe.
      // eslint-disable-next-line unicorn/no-array-sort
      .sort((a, b) => a.version.localeCompare(b.version));
    return {
      formDefinitionId: definition.id,
      code: definition.attributes?.code ?? '',
      name: definition.attributes?.name ?? '',
      publishedVersions,
    };
  });
}
