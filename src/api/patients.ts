import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  createPatient as sdkCreatePatient,
  getPatient as sdkGetPatient,
  patchPatient as sdkPatchPatient,
  searchPatients as sdkSearchPatients,
  softDeletePatient as sdkSoftDeletePatient,
  type PatientDto as PatientDtoContract,
  type PatientListResponse as PatientListResponseContract,
  type SearchPatientsData,
} from '@/api/generated';

/**
 * Read model for the patient registry. Derived from the generated contract
 * type with the fields the app relies on as always-present promoted to
 * required. Blood type is captured at registration and immutable.
 */
export type PatientDto = Required<PatientDtoContract>;
export type PatientListResponse = PatientListResponseContract & {
  patients: PatientDto[];
};

/** Sex values accepted by cynara-api. */
export type PatientSex = NonNullable<PatientDtoContract['sex']>;

/** ABO/Rh blood type accepted by cynara-api, in clinical notation. */
export type PatientBloodType = NonNullable<PatientDtoContract['bloodType']>;

/** Lifecycle status returned by the registry. */
export type PatientStatus = NonNullable<PatientDtoContract['status']>;

export type ListPatientsParams = NonNullable<SearchPatientsData['query']>;

export interface CreatePatientInput {
  mrn: string;
  nationalId?: string | null;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: PatientSex;
  bloodType: PatientBloodType;
}

export interface PatchPatientInput {
  nationalId?: string | null;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: PatientSex;
  bloodType: PatientBloodType;
  rowVersion: number;
}

export async function listPatients(
  params: ListPatientsParams = {},
): Promise<PatientListResponse> {
  const { data } = await sdkSearchPatients({
    query: params,
    headers: contractHeaders(),
  });
  return {
    ...data,
    patients: data.patients.map(requireDto),
  };
}

export async function getPatient(id: string): Promise<PatientDto> {
  const { data } = await sdkGetPatient({
    path: { id },
    headers: contractHeaders(),
  });
  return requireDto(data);
}

/**
 * CYN-55: the contract omits `requestBody` for `POST /api/patients`, so the
 * generated SDK types its options `body` as `never` while the API accepts the
 * documented payload below.
 */
export async function createPatient(
  input: CreatePatientInput,
): Promise<PatientDto> {
  const body: Record<string, unknown> = {
    mrn: input.mrn,
    givenName: input.givenName,
    familyName: input.familyName,
    birthDate: input.birthDate,
    sex: input.sex,
    bloodType: input.bloodType,
  };
  if (input.nationalId !== undefined) {
    body.nationalId = input.nationalId;
  }
  const { data } = await sdkCreatePatient({
    headers: contractHeaders(),
    body,
  } as never);
  return requireDto(data);
}

/** CYN-55: same `requestBody` gap as `createPatient` for `PATCH /api/patients/{id}`. */
export async function patchPatient(
  id: string,
  input: PatchPatientInput,
): Promise<PatientDto> {
  const body: Record<string, unknown> = {
    givenName: input.givenName,
    familyName: input.familyName,
    birthDate: input.birthDate,
    sex: input.sex,
    bloodType: input.bloodType,
    rowVersion: input.rowVersion,
  };
  if (input.nationalId !== undefined) {
    body.nationalId = input.nationalId;
  }
  const { data } = await sdkPatchPatient({
    path: { id },
    headers: contractHeaders(),
    body,
  } as never);
  return requireDto(data);
}

/** CYN-55: same `requestBody` gap as `createPatient` for the soft-delete endpoint. */
export async function softDeletePatient(
  id: string,
  rowVersion: number,
): Promise<PatientDto> {
  const { data } = await sdkSoftDeletePatient({
    path: { id },
    headers: contractHeaders(),
    body: { rowVersion },
  } as never);
  return requireDto(data);
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
