import { apiRequest } from '@/api/client.ts';

export interface HospitalWorkspace {
  id: string;
  code: string;
  name: string;
  status: string;
  metadataJson: string | null;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHospitalWorkspaceInput {
  name: string;
  metadataJson?: string | null;
  rowVersion: number;
}

interface HospitalWorkspaceEnvelope {
  workspace: HospitalWorkspace;
}

function asWorkspace(
  payload: HospitalWorkspaceEnvelope | HospitalWorkspace,
): HospitalWorkspace {
  if ('workspace' in payload) {
    return payload.workspace;
  }
  return payload;
}

export async function getWorkspace(): Promise<HospitalWorkspace> {
  const payload = await apiRequest<
    HospitalWorkspaceEnvelope | HospitalWorkspace
  >('/api/workspace');
  return asWorkspace(payload);
}

export async function updateWorkspace(
  input: UpdateHospitalWorkspaceInput,
): Promise<HospitalWorkspace> {
  const payload = await apiRequest<
    HospitalWorkspaceEnvelope | HospitalWorkspace
  >('/api/workspace', {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.name,
      ...(input.metadataJson !== undefined && {
        metadataJson: input.metadataJson,
      }),
      rowVersion: input.rowVersion,
    }),
  });
  return asWorkspace(payload);
}
