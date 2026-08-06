import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import { getFormVersionSnapshot } from '@/api/forms.ts';
import {
  getFormResponse as sdkGetFormResponse,
  patchFormResponse as sdkPatchFormResponse,
  type DataInFormResponseResponse,
  type FormResponseStatus,
} from '@/api/generated';
import { buildPaginatedQuery, relationshipId } from '@/api/json-api-utils.ts';
import type { FormVersion } from '@/features/forms/types.ts';

const FORM_RESPONSES = 'formResponses';

/**
 * Flat read model for a clinical form response. The JSON:API envelope's
 * answers document and lifecycle attributes are promoted onto the record so
 * screens never navigate envelopes directly.
 */
export interface FormResponseDto {
  id: string;
  status: FormResponseStatus;
  answersJson: string;
  revisionNumber: number;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
  formVersionId: string;
}

type FormResponseResource = Pick<
  DataInFormResponseResponse,
  'id' | 'attributes' | 'relationships'
>;

function mapFormResponse(resource: FormResponseResource): FormResponseDto {
  const { attributes, relationships } = resource;
  return {
    id: resource.id,
    status: attributes?.status ?? 'draft',
    answersJson: attributes?.answersJson ?? '{}',
    revisionNumber: attributes?.revisionNumber ?? 0,
    rowVersion: attributes?.rowVersion ?? 0,
    createdAt: attributes?.createdAt ?? '',
    updatedAt: attributes?.updatedAt ?? '',
    completedAt: attributes?.completedAt ?? null,
    deletedAt: attributes?.deletedAt ?? null,
    formVersionId: relationshipId(relationships?.formVersion) ?? '',
  };
}

export async function getFormResponse(id: string): Promise<FormResponseDto> {
  const { data } = await sdkGetFormResponse({
    path: { id },
    headers: contractHeaders(),
    query: {
      query: buildPaginatedQuery({ include: ['formVersion'] }),
    },
  });
  return mapFormResponse(data.data);
}

export interface UpdateFormResponseInput {
  answersJson: string;
  rowVersion: number;
}

/**
 * CYN-55: the generated `data.type` carries the OpenAPI discriminator value
 * instead of the wire resource type; the narrow cast bridges the mismatch.
 */
export async function updateFormResponse(
  id: string,
  input: UpdateFormResponseInput,
): Promise<FormResponseDto> {
  const { data } = await sdkPatchFormResponse({
    path: { id },
    headers: contractHeaders(),
    body: {
      data: {
        id,
        type: FORM_RESPONSES,
        attributes: {
          answersJson: input.answersJson,
          rowVersion: input.rowVersion,
        },
      },
    } as never,
  });
  if (!data) {
    // 204 "no additional changes" keeps the current server state as-is.
    return getFormResponse(id);
  }
  const document = data as {
    data: FormResponseResource;
  };
  return mapFormResponse(document.data);
}

export function isStaleFormResponseError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/**
 * Loads the published form version a document was started on. Unlike the
 * designer's editable-draft accessor, this accepts any published snapshot so
 * historical documents keep rendering against the exact schema they captured.
 */
export async function getPublishedFormVersion(
  versionId: string,
): Promise<FormVersion> {
  return getFormVersionSnapshot(versionId);
}
