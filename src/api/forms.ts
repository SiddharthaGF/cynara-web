import { ApiError } from '@/api/client.ts';
import {
  buildPaginatedQuery,
  jsonApiGet,
  jsonApiGetCollection,
  jsonApiPatchResource,
  jsonApiPostResource,
  attrNumber,
  attrString,
  includedOfType,
  relatedIds,
  type JsonApiResource,
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

async function patchFormVersion(
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
