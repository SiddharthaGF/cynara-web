import { ApiError } from '@/api/client.ts';
import {
  buildPaginatedQuery,
  jsonApiAction,
  jsonApiActionDelete,
  jsonApiGet,
  jsonApiGetCollection,
  jsonApiGetResource,
  jsonApiPatchResource,
  jsonApiPostResource,
  attrNumber,
  attrString,
  includedOfType,
  relatedIds,
  type JsonApiResource,
  type PaginatedQueryOptions,
} from '@/api/json-api.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

interface FormDefinitionAttributes {
  code?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FormVersionAttributes {
  version?: string | null;
  status?: string;
  clinicalSchemaJson?: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
  contentHash?: string | null;
  dependencyMetadataJson?: string | null;
  rowVersion?: number;
  createdAt?: string;
  submittedForReviewAt?: string | null;
  publishedAt?: string | null;
  retiredAt?: string | null;
}

const FORM_DEFINITIONS = 'formDefinitions';
const FORM_VERSIONS = 'formVersions';

function listFormsQuery(): string {
  return buildPaginatedQuery({
    include: ['versions'],
    pageSize: 100,
    sort: 'code',
  });
}

function isEditableStatus(status: string | null): boolean {
  return status === 'draft' || status === 'review';
}

function versionById(
  included: JsonApiResource[],
): Map<string, JsonApiResource<FormVersionAttributes>> {
  const map = new Map<string, JsonApiResource<FormVersionAttributes>>();
  for (const item of includedOfType(included, FORM_VERSIONS)) {
    map.set(item.id, item);
  }
  return map;
}

function requireDefinition(
  data: JsonApiResource<FormDefinitionAttributes> | JsonApiResource[],
): JsonApiResource<FormDefinitionAttributes> {
  if (Array.isArray(data)) {
    const first = data[0] as
      | JsonApiResource<FormDefinitionAttributes>
      | undefined;
    if (!first) {
      throw new ApiError(404, 'Not Found', 'Form definition was not found.');
    }
    return first;
  }
  return data;
}

function mapSummary(
  definition: JsonApiResource<FormDefinitionAttributes>,
  versions: Map<string, JsonApiResource<FormVersionAttributes>>,
): FormSummary {
  const attrs = definition.attributes;
  const related = relatedIds(definition, 'versions')
    .map((id) => versions.get(id))
    .filter(
      (item): item is JsonApiResource<FormVersionAttributes> =>
        item !== undefined,
    );

  const editable = related.find((item) =>
    isEditableStatus(attrString(item.attributes, 'status')),
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
    editableVersionId: editable?.id ?? null,
    editableStatus: editable ? attrString(editable.attributes, 'status') : null,
    editableRowVersion: editable
      ? attrNumber(editable.attributes, 'rowVersion')
      : null,
    publishedVersions,
  };
}

function mapVersion(
  version: JsonApiResource<FormVersionAttributes>,
  code: string,
): FormVersion {
  const attrs = version.attributes;
  return {
    id: version.id,
    code,
    version: attrString(attrs, 'version'),
    status: attrString(attrs, 'status') ?? '',
    clinicalSchemaJson: attrString(attrs, 'clinicalSchemaJson') ?? '',
    uiSchemaJson: attrString(attrs, 'uiSchemaJson'),
    rulesSchemaJson: attrString(attrs, 'rulesSchemaJson'),
    contentHash: attrString(attrs, 'contentHash'),
    dependencyMetadataJson: attrString(attrs, 'dependencyMetadataJson'),
    rowVersion: attrNumber(attrs, 'rowVersion') ?? 0,
    createdAt: attrString(attrs, 'createdAt') ?? '',
    submittedForReviewAt: attrString(attrs, 'submittedForReviewAt'),
    publishedAt: attrString(attrs, 'publishedAt'),
    retiredAt: attrString(attrs, 'retiredAt'),
  };
}

async function fetchDefinitionDocument(path: string): Promise<{
  definition: JsonApiResource<FormDefinitionAttributes>;
  versions: Map<string, JsonApiResource<FormVersionAttributes>>;
}> {
  const document = await jsonApiGet(path);
  const definition = requireDefinition(document.data);
  return {
    definition,
    versions: versionById(document.included ?? []),
  };
}

async function getDefinitionByCode(code: string): Promise<{
  definition: JsonApiResource<FormDefinitionAttributes>;
  versions: Map<string, JsonApiResource<FormVersionAttributes>>;
}> {
  const { data, included } =
    await jsonApiGetCollection<FormDefinitionAttributes>(
      `/api/${FORM_DEFINITIONS}?${listFormsQuery()}`,
    );
  const definition = data.find(
    (item) => attrString(item.attributes, 'code') === code,
  );
  if (!definition) {
    throw new ApiError(404, 'Not Found', `Form '${code}' was not found.`);
  }
  return {
    definition,
    versions: versionById(included),
  };
}

export async function getFormVersion(
  versionId: string,
  expectedCode?: string,
): Promise<FormVersion> {
  const query = buildPaginatedQuery({ include: ['formDefinition'] });
  const document = await jsonApiGet(
    `/api/${FORM_VERSIONS}/${versionId}?${query}`,
  );
  if (Array.isArray(document.data) || !document.data) {
    throw new ApiError(
      404,
      'Not Found',
      `Form version '${versionId}' was not found.`,
    );
  }
  const version = document.data as JsonApiResource<FormVersionAttributes>;
  const definitions = includedOfType(document.included ?? [], FORM_DEFINITIONS);
  const [relatedDefinitionId] = relatedIds(version, 'formDefinition');
  const definition =
    definitions.find((item) => item.id === relatedDefinitionId) ??
    definitions[0];
  const code = definition
    ? (attrString(definition.attributes, 'code') ?? '')
    : '';
  if (expectedCode && code !== expectedCode) {
    throw new ApiError(
      404,
      'Not Found',
      `Form version '${versionId}' does not belong to '${expectedCode}'.`,
    );
  }
  if (!isEditableStatus(attrString(version.attributes, 'status'))) {
    throw new ApiError(
      409,
      'Conflict',
      `Form version '${versionId}' is not an editable draft.`,
    );
  }
  return mapVersion(version, code || (expectedCode ?? ''));
}

export async function listForms(): Promise<FormSummary[]> {
  const { data, included } =
    await jsonApiGetCollection<FormDefinitionAttributes>(
      `/api/${FORM_DEFINITIONS}?${listFormsQuery()}`,
    );
  const versions = versionById(included);
  return data.map((definition) => mapSummary(definition, versions));
}

export interface ListFormsPaginatedOptions {
  status?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

export async function listFormsPaginated(
  options: ListFormsPaginatedOptions = {},
): Promise<FormSummary[]> {
  const query = buildPaginatedQuery({
    include: ['versions'],
    filters: options.status ? { status: options.status } : {},
    sort: options.sort ?? '-updatedAt',
    pageNumber: options.pageNumber,
    pageSize: options.pageSize ?? 20,
  });
  const { data, included } =
    await jsonApiGetCollection<FormDefinitionAttributes>(
      `/api/${FORM_DEFINITIONS}?${query}`,
    );
  const versions = versionById(included);
  return data.map((definition) => mapSummary(definition, versions));
}

export async function createForm(input: {
  code: string;
  name: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
}): Promise<FormSummary> {
  const created = await jsonApiPostResource<FormDefinitionAttributes>(
    FORM_DEFINITIONS,
    {
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
  );
  const { definition, versions } = await fetchDefinitionDocument(
    `/api/${FORM_DEFINITIONS}/${created.id}?include=versions`,
  );
  return mapSummary(definition, versions);
}

export async function getFormDefinitionById(
  definitionId: string,
): Promise<FormSummary> {
  const { definition, versions } = await fetchDefinitionDocument(
    `/api/${FORM_DEFINITIONS}/${definitionId}?include=versions`,
  );
  return mapSummary(definition, versions);
}

export async function patchFormDefinition(
  definitionId: string,
  input: { code?: string; name?: string },
): Promise<FormSummary> {
  await jsonApiPatchResource<FormDefinitionAttributes>(
    FORM_DEFINITIONS,
    definitionId,
    input,
  );
  return getFormDefinitionById(definitionId);
}

export async function createDraft(definitionId: string): Promise<FormVersion> {
  const resource = await jsonApiAction<FormVersionAttributes>(
    FORM_DEFINITIONS,
    definitionId,
    'create-draft',
  );
  return mapVersion(resource, '');
}

export async function softDeleteDraft(
  definitionId: string,
  reason: string,
): Promise<void> {
  await jsonApiActionDelete(
    FORM_DEFINITIONS,
    definitionId,
    'soft-delete-draft',
    new URLSearchParams({ reason }).toString(),
  );
}

/**
 * NOTE: `POST /api/formDefinitions/{id}/retire` is referenced in the original
 * task brief but is NOT documented in the live cynara-api Swagger contract. We
 * keep the public signature so future wiring is a one-liner once the backend
 * lands the action. For now, calling it throws an explanatory error.
 */
export async function retireFormDefinition(
  definitionId: string,
  rowVersion: number,
): Promise<FormSummary> {
  const search = new URLSearchParams({ rowVersion: String(rowVersion) });
  try {
    const resource = await jsonApiAction<FormDefinitionAttributes>(
      FORM_DEFINITIONS,
      definitionId,
      'retire',
      search.toString(),
    );
    return mapSummary(resource, new Map());
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(
        404,
        'Not Implemented',
        `retire action on formDefinitions/${definitionId} is not available in the live API.`,
      );
    }
    throw error;
  }
}

export async function listFormVersions(
  options: {
    formDefinitionId?: string;
    include?: string;
  } = {},
): Promise<FormVersion[]> {
  const include = options.include ?? 'formDefinition';
  const query = buildPaginatedQuery({
    include: include.split(',').filter(Boolean),
    filters: options.formDefinitionId
      ? { 'formDefinition.id': options.formDefinitionId }
      : {},
    pageSize: 100,
    sort: '-createdAt',
  });
  const { data } = await jsonApiGetCollection<FormVersionAttributes>(
    `/api/${FORM_VERSIONS}?${query}`,
  );
  return data.map((version) => mapVersion(version, ''));
}

export async function getFormVersionById(
  versionId: string,
): Promise<FormVersion> {
  const resource = await jsonApiGetResource<FormVersionAttributes>(
    `/api/${FORM_VERSIONS}/${versionId}?include=formDefinition`,
  );
  return mapVersion(resource, '');
}

export async function createFormVersion(input: {
  formDefinitionId: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
  rowVersion: number;
}): Promise<FormVersion> {
  const resource = await jsonApiPostResource<FormVersionAttributes>(
    FORM_VERSIONS,
    {
      clinicalSchemaJson: input.clinicalSchemaJson,
      ...(input.uiSchemaJson !== undefined && {
        uiSchemaJson: input.uiSchemaJson,
      }),
      ...(input.rulesSchemaJson !== undefined && {
        rulesSchemaJson: input.rulesSchemaJson,
      }),
      rowVersion: input.rowVersion,
    },
    {
      formDefinition: {
        data: { type: FORM_DEFINITIONS, id: input.formDefinitionId },
      },
    },
  );
  return mapVersion(resource, '');
}

export async function patchFormVersion(
  versionId: string,
  input: {
    clinicalSchemaJson: string;
    uiSchemaJson: string | null;
    rulesSchemaJson: string | null;
    rowVersion: number;
  },
): Promise<FormVersion> {
  const resource = await jsonApiPatchResource<FormVersionAttributes>(
    FORM_VERSIONS,
    versionId,
    {
      clinicalSchemaJson: input.clinicalSchemaJson,
      uiSchemaJson: input.uiSchemaJson,
      rulesSchemaJson: input.rulesSchemaJson,
      rowVersion: input.rowVersion,
    },
  );
  return mapVersion(resource, '');
}

async function runVersionWorkflow(
  versionId: string,
  action: string,
  query?: string,
  body?: { attributes?: Record<string, unknown> },
): Promise<FormVersion> {
  const resource = await jsonApiAction<FormVersionAttributes>(
    FORM_VERSIONS,
    versionId,
    action,
    query,
    body,
  );
  return mapVersion(resource, '');
}

export async function submitFormVersionForReview(
  versionId: string,
  rowVersion: number,
): Promise<FormVersion> {
  return runVersionWorkflow(
    versionId,
    'submit-review',
    new URLSearchParams({ rowVersion: String(rowVersion) }).toString(),
  );
}

export async function withdrawFormVersionReview(
  versionId: string,
  rowVersion: number,
): Promise<FormVersion> {
  return runVersionWorkflow(
    versionId,
    'withdraw-review',
    new URLSearchParams({ rowVersion: String(rowVersion) }).toString(),
  );
}

export async function publishFormVersion(
  versionId: string,
  rowVersion: number,
): Promise<FormVersion> {
  return runVersionWorkflow(
    versionId,
    'publish',
    new URLSearchParams({ rowVersion: String(rowVersion) }).toString(),
  );
}

export async function rejectFormVersionReview(input: {
  versionId: string;
  rowVersion: number;
  comment: string;
}): Promise<FormVersion> {
  const query = new URLSearchParams({
    rowVersion: String(input.rowVersion),
  }).toString();
  return runVersionWorkflow(input.versionId, 'reject-review', query, {
    attributes: { comment: input.comment },
  });
}

export async function retireFormVersion(
  versionId: string,
  rowVersion: number,
): Promise<FormVersion> {
  return runVersionWorkflow(
    versionId,
    'retire',
    new URLSearchParams({ rowVersion: String(rowVersion) }).toString(),
  );
}

// Backwards-compatible convenience aliases used by the existing designer.

export async function getFormDraft(code: string): Promise<FormVersion> {
  const { definition, versions } = await getDefinitionByCode(code);
  const related = relatedIds(definition, 'versions')
    .map((id) => versions.get(id))
    .filter(
      (item): item is JsonApiResource<FormVersionAttributes> =>
        item !== undefined,
    );
  const editable = related.find((item) =>
    isEditableStatus(attrString(item.attributes, 'status')),
  );
  if (!editable) {
    throw new ApiError(
      404,
      'Not Found',
      `Form '${code}' has no editable draft.`,
    );
  }
  return mapVersion(
    editable,
    attrString(definition.attributes, 'code') ?? code,
  );
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

export type FormVersionListOptions = PaginatedQueryOptions;
