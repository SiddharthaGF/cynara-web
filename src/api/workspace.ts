import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getWorkspace as sdkGetWorkspace,
  patchWorkspace as sdkPatchWorkspace,
  type HospitalWorkspaceDto as HospitalWorkspaceDtoContract,
  type UpdateHospitalWorkspaceRequest,
} from '@/api/generated';

/**
 * Read model for the resolved hospital workspace. Derived from the generated
 * contract type with the fields the app relies on as always-present promoted
 * to required.
 */
export type HospitalWorkspaceDto = Required<HospitalWorkspaceDtoContract>;

export type WorkspaceStatus = NonNullable<
  HospitalWorkspaceDtoContract['status']
>;

export interface UpdateWorkspaceInput {
  name: string;
  rowVersion: number;
}

export async function getWorkspace(): Promise<HospitalWorkspaceDto> {
  const { data } = await sdkGetWorkspace({
    headers: contractHeaders(),
  });
  return requireDto(data);
}

export async function updateWorkspace(
  input: UpdateWorkspaceInput,
): Promise<HospitalWorkspaceDto> {
  const body: UpdateHospitalWorkspaceRequest = {
    name: input.name,
    rowVersion: input.rowVersion,
  };
  const { data } = await sdkPatchWorkspace({
    headers: contractHeaders(),
    body,
  });
  return requireDto(data);
}

export function isForbiddenWorkspaceError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

export function isStaleWorkspaceError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
