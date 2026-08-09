import { ApiError } from '@/api/client.ts';
import type {
  DataInFormDefinitionResponse,
  DataInFormVersionResponse,
  FormVersionStatus,
  Meta,
  ResourceInResponse,
} from '@/api/generated';
import {
  buildPaginatedQuery,
  includedResources,
  relationshipIds,
} from '@/api/json-api-utils.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

export const DEFAULT_FORM_PAGE_SIZE = 20;

export const FORM_DEFINITIONS = 'formDefinitions';
export const FORM_VERSIONS = 'formVersions';
/** Page size for full-catalog reads; code lookups flatten every page. */
export const DEFINITIONS_COLLECTION_PAGE_SIZE = 100;

export type FormDefinitionResource = Pick<
  DataInFormDefinitionResponse,
  'id' | 'attributes' | 'relationships'
>;
export type FormVersionResource = Pick<
  DataInFormVersionResponse,
  'id' | 'attributes' | 'relationships'
>;

export interface ListFormsParams {
  /** 1-based page number for the catalog list. */
  page?: number;
  /** Number of form definitions per page. */
  pageSize?: number;
}

export interface FormListResponse {
  forms: FormSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export function listFormsQuery(
  params: ListFormsParams,
): Record<string, string> {
  return buildPaginatedQuery({
    include: ['versions'],
    pageSize: params.pageSize ?? DEFAULT_FORM_PAGE_SIZE,
    pageNumber: params.page,
    sort: 'code',
  });
}

/**
 * Unbounded catalog query used by code lookups and the document catalog form
 * selector, which must see every definition regardless of the paginated list.
 */
export function listAllFormDefinitionsQuery(): Record<string, string> {
  return buildPaginatedQuery({
    include: ['versions'],
    pageSize: DEFINITIONS_COLLECTION_PAGE_SIZE,
    sort: 'code',
  });
}

export function readTotalCount(meta: Meta | undefined): number {
  const total = meta?.total;
  return typeof total === 'number' && Number.isFinite(total) ? total : 0;
}

export function isEditableStatus(
  status: FormVersionStatus | null | undefined,
): boolean {
  return status === 'draft' || status === 'review';
}

export function versionById(
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

export function requireDefinition(
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

export function mapSummary(
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

export function mapVersion(
  version: FormVersionResource,
  code: string,
): FormVersion {
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
