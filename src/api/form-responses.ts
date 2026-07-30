import {
  buildPaginatedQuery,
  jsonApiAction,
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

export const FORM_RESPONSES = 'formResponses';
export const FORM_RESPONSE_REVISIONS = 'formResponseRevisions';

export type FormResponseStatus = 'draft' | 'completed';

export interface FormResponseRevision {
  id: string;
  formResponseId: string;
  revisionNumber: number;
  answersJson: string;
  status: FormResponseStatus;
  rowVersion: number;
  createdAt: string;
  authorId: string | null;
}

export interface FormResponse {
  id: string;
  formVersionId: string;
  answersJson: string;
  status: FormResponseStatus;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  revisionIds: readonly string[];
  revisions: readonly FormResponseRevision[];
}

interface FormResponseAttributes {
  answersJson?: string;
  status?: string;
  rowVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

interface FormResponseRevisionAttributes {
  revisionNumber?: number;
  answersJson?: string;
  status?: string;
  rowVersion?: number;
  createdAt?: string;
  authorId?: string | null;
}

function asFormResponseStatus(value: string | null): FormResponseStatus {
  if (value === 'completed') {
    return 'completed';
  }
  return 'draft';
}

function mapRevision(
  resource: JsonApiResource<FormResponseRevisionAttributes>,
): FormResponseRevision {
  return {
    id: resource.id,
    formResponseId: '',
    revisionNumber: attrNumber(resource.attributes, 'revisionNumber') ?? 0,
    answersJson: attrString(resource.attributes, 'answersJson') ?? '',
    status: asFormResponseStatus(attrString(resource.attributes, 'status')),
    rowVersion: attrNumber(resource.attributes, 'rowVersion') ?? 0,
    createdAt: attrString(resource.attributes, 'createdAt') ?? '',
    authorId: readNullableString(resource.attributes, 'authorId'),
  };
}

function mapResponse(
  resource: JsonApiResource<FormResponseAttributes>,
  revisions: Map<string, JsonApiResource<FormResponseRevisionAttributes>>,
): FormResponse {
  const revisionIds = relatedIds(resource, 'revisions');
  const formVersionId = relatedIds(resource, 'formVersion')[0] ?? '';
  const mappedRevisions = revisionIds
    .map((id) => revisions.get(id))
    .filter(
      (item): item is JsonApiResource<FormResponseRevisionAttributes> =>
        item !== undefined,
    )
    // oxlint-disable-next-line oxc/no-map-spread -- Object spread inside a single map callback is intentional.
    .map((item) => {
      const revision = mapRevision(item);
      return { ...revision, formResponseId: resource.id };
    });
  return {
    id: resource.id,
    formVersionId,
    answersJson: attrString(resource.attributes, 'answersJson') ?? '',
    status: asFormResponseStatus(attrString(resource.attributes, 'status')),
    rowVersion: attrNumber(resource.attributes, 'rowVersion') ?? 0,
    createdAt: attrString(resource.attributes, 'createdAt') ?? '',
    updatedAt: attrString(resource.attributes, 'updatedAt') ?? '',
    completedAt: readNullableString(resource.attributes, 'completedAt'),
    revisionIds,
    revisions: mappedRevisions,
  };
}

function revisionsById(
  included: JsonApiResource[],
): Map<string, JsonApiResource<FormResponseRevisionAttributes>> {
  const map = new Map<
    string,
    JsonApiResource<FormResponseRevisionAttributes>
  >();
  for (const item of includedOfType(included, FORM_RESPONSE_REVISIONS)) {
    map.set(item.id, item);
  }
  return map;
}

function readNullableString(attributes: object, name: string): string | null {
  const value = (attributes as Record<string, unknown>)[name];
  if (value === null) {
    return null;
  }
  return typeof value === 'string' ? value : null;
}

export interface ListFormResponsesOptions {
  formVersionId?: string;
  include?: readonly string[];
  pageSize?: number;
  pageNumber?: number;
  sort?: string;
}

export async function listFormResponses(
  options: ListFormResponsesOptions = {},
): Promise<FormResponse[]> {
  const query = buildPaginatedQuery({
    include: options.include,
    filters: options.formVersionId
      ? { 'formVersion.id': options.formVersionId }
      : {},
    pageSize: options.pageSize,
    pageNumber: options.pageNumber,
    sort: options.sort,
  });
  const { data, included } = await jsonApiGetCollection<FormResponseAttributes>(
    `/api/${FORM_RESPONSES}?${query}`,
  );
  const revisions = revisionsById(included);
  return data.map((resource) => mapResponse(resource, revisions));
}

export async function getFormResponse(
  id: string,
  options: { include?: readonly string[] } = {},
): Promise<FormResponse> {
  const include = options.include ?? ['formVersion', 'revisions'];
  const query = buildPaginatedQuery({ include });
  const document = await jsonApiGet(`/api/${FORM_RESPONSES}/${id}?${query}`);
  const resource = selectSingleResource<FormResponseAttributes>(
    document.data,
    id,
  );
  const revisions = revisionsById(document.included ?? []);
  return mapResponse(resource, revisions);
}

export interface CreateFormResponseInput {
  formVersionId: string;
  answersJson: string;
  rowVersion?: number;
}

export async function createFormResponse(
  input: CreateFormResponseInput,
): Promise<FormResponse> {
  const attributes: Record<string, unknown> = {
    answersJson: input.answersJson,
  };
  if (input.rowVersion !== undefined) {
    attributes.rowVersion = input.rowVersion;
  }
  const resource = await jsonApiPostResource<FormResponseAttributes>(
    FORM_RESPONSES,
    attributes,
    {
      formVersion: {
        data: { type: 'formVersions', id: input.formVersionId },
      },
    },
  );
  const revisions = new Map<
    string,
    JsonApiResource<FormResponseRevisionAttributes>
  >();
  return mapResponse(resource, revisions);
}

export interface PatchFormResponseInput {
  answersJson: string;
  rowVersion: number;
}

export async function patchFormResponse(
  id: string,
  input: PatchFormResponseInput,
): Promise<FormResponse> {
  const resource = await jsonApiPatchResource<FormResponseAttributes>(
    FORM_RESPONSES,
    id,
    {
      answersJson: input.answersJson,
      rowVersion: input.rowVersion,
    },
  );
  const revisions = new Map<
    string,
    JsonApiResource<FormResponseRevisionAttributes>
  >();
  return mapResponse(resource, revisions);
}

export async function completeFormResponse(
  id: string,
  rowVersion: number,
): Promise<FormResponse> {
  const query = new URLSearchParams({
    rowVersion: String(rowVersion),
  }).toString();
  const resource = await jsonApiAction<FormResponseAttributes>(
    FORM_RESPONSES,
    id,
    'complete',
    query,
  );
  const revisions = new Map<
    string,
    JsonApiResource<FormResponseRevisionAttributes>
  >();
  return mapResponse(resource, revisions);
}

export interface ListFormResponseRevisionsOptions {
  include?: readonly string[];
  pageSize?: number;
  pageNumber?: number;
  sort?: string;
}

export async function listFormResponseRevisions(
  formResponseId: string,
  options: ListFormResponseRevisionsOptions = {},
): Promise<FormResponseRevision[]> {
  const query = buildPaginatedQuery({
    include: options.include,
    pageSize: options.pageSize,
    pageNumber: options.pageNumber,
    sort: options.sort,
  });
  const { data } = await jsonApiGetCollection<FormResponseRevisionAttributes>(
    `/api/${FORM_RESPONSES}/${formResponseId}/revisions?${query}`,
  );
  // oxlint-disable-next-line oxc/no-map-spread -- Object spread inside a single map callback is intentional.
  return data.map((resource) => {
    const revision = mapRevision(resource);
    const linkedFormResponseId =
      relatedIds(resource, 'formResponse')[0] ?? formResponseId;
    return { ...revision, formResponseId: linkedFormResponseId };
  });
}

export async function getFormResponseRevision(
  id: string,
  options: { include?: readonly string[] } = {},
): Promise<FormResponseRevision> {
  const include = options.include ?? ['formResponse'];
  const query = buildPaginatedQuery({ include });
  const document = await jsonApiGet(
    `/api/${FORM_RESPONSE_REVISIONS}/${id}?${query}`,
  );
  const resource = selectSingleResource<FormResponseRevisionAttributes>(
    document.data,
    id,
  );
  const revision = mapRevision(resource);
  const linkedFormResponseId = relatedIds(resource, 'formResponse')[0] ?? '';
  return { ...revision, formResponseId: linkedFormResponseId };
}

function selectSingleResource<TAttributes>(
  data: JsonApiResource | JsonApiResource[] | undefined,
  fallbackId: string,
): JsonApiResource<TAttributes> {
  if (Array.isArray(data)) {
    const [candidate] = data;
    if (!candidate) {
      throw new Error(`Resource '${fallbackId}' was not found.`);
    }
    return candidate as JsonApiResource<TAttributes>;
  }
  if (!data) {
    throw new Error(`Resource '${fallbackId}' was not found.`);
  }
  return data as JsonApiResource<TAttributes>;
}
