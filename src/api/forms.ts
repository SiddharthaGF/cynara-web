import { apiRequest } from '@/api/client.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

interface ApiFormSummary {
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  editableVersionId: string | null;
  editableStatus: string | null;
  editableRowVersion: number | null;
  publishedVersions: string[];
}

interface ApiFormVersion {
  id: string;
  code: string;
  version: string | null;
  status: string;
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
  contentHash: string | null;
  dependencyMetadataJson: string | null;
  rowVersion: number;
  createdAt: string;
  submittedForReviewAt: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
}

function mapSummary(item: ApiFormSummary): FormSummary {
  return {
    code: item.code,
    name: item.name,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    editableVersionId: item.editableVersionId,
    editableStatus: item.editableStatus,
    editableRowVersion: item.editableRowVersion,
    publishedVersions: item.publishedVersions,
  };
}

function mapVersion(item: ApiFormVersion): FormVersion {
  return {
    id: item.id,
    code: item.code,
    version: item.version,
    status: item.status,
    clinicalSchemaJson: item.clinicalSchemaJson,
    uiSchemaJson: item.uiSchemaJson,
    rulesSchemaJson: item.rulesSchemaJson,
    contentHash: item.contentHash,
    dependencyMetadataJson: item.dependencyMetadataJson,
    rowVersion: item.rowVersion,
    createdAt: item.createdAt,
    submittedForReviewAt: item.submittedForReviewAt,
    publishedAt: item.publishedAt,
    retiredAt: item.retiredAt,
  };
}

export async function listForms(): Promise<FormSummary[]> {
  const items = await apiRequest<ApiFormSummary[]>('/api/forms');
  return items.map(mapSummary);
}

export async function createForm(input: {
  code: string;
  name: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
}): Promise<FormSummary> {
  const created = await apiRequest<ApiFormSummary>('/api/forms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapSummary(created);
}

export async function getFormDraft(code: string): Promise<FormVersion> {
  const version = await apiRequest<ApiFormVersion>(`/api/forms/${code}/draft`);
  return mapVersion(version);
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
  const version = await apiRequest<ApiFormVersion>(`/api/forms/${code}/draft`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return mapVersion(version);
}
