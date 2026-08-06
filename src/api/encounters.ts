import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  cancelEncounter as sdkCancelEncounter,
  completeEncounter as sdkCompleteEncounter,
  createEncounter as sdkCreateEncounter,
  enterEncounterInError as sdkEnterEncounterInError,
  getEncounter as sdkGetEncounter,
  listEncounters as sdkListEncounters,
  type EncounterDto as EncounterDtoContract,
  type EncounterListResponse as EncounterListResponseContract,
  type ListEncountersData,
} from '@/api/generated';

/**
 * Read model for encounter listings. Derived from the generated contract type
 * with the fields the app relies on as always-present promoted to required.
 */
export type EncounterDto = Required<EncounterDtoContract>;
export type EncounterListResponse = EncounterListResponseContract & {
  encounters: EncounterDto[];
};

/** Encounter type values accepted by cynara-api. */
export type EncounterType = NonNullable<EncounterDtoContract['type']>;

/** Lifecycle status returned by the encounter API. */
export type EncounterStatus = NonNullable<EncounterDtoContract['status']>;

export type ListEncountersParams = NonNullable<ListEncountersData['query']>;

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

export async function listEncounters(
  params: ListEncountersParams = {},
): Promise<EncounterListResponse> {
  const { data } = await sdkListEncounters({
    query: params,
    headers: contractHeaders(),
  });
  return {
    ...data,
    encounters: (data.encounters ?? []).map(requireDto),
  };
}

export async function getEncounter(id: string): Promise<EncounterDto> {
  const { data } = await sdkGetEncounter({
    path: { id },
    headers: contractHeaders(),
  });
  return requireDto(data);
}

/**
 * CYN-55: the contract omits `requestBody` for `POST /api/encounters`, so the
 * generated SDK types its options `body` as `never` while the API accepts the
 * documented payload below. The narrow cast is the bridge until the backend
 * contract models the request schema.
 */
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
  const { data } = await sdkCreateEncounter({
    headers: contractHeaders(),
    body,
  } as never);
  return requireDto(data);
}

export async function completeEncounter(
  id: string,
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  return transitionEncounter(id, sdkCompleteEncounter, input);
}

export async function cancelEncounter(
  id: string,
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  return transitionEncounter(id, sdkCancelEncounter, input);
}

export async function enterEncounterInError(
  id: string,
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  return transitionEncounter(id, sdkEnterEncounterInError, input);
}

/**
 * CYN-55: same `requestBody` gap as `createEncounter` for the transition
 * endpoints (`/complete`, `/cancel`, `/enter-in-error`).
 */
async function transitionEncounter(
  id: string,
  sdk: typeof sdkCompleteEncounter,
  input: TransitionEncounterInput,
): Promise<EncounterDto> {
  const body: Record<string, unknown> = {
    rowVersion: input.rowVersion,
  };
  if (input.endedAt !== undefined) {
    body.endedAt = input.endedAt;
  }
  const { data } = await sdk({
    path: { id },
    headers: contractHeaders(),
    body,
  } as never);
  return requireDto(data);
}

export function isForbiddenEncounterError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

export function isStaleEncounterError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function isOpenEncounter(status: EncounterStatus | undefined): boolean {
  return status === 'open';
}

export function isHistoricalEncounter(
  status: EncounterStatus | undefined,
): boolean {
  return (
    status === 'completed' ||
    status === 'canceled' ||
    status === 'enteredInError'
  );
}
