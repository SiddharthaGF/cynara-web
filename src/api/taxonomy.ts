import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  createClinicalArea as sdkCreateClinicalArea,
  createDiscipline as sdkCreateDiscipline,
  createFacility as sdkCreateFacility,
  listClinicalAreas as sdkListClinicalAreas,
  listDisciplines as sdkListDisciplines,
  listFacilities as sdkListFacilities,
  patchClinicalArea as sdkPatchClinicalArea,
  patchDiscipline as sdkPatchDiscipline,
  patchFacility as sdkPatchFacility,
  retireClinicalArea as sdkRetireClinicalArea,
  retireDiscipline as sdkRetireDiscipline,
  retireFacility as sdkRetireFacility,
  type ClinicalAreaDto as ClinicalAreaDtoContract,
  type ClinicalAreaListResponse as ClinicalAreaListResponseContract,
  type DisciplineDto as DisciplineDtoContract,
  type DisciplineListResponse as DisciplineListResponseContract,
  type FacilityDto as FacilityDtoContract,
  type FacilityListResponse as FacilityListResponseContract,
  type ListClinicalAreasData,
  type ListDisciplinesData,
  type ListFacilitiesData,
} from '@/api/generated';

/**
 * Read models for the clinical taxonomy hierarchy
 * (Facility → ClinicalArea → Discipline). Derived from the generated contract
 * types with the fields the app relies on as always-present promoted to
 * required.
 */
export type FacilityDto = Required<FacilityDtoContract>;
export type ClinicalAreaDto = Required<ClinicalAreaDtoContract>;
export type DisciplineDto = Required<DisciplineDtoContract>;
export type FacilityListResponse = FacilityListResponseContract & {
  facilities: FacilityDto[];
};
export type ClinicalAreaListResponse = ClinicalAreaListResponseContract & {
  clinicalAreas: ClinicalAreaDto[];
};
export type DisciplineListResponse = DisciplineListResponseContract & {
  disciplines: DisciplineDto[];
};

export type ListFacilitiesParams = NonNullable<ListFacilitiesData['query']>;
export type ListClinicalAreasParams = NonNullable<
  ListClinicalAreasData['query']
>;
export type ListDisciplinesParams = NonNullable<ListDisciplinesData['query']>;

/** Lifecycle status shared by the taxonomy records. */
export type TaxonomyStatus = NonNullable<FacilityDtoContract['status']>;

export interface CreateFacilityInput {
  code: string;
  name: string;
}

export interface UpdateTaxonomyInput {
  name: string;
  rowVersion: number;
}

export interface CreateClinicalAreaInput extends CreateFacilityInput {
  facilityId: string;
}

export interface CreateDisciplineInput extends CreateFacilityInput {
  clinicalAreaId: string;
}

export async function listFacilities(
  params: ListFacilitiesParams = {},
): Promise<FacilityListResponse> {
  const { data } = await sdkListFacilities({
    query: params,
    headers: contractHeaders(),
  });
  return {
    ...data,
    facilities: (data.facilities ?? []).map(requireDto),
  };
}

export async function listClinicalAreas(
  params: ListClinicalAreasParams = {},
): Promise<ClinicalAreaListResponse> {
  const { data } = await sdkListClinicalAreas({
    query: params,
    headers: contractHeaders(),
  });
  return {
    ...data,
    clinicalAreas: (data.clinicalAreas ?? []).map(requireDto),
  };
}

export async function listDisciplines(
  params: ListDisciplinesParams = {},
): Promise<DisciplineListResponse> {
  const { data } = await sdkListDisciplines({
    query: params,
    headers: contractHeaders(),
  });
  return {
    ...data,
    disciplines: (data.disciplines ?? []).map(requireDto),
  };
}

/**
 * CYN-55: the taxonomy mutation contracts omit `requestBody`, so the
 * generated SDK types their options `body` as `never` while the API accepts
 * the documented payloads. The narrow cast is the bridge until the backend
 * contract models the request schemas.
 */
export async function createFacility(
  input: CreateFacilityInput,
): Promise<FacilityDto> {
  const { data } = await sdkCreateFacility({
    headers: contractHeaders(),
    body: { code: input.code, name: input.name },
  } as never);
  return requireDto(data);
}

export async function patchFacility(
  id: string,
  input: UpdateTaxonomyInput,
): Promise<FacilityDto> {
  const { data } = await sdkPatchFacility({
    path: { id },
    headers: contractHeaders(),
    body: { name: input.name, rowVersion: input.rowVersion },
  } as never);
  return requireDto(data);
}

export async function retireFacility(
  id: string,
  rowVersion: number,
): Promise<FacilityDto> {
  const { data } = await sdkRetireFacility({
    path: { id },
    headers: contractHeaders(),
    body: { rowVersion },
  } as never);
  return requireDto(data);
}

export async function createClinicalArea(
  input: CreateClinicalAreaInput,
): Promise<ClinicalAreaDto> {
  const { data } = await sdkCreateClinicalArea({
    headers: contractHeaders(),
    body: {
      code: input.code,
      name: input.name,
      facilityId: input.facilityId,
    },
  } as never);
  return requireDto(data);
}

export async function patchClinicalArea(
  id: string,
  input: UpdateTaxonomyInput,
): Promise<ClinicalAreaDto> {
  const { data } = await sdkPatchClinicalArea({
    path: { id },
    headers: contractHeaders(),
    body: { name: input.name, rowVersion: input.rowVersion },
  } as never);
  return requireDto(data);
}

export async function retireClinicalArea(
  id: string,
  rowVersion: number,
): Promise<ClinicalAreaDto> {
  const { data } = await sdkRetireClinicalArea({
    path: { id },
    headers: contractHeaders(),
    body: { rowVersion },
  } as never);
  return requireDto(data);
}

export async function createDiscipline(
  input: CreateDisciplineInput,
): Promise<DisciplineDto> {
  const { data } = await sdkCreateDiscipline({
    headers: contractHeaders(),
    body: {
      code: input.code,
      name: input.name,
      clinicalAreaId: input.clinicalAreaId,
    },
  } as never);
  return requireDto(data);
}

export async function patchDiscipline(
  id: string,
  input: UpdateTaxonomyInput,
): Promise<DisciplineDto> {
  const { data } = await sdkPatchDiscipline({
    path: { id },
    headers: contractHeaders(),
    body: { name: input.name, rowVersion: input.rowVersion },
  } as never);
  return requireDto(data);
}

export async function retireDiscipline(
  id: string,
  rowVersion: number,
): Promise<DisciplineDto> {
  const { data } = await sdkRetireDiscipline({
    path: { id },
    headers: contractHeaders(),
    body: { rowVersion },
  } as never);
  return requireDto(data);
}

export function isForbiddenTaxonomyError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

/** 409 is the optimistic-concurrency signal on taxonomy mutations. */
export function isStaleTaxonomyError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function isDuplicateTaxonomyCodeError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status !== 409 && error.status !== 422 && error.status !== 400) {
    return false;
  }
  const detail = `${error.title ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    detail.includes('code') &&
    (detail.includes('unique') ||
      detail.includes('already exists') ||
      detail.includes('duplicate') ||
      detail.includes('in use'))
  );
}
