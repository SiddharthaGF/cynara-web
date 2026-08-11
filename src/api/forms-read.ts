import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  DEFAULT_FORM_PAGE_SIZE,
  DEFINITIONS_COLLECTION_PAGE_SIZE,
  FORM_DEFINITIONS,
  isEditableStatus,
  listAllFormDefinitionsQuery,
  listFormsQuery,
  mapSummary,
  mapVersion,
  readTotalCount,
  versionById,
  type FormListResponse,
  type FormVersionResource,
  type ListFormsParams,
} from '@/api/forms-mappers.ts';
import {
  getFormDefinitionCollection as sdkGetFormDefinitionCollection,
  getFormVersion as sdkGetFormVersion,
  type DataInFormDefinitionResponse,
  type FormVersionStatus,
} from '@/api/generated';
import {
  buildPaginatedQuery,
  fetchAllCollectionPages,
  includedResources,
  relationshipId,
} from '@/api/json-api-utils.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

export async function getFormVersion(
  versionId: string,
  expectedCode?: string,
): Promise<FormVersion> {
  const version = await getFormVersionSnapshot(versionId, expectedCode);
  if (!isEditableStatus(version.status as FormVersionStatus)) {
    throw new ApiError(
      409,
      'Conflict',
      `Form version '${versionId}' is not an editable draft.`,
    );
  }
  return version;
}

/**
 * Fetches any form version by id (draft, review, published, or retired) and
 * maps it to the app-facing `FormVersion`. Used by document workspaces, which
 * must render the exact published snapshot a document was started on even
 * after the form moved on.
 */
export async function getFormVersionSnapshot(
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
  return mapVersion(version, code || (expectedCode ?? ''));
}

export async function listForms(
  params: ListFormsParams = {},
): Promise<FormListResponse> {
  const { data } = await sdkGetFormDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listFormsQuery(params) },
  });
  const versions = versionById(data.included ?? []);
  return {
    forms: data.data.map((definition) => mapSummary(definition, versions)),
    totalCount: readTotalCount(data.meta),
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_FORM_PAGE_SIZE,
  };
}

/**
 * Unbounded catalog read over every page. Used by the catalog search, which
 * must match against the full catalog instead of the single paginated page
 * the list view holds in memory.
 */
export async function listAllForms(): Promise<FormSummary[]> {
  const collection = await fetchAllCollectionPages(
    listAllFormDefinitionsQuery(),
    DEFINITIONS_COLLECTION_PAGE_SIZE,
    async (query) => {
      const { data } = await sdkGetFormDefinitionCollection({
        headers: contractHeaders(),
        query: { query },
      });
      return data;
    },
  );
  const versions = versionById(collection.included ?? []);
  return collection.data.map((definition) => mapSummary(definition, versions));
}
