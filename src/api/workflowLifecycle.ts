// react-doctor-disable-file deslop/unused-file
// Lifecycle transition exports; no UI consumes them yet.
import { contractHeaders } from '@/api/client-runtime.ts';
import {
  publishWorkflowVersion as sdkPublishWorkflowVersion,
  rejectWorkflowReview as sdkRejectWorkflowReview,
  retireWorkflowVersion as sdkRetireWorkflowVersion,
  softDeleteWorkflowDraft as sdkSoftDeleteWorkflowDraft,
  submitWorkflowReview as sdkSubmitWorkflowReview,
  withdrawWorkflowReview as sdkWithdrawWorkflowReview,
} from '@/api/generated';
import {
  getWorkflowVersionSnapshot,
  resolveWorkflowDefinitionId,
} from '@/api/workflows.ts';
import type { WorkflowVersion } from '@/features/workflows/types.ts';

export async function softDeleteWorkflowDraft(code: string): Promise<void> {
  const definitionId = await resolveWorkflowDefinitionId(code);
  await sdkSoftDeleteWorkflowDraft({
    path: { id: definitionId },
    headers: contractHeaders(),
  });
}

export async function submitWorkflowReview(
  versionId: string,
  rowVersion: number,
): Promise<WorkflowVersion> {
  await sdkSubmitWorkflowReview({
    path: { id: versionId },
    headers: contractHeaders(),
    query: { rowVersion },
  });
  return getWorkflowVersionSnapshot(versionId);
}

export async function withdrawWorkflowReview(
  versionId: string,
  rowVersion: number,
): Promise<WorkflowVersion> {
  await sdkWithdrawWorkflowReview({
    path: { id: versionId },
    headers: contractHeaders(),
    query: { rowVersion },
  });
  return getWorkflowVersionSnapshot(versionId);
}

export async function rejectWorkflowReview(
  versionId: string,
  rowVersion: number,
  comment: string,
): Promise<WorkflowVersion> {
  await sdkRejectWorkflowReview({
    path: { id: versionId },
    headers: contractHeaders(),
    query: { rowVersion, comment },
  });
  return getWorkflowVersionSnapshot(versionId);
}

export async function publishWorkflowVersion(
  versionId: string,
  rowVersion: number,
): Promise<WorkflowVersion> {
  await sdkPublishWorkflowVersion({
    path: { id: versionId },
    headers: contractHeaders(),
    query: { rowVersion },
  });
  return getWorkflowVersionSnapshot(versionId);
}

export async function retireWorkflowVersion(
  versionId: string,
): Promise<WorkflowVersion> {
  await sdkRetireWorkflowVersion({
    path: { id: versionId },
    headers: contractHeaders(),
  });
  return getWorkflowVersionSnapshot(versionId);
}
