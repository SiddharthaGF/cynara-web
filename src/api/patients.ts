import {
  ACTOR_HEADER_NAME,
  ApiError,
  DEFAULT_ACTOR_ID,
  HOSPITAL_HEADER_NAME,
  apiRequest,
  resolveHospitalCode,
} from '@/api/client.ts';
import { JSON_API_MEDIA } from '@/api/json-api.ts';

/** Sex values accepted by cynara-api (`female` | `male` | `unknown`). */
export type PatientSex = 'female' | 'male' | 'unknown';

/** Lifecycle status returned by the registry (`active` | `retired`). */
export type PatientStatus = 'active' | 'retired';

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

export interface PatientListResponse {
  patients: PatientDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ListPatientsParams {
  mrn?: string;
  nationalId?: string;
  givenName?: string;
  familyName?: string;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreatePatientInput {
  mrn: string;
  nationalId?: string | null;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: PatientSex;
}

export interface PatchPatientInput {
  nationalId?: string | null;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: PatientSex;
  rowVersion: number;
}

function patientHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.set('Accept', JSON_API_MEDIA);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', JSON_API_MEDIA);
  }
  if (!headers.has(HOSPITAL_HEADER_NAME)) {
    headers.set(HOSPITAL_HEADER_NAME, resolveHospitalCode());
  }
  if (!headers.has(ACTOR_HEADER_NAME)) {
    headers.set(ACTOR_HEADER_NAME, DEFAULT_ACTOR_ID);
  }
  return headers;
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
  if (params.page !== undefined) {
    search.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    search.set('pageSize', String(params.pageSize));
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
): Promise<PatientListResponse> {
  const query = buildListQuery(params);
  return apiRequest<PatientListResponse>(appendQuery('/api/patients', query), {
    headers: patientHeaders(),
  });
}

export async function getPatient(id: string): Promise<PatientDto> {
  return apiRequest<PatientDto>(`/api/patients/${id}`, {
    headers: patientHeaders(),
  });
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
  return apiRequest<PatientDto>('/api/patients', {
    method: 'POST',
    headers: patientHeaders(),
    body: JSON.stringify(body),
  });
}

export async function patchPatient(
  id: string,
  input: PatchPatientInput,
): Promise<PatientDto> {
  const body: Record<string, unknown> = {
    givenName: input.givenName,
    familyName: input.familyName,
    birthDate: input.birthDate,
    sex: input.sex,
    rowVersion: input.rowVersion,
  };
  if (input.nationalId !== undefined) {
    body.nationalId = input.nationalId;
  }
  return apiRequest<PatientDto>(`/api/patients/${id}`, {
    method: 'PATCH',
    headers: patientHeaders(),
    body: JSON.stringify(body),
  });
}

export async function softDeletePatient(
  id: string,
  rowVersion: number,
): Promise<PatientDto> {
  return apiRequest<PatientDto>(`/api/patients/${id}/soft-delete`, {
    method: 'POST',
    headers: patientHeaders(),
    body: JSON.stringify({ rowVersion }),
  });
}

export function isDuplicateMrnError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status !== 409 && error.status !== 422 && error.status !== 400) {
    return false;
  }
  const detail = (error.message ?? '').toLowerCase();
  return (
    detail.includes('mrn') ||
    detail.includes('already exists') ||
    detail.includes('duplicate')
  );
}

export function isForbiddenPatientError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

export function isTenantContextError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status !== 400) {
    return false;
  }
  const detail = `${error.title} ${error.message}`.toLowerCase();
  return (
    detail.includes('hospital') ||
    detail.includes('tenant') ||
    detail.includes('workspace')
  );
}
