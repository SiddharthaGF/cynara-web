import { apiRequest } from '@/api/client.ts';

export interface PatientDto {
  id: string;
  mrn: string;
  nationalId: string | null;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: string;
  status: string;
  rowVersion: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PatientListResponse {
  patients: PatientDto[];
}

export interface ListPatientsParams {
  mrn?: string;
  nationalId?: string;
  givenName?: string;
  familyName?: string;
  includeDeleted?: boolean;
}

function buildListQuery(params: ListPatientsParams): string {
  const search = new URLSearchParams();
  if (params.mrn) {
    search.set('mrn', params.mrn);
  }
  if (params.nationalId) {
    search.set('nationalId', params.nationalId);
  }
  if (params.givenName) {
    search.set('givenName', params.givenName);
  }
  if (params.familyName) {
    search.set('familyName', params.familyName);
  }
  if (params.includeDeleted !== undefined) {
    search.set('includeDeleted', params.includeDeleted ? 'true' : 'false');
  }
  return search.toString();
}

function appendQuery(path: string, query: string): string {
  if (query.length === 0) {
    return path;
  }
  return `${path}?${query}`;
}

export async function listPatients(
  params: ListPatientsParams = {},
): Promise<PatientDto[]> {
  const query = buildListQuery(params);
  const payload = await apiRequest<PatientListResponse>(
    appendQuery('/api/patients', query),
  );
  return payload.patients;
}

export async function getPatient(id: string): Promise<PatientDto> {
  return apiRequest<PatientDto>(`/api/patients/${id}`);
}

export interface CreatePatientInput {
  mrn: string;
  nationalId?: string | null;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: string;
  status?: string;
}

export async function createPatient(
  input: CreatePatientInput,
): Promise<PatientDto> {
  const body: Record<string, unknown> = {
    mrn: input.mrn,
    givenName: input.givenName,
    familyName: input.familyName,
    birthDate: input.birthDate,
    sex: input.sex,
  };
  if (input.nationalId !== undefined) {
    body.nationalId = input.nationalId;
  }
  if (input.status !== undefined) {
    body.status = input.status;
  }
  return apiRequest<PatientDto>('/api/patients', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface PatchPatientInput {
  mrn?: string;
  nationalId?: string | null;
  givenName?: string;
  familyName?: string;
  birthDate?: string;
  sex?: string;
  status?: string;
  rowVersion: number;
}

export async function patchPatient(
  id: string,
  input: PatchPatientInput,
): Promise<PatientDto> {
  const body: Record<string, unknown> = { rowVersion: input.rowVersion };
  if (input.mrn !== undefined) {
    body.mrn = input.mrn;
  }
  if (input.nationalId !== undefined) {
    body.nationalId = input.nationalId;
  }
  if (input.givenName !== undefined) {
    body.givenName = input.givenName;
  }
  if (input.familyName !== undefined) {
    body.familyName = input.familyName;
  }
  if (input.birthDate !== undefined) {
    body.birthDate = input.birthDate;
  }
  if (input.sex !== undefined) {
    body.sex = input.sex;
  }
  if (input.status !== undefined) {
    body.status = input.status;
  }
  return apiRequest<PatientDto>(`/api/patients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function softDeletePatient(id: string): Promise<PatientDto> {
  return apiRequest<PatientDto>(`/api/patients/${id}/soft-delete`, {
    method: 'POST',
  });
}
