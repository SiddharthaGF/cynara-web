import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  createWorkflowDraft as sdkCreateWorkflowDraft,
  getWorkflowDefinition as sdkGetWorkflowDefinition,
  getWorkflowDefinitionCollection as sdkGetWorkflowDefinitionCollection,
  getWorkflowDefinitionVersions as sdkGetWorkflowDefinitionVersions,
  getWorkflowVersion as sdkGetWorkflowVersion,
  patchWorkflowVersion as sdkPatchWorkflowVersion,
  postWorkflowDefinition as sdkPostWorkflowDefinition,
  type AttributesInUpdateWorkflowVersionRequest,
  type DataInWorkflowDefinitionResponse,
  type DataInWorkflowVersionResponse,
  type ResourceInResponse,
  type WorkflowVersionStatus,
} from '@/api/generated';
import {
  buildPaginatedQuery,
  includedResources,
  relationshipId,
  relationshipIds,
} from '@/api/json-api-utils.ts';
import type {
  WorkflowSummary,
  WorkflowVersion,
} from '@/features/workflows/types.ts';

const WORKFLOW_DEFINITIONS = 'workflowDefinitions';
const WORKFLOW_VERSIONS = 'workflowVersions';

type WorkflowDefinitionResource = Pick<
  DataInWorkflowDefinitionResponse,
  'id' | 'attributes' | 'relationships'
>;
type WorkflowVersionResource = Pick<
  DataInWorkflowVersionResponse,
  'id' | 'attributes' | 'relationships'
>;

function listWorkflowsQuery(): Record<string, string> {
  return buildPaginatedQuery({
    include: ['versions'],
    pageSize: 100,
    sort: 'code',
  });
}

function isEditableStatus(
  status: WorkflowVersionStatus | null | undefined,
): boolean {
  return status === 'draft' || status === 'review';
}

function versionById(
  included: readonly ResourceInResponse[],
): Map<string, WorkflowVersionResource> {
  const map = new Map<string, WorkflowVersionResource>();
  for (const item of includedResources<DataInWorkflowVersionResponse>(
    included,
    WORKFLOW_VERSIONS,
  )) {
    map.set(item.id, item);
  }
  return map;
}

function requireDefinition(
  data: WorkflowDefinitionResource | WorkflowDefinitionResource[],
): WorkflowDefinitionResource {
  if (Array.isArray(data)) {
    const [first] = data;
    if (!first) {
      throw new ApiError(
        404,
        'Not Found',
        'Workflow definition was not found.',
      );
    }
    return first;
  }
  return data;
}

function mapSummary(
  definition: WorkflowDefinitionResource,
  versions: Map<string, WorkflowVersionResource>,
): WorkflowSummary {
  const attrs = definition.attributes;
  const related = relationshipIds(definition.relationships?.versions)
    .map((id) => versions.get(id))
    .filter((item): item is WorkflowVersionResource => item !== undefined);

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

function mapVersion(
  version: WorkflowVersionResource,
  code: string,
): WorkflowVersion {
  const attrs = version.attributes;
  return {
    id: version.id,
    code,
    version: attrs?.version ?? null,
    status: attrs?.status ?? '',
    workflowSchemaJson: attrs?.workflowSchemaJson ?? '',
    contentHash: attrs?.contentHash ?? null,
    rowVersion: attrs?.rowVersion ?? 0,
    createdAt: attrs?.createdAt ?? '',
    submittedForReviewAt: attrs?.submittedForReviewAt ?? null,
    publishedAt: attrs?.publishedAt ?? null,
    retiredAt: attrs?.retiredAt ?? null,
    publishedSchemaVersion: attrs?.publishedSchemaVersion ?? null,
    lastReviewComment: attrs?.lastReviewComment ?? null,
    lastReviewDecision: attrs?.lastReviewDecision ?? null,
    lastReviewedAt: attrs?.lastReviewedAt ?? null,
  };
}

async function fetchDefinitionDocument(id: string): Promise<{
  definition: WorkflowDefinitionResource;
  versions: Map<string, WorkflowVersionResource>;
}> {
  const { data } = await sdkGetWorkflowDefinition({
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
  definition: WorkflowDefinitionResource;
  versions: Map<string, WorkflowVersionResource>;
}> {
  const { data } = await sdkGetWorkflowDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listWorkflowsQuery() },
  });
  const definition = data.data.find((item) => item.attributes?.code === code);
  if (!definition) {
    throw new ApiError(404, 'Not Found', `Workflow '${code}' was not found.`);
  }
  return {
    definition,
    versions: versionById(data.included ?? []),
  };
}

export async function getWorkflowVersion(
  versionId: string,
  expectedCode?: string,
): Promise<WorkflowVersion> {
  const version = await getWorkflowVersionSnapshot(versionId, expectedCode);
  if (!isEditableStatus(version.status as WorkflowVersionStatus)) {
    throw new ApiError(
      409,
      'Conflict',
      `Workflow version '${versionId}' is not an editable draft.`,
    );
  }
  return version;
}

/**
 * Fetches any workflow version by id (draft, review, published, or retired)
 * and maps it to the app-facing `WorkflowVersion`. Used by the workflow
 * designer to render a published snapshot even after the workflow moved on.
 */
