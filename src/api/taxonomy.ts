import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import {
  listClinicalAreas as sdkListClinicalAreas,
  listFacilities as sdkListFacilities,
  type ClinicalAreaDto as ClinicalAreaDtoContract,
  type ClinicalAreaListResponse as ClinicalAreaListResponseContract,
  type FacilityDto as FacilityDtoContract,
  type FacilityListResponse as FacilityListResponseContract,
  type ListClinicalAreasData,
  type ListFacilitiesData,
} from '@/api/generated';

/**
 * Read models for clinical taxonomy. Derived from the generated contract types
 * with the fields the app relies on as always-present promoted to required.
 */
export type FacilityDto = Required<FacilityDtoContract>;
export type ClinicalAreaDto = Required<ClinicalAreaDtoContract>;
export type FacilityListResponse = FacilityListResponseContract & {
  facilities: FacilityDto[];
};
export type ClinicalAreaListResponse = ClinicalAreaListResponseContract & {
  clinicalAreas: ClinicalAreaDto[];
};

export type ListFacilitiesParams = NonNullable<ListFacilitiesData['query']>;
export type ListClinicalAreasParams = NonNullable<
  ListClinicalAreasData['query']
>;

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
