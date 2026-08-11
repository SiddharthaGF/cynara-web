import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  createWorkflowDraft as sdkCreateWorkflowDraft,
  patchWorkflowVersion as sdkPatchWorkflowVersion,
  publishWorkflowVersion as sdkPublishWorkflowVersion,
  submitWorkflowReview as sdkSubmitWorkflowReview,
  withdrawWorkflowReview as sdkWithdrawWorkflowReview,
  type AttributesInUpdateWorkflowVersionRequest,
} from '@/api/generated';
import { relationshipIds } from '@/api/json-api-utils.ts';
import {
  WORKFLOW_VERSIONS,
  getDefinitionByCode,
  getWorkflowVersionSnapshot,
  isEditableStatus,
  mapVersion,
  type WorkflowVersionResource,
} from '@/api/workflows-catalog.ts';
import type { WorkflowVersion } from '@/features/workflows/types.ts';

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

type LifecycleTransition = 'submit-review' | 'withdraw-review' | 'publish';

async function transitionWorkflowVersion(
  versionId: string,
  rowVersion: number,
  transition: LifecycleTransition,
): Promise<WorkflowVersion> {
  const headers = contractHeaders();
  const query = { rowVersion };
  if (transition === 'submit-review') {
    await sdkSubmitWorkflowReview({
      path: { id: versionId },
      headers,
      query,
    });
  } else if (transition === 'withdraw-review') {
    await sdkWithdrawWorkflowReview({
      path: { id: versionId },
      headers,
      query,
    });
  } else {
    await sdkPublishWorkflowVersion({
      path: { id: versionId },
      headers,
      query,
    });
  }
  return getWorkflowVersionSnapshot(versionId);
}

/**
 * Moves an editable draft to the review state. The schema locks and the draft
 * becomes read-only until it is published or withdrawn.
 */
export async function submitWorkflowReview(
  versionId: string,
  rowVersion: number,
): Promise<WorkflowVersion> {
  return transitionWorkflowVersion(versionId, rowVersion, 'submit-review');
}

/** Returns a review-state version to an editable draft. */
export async function withdrawWorkflowReview(
  versionId: string,
  rowVersion: number,
): Promise<WorkflowVersion> {
  return transitionWorkflowVersion(versionId, rowVersion, 'withdraw-review');
}

/** Publishes a reviewed version, making it drive patient pipelines. */
export async function publishWorkflow(
  versionId: string,
  rowVersion: number,
): Promise<WorkflowVersion> {
  return transitionWorkflowVersion(versionId, rowVersion, 'publish');
}