export async function getWorkflowVersionSnapshot(
  versionId: string,
  expectedCode?: string,
): Promise<WorkflowVersion> {
  const { data } = await sdkGetWorkflowVersion({
    path: { id: versionId },
    headers: contractHeaders(),
    query: {
      query: buildPaginatedQuery({ include: ['workflowDefinition'] }),
    },
  });
  const version: WorkflowVersionResource = data.data;
  const definitions = includedResources<DataInWorkflowDefinitionResponse>(
    data.included ?? [],
    WORKFLOW_DEFINITIONS,
  );
  const relatedDefinitionId = relationshipId(
    version.relationships?.workflowDefinition,
  );
  const definition =
    definitions.find((item) => item.id === relatedDefinitionId) ??
    definitions[0];
  const code = definition?.attributes?.code ?? '';
  if (expectedCode && code !== expectedCode) {
    throw new ApiError(
      404,
      'Not Found',
      `Workflow version '${versionId}' does not belong to '${expectedCode}'.`,
    );
  }
  return mapVersion(version, code || (expectedCode ?? ''));
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  const { data } = await sdkGetWorkflowDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listWorkflowsQuery() },
  });
  const versions = versionById(data.included ?? []);
  return data.data.map((definition) => mapSummary(definition, versions));
}

// Public API client for listing a definition's version history. Kept as a
// Facade export; the workflow catalog currently surfaces published versions
// From the summary payload instead.
// react-doctor-disable-next-line deslop/unused-export
export async function listWorkflowVersions(
  definitionId: string,
  expectedCode?: string,
): Promise<WorkflowVersion[]> {
  const { data } = await sdkGetWorkflowDefinitionVersions({
    path: { id: definitionId },
    headers: contractHeaders(),
    query: {
      query: buildPaginatedQuery({
        include: ['workflowDefinition'],
        sort: '-version',
        pageSize: 100,
      }),
    },
  });
  const definitions = includedResources<DataInWorkflowDefinitionResponse>(
    data.included ?? [],
    WORKFLOW_DEFINITIONS,
  );
  const code = definitions[0]?.attributes?.code ?? expectedCode ?? '';
  return data.data.map((version) => mapVersion(version, code));
}

export async function createWorkflow(input: {
  code: string;
  name: string;
  initialWorkflowSchemaJson?: string | null;
}): Promise<WorkflowSummary> {
  // CYN-55: generated `data.type` is the document discriminator, but the API
  // Expects the resource type on the wire; the narrow cast bridges the mismatch.
  const { data } = await sdkPostWorkflowDefinition({
    headers: contractHeaders(),
    body: {
      data: {
        type: WORKFLOW_DEFINITIONS,
        attributes: {
          code: input.code,
          name: input.name,
          ...(input.initialWorkflowSchemaJson
            ? { initialWorkflowSchemaJson: input.initialWorkflowSchemaJson }
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
      'Created workflow definition did not return an identifier.',
    );
  }
  const { definition, versions } = await fetchDefinitionDocument(createdId);
  return mapSummary(definition, versions);
}

async function patchWorkflowVersion(
  versionId: string,
  input: {
    workflowSchemaJson: string;
    rowVersion: number;
  },
): Promise<WorkflowVersion> {
  // CYN-55: same `data.type` discriminator mismatch as `createWorkflow`.
  const { data } = await sdkPatchWorkflowVersion({
    path: { id: versionId },
    headers: contractHeaders(),
    body: {
      data: {
        id: versionId,
        type: WORKFLOW_VERSIONS,
        attributes: {
          workflowSchemaJson: input.workflowSchemaJson,
          rowVersion: input.rowVersion,
        } satisfies Omit<
          AttributesInUpdateWorkflowVersionRequest,
          'openapi:discriminator'
        >,
      },
    } as never,
  });
  if (!data) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Workflow version update did not return the updated resource.',
    );
  }
  return mapVersion(data.data, '');
}

export async function getWorkflowDraft(code: string): Promise<WorkflowVersion> {
  const { definition, versions } = await getDefinitionByCode(code);
  const related = relationshipIds(definition.relationships?.versions)
    .map((id) => versions.get(id))
    .filter((item): item is WorkflowVersionResource => item !== undefined);
  const editable = related.find((item) =>
    isEditableStatus(item.attributes?.status),
  );
  if (!editable) {
    throw new ApiError(
      404,
      'Not Found',
      `Workflow '${code}' has no editable draft.`,
    );
  }
  return mapVersion(editable, definition.attributes?.code ?? code);
}

export async function updateWorkflowDraft(
  code: string,
  input: {
    workflowSchemaJson: string;
    rowVersion: number;
  },
): Promise<WorkflowVersion> {
  const draft = await getWorkflowDraft(code);
  const updated = await patchWorkflowVersion(draft.id, input);
  return { ...updated, code };
}

export async function resolveWorkflowDefinitionId(
  code: string,
): Promise<string> {
  const { definition } = await getDefinitionByCode(code);
  return definition.id;
}

export async function createWorkflowDraft(
  code: string,
): Promise<WorkflowVersion> {
  const definitionId = await resolveWorkflowDefinitionId(code);
  await sdkCreateWorkflowDraft({
    path: { id: definitionId },
    headers: contractHeaders(),
  });
  return getWorkflowDraft(code);
}
