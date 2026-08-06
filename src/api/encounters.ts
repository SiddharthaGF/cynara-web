import {
  ACTOR_HEADER_NAME,
  ApiError,
  DEFAULT_ACTOR_ID,
  HOSPITAL_HEADER_NAME,
  apiRequest,
  resolveHospitalCode,
} from '@/api/client.ts';
import { JSON_API_MEDIA } from '@/api/json-api.ts';

/** Encounter type values accepted by cynara-api. */
export type EncounterType =
  | 'ambulatory'
  | 'emergency'
  | 'inpatient'
  | 'observation'
  | 'virtual';

/** Lifecycle status returned by the encounter API. */
export type EncounterStatus =
  | 'open'
  | 'completed'
  | 'canceled'
  | 'enteredInError';

export interface EncounterDto {
  id: string;
  patientId: string;
  facilityId: string;
  clinicalAreaId: string;
  type: string;
  responsibleProfessionalId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterListResponse {
  encounters: EncounterDto[];
}

export interface ListEncountersParams {
  patientId?: string;
  facilityId?: string;
  clinicalAreaId?: string;
  status?: string;
}

export interface CreateEncounterInput {
  patientId: string;
  facilityId: string;
  clinicalAreaId: string;
  type: EncounterType;
  responsibleProfessionalId: string;
  startedAt?: string | null;
}

export interface TransitionEncounterInput {
  rowVersion: number;
  endedAt?: string | null;
}

function encounterHeaders(init?: HeadersInit): Headers {
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

function buildListQuery(params: ListEncountersParams): string {
  const search = new URLSearchParams();
  if (params.patientId) {
    search.set('patientId', params.patientId);
  }
  if (params.facilityId) {
    search.set('facilityId', params.facilityId);
  }
  if (params.clinicalAreaId) {
    search.set('clinicalAreaId', params.clinicalAreaId);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  return search.toString();
}

function appendQuery(path: string, query: string): string {
  if (query.length === 0) {
    return path;
  }
  return `${path}?${query}`;
}

export async function listEncounters(
  params: ListEncountersParams = {},
): Promise<EncounterListResponse> {
  const query = buildListQuery(params);
  return apiRequest<EncounterListResponse>(
    appendQuery('/api/encounters', query),
    { headers: encounterHeaders() },
  );
}

export async function getEncounter(id: string): Promise<EncounterDto> {
  return apiRequest<EncounterDto>(`/api/encounters/${id}`, {
    headers: encounterHeaders(),
  });
}

export async function createEncounter(
  input: CreateEncounterInput,
): Promise<EncounterDto> {
  const body: Record<string, unknown> = {
    patientId: input.patientId,
    facilityId: input.facilityId,
    clinicalAreaId: input.clinicalAreaId,
    type: input.type,
    responsibleProfessionalId: input.responsibleProfessionalId,
  };
  if (input.startedAt !== undefined) {
    body.startedAt = input.startedAt;
  }
  return apiRequest<EncounterDto>('/api/encounters', {
    method: 'POST',
    headers: encounterHeaders(),
    body: JSON.stringify(body),
  });
}

export async function completeEncounter(
  id: string,
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  return transitionEncounter(id, 'complete', input);
}

export async function cancelEncounter(
  id: string,
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  return transitionEncounter(id, 'cancel', input);
}

export async function enterEncounterInError(
  id: string,
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  return transitionEncounter(id, 'enter-in-error', input);
}

async function transitionEncounter(
  id: string,
  action: 'complete' | 'cancel' | 'enter-in-error',
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  const body: Record<string, unknown> = {
    rowVersion: input.rowVersion,
  };
  if (input.endedAt !== undefined) {
    body.endedAt = input.endedAt;
  }
  return apiRequest<EncounterDto>(`/api/encounters/${id}/${action}`, {
    method: 'POST',
    headers: encounterHeaders(),
    body: JSON.stringify(body),
  });
}

export function isForbiddenEncounterError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

export function isStaleEncounterError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function isOpenEncounter(status: string): boolean {
  return status === 'open';
}

export function isHistoricalEncounter(status: string): boolean {
  return (
    status === 'completed' ||
    status === 'canceled' ||
    status === 'enteredInError'
  );
}
