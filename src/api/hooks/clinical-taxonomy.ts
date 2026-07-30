import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import {
  getClinicalArea,
  getDiscipline,
  getFacility,
  listClinicalAreas,
  listDisciplines,
  listFacilities,
  type ClinicalAreaDto,
  type DisciplineDto,
  type FacilityDto,
} from '@/api/clinical-taxonomy.ts';
import { STALE_TIMES } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';

export * from './clinical-taxonomy-mutations.ts';

// ---------- Facilities ----------

export interface UseFacilitiesQueryOptions extends Omit<
  UseQueryOptions<FacilityDto[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  includeRetired?: boolean;
}

export function useFacilitiesQuery(options: UseFacilitiesQueryOptions = {}) {
  const { includeRetired, ...rest } = options;
  return useQuery<FacilityDto[], ApiError | Error>({
    queryKey: queryKeys.facilities.list({ includeRetired }),
    queryFn: async () => listFacilities({ includeRetired }),
    staleTime: STALE_TIMES.fiveMinutes,
    ...rest,
  });
}

export interface UseFacilityQueryOptions extends Omit<
  UseQueryOptions<FacilityDto, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useFacilityQuery(
  id: string,
  options: UseFacilityQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<FacilityDto, ApiError | Error>({
    queryKey: queryKeys.facilities.list({ facilityId: id }),
    queryFn: async () => getFacility(id),
    staleTime: STALE_TIMES.fiveMinutes,
    enabled: enabled ?? true,
    ...rest,
  });
}

// ---------- Clinical areas ----------

export interface UseClinicalAreasQueryOptions extends Omit<
  UseQueryOptions<ClinicalAreaDto[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  facilityId?: string;
  includeRetired?: boolean;
}

export function useClinicalAreasQuery(
  options: UseClinicalAreasQueryOptions = {},
) {
  const { facilityId, includeRetired, ...rest } = options;
  return useQuery<ClinicalAreaDto[], ApiError | Error>({
    queryKey: queryKeys.clinicalAreas.list({ facilityId, includeRetired }),
    queryFn: async () => listClinicalAreas({ facilityId, includeRetired }),
    staleTime: STALE_TIMES.fiveMinutes,
    ...rest,
  });
}

export interface UseClinicalAreaQueryOptions extends Omit<
  UseQueryOptions<ClinicalAreaDto, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useClinicalAreaQuery(
  id: string,
  options: UseClinicalAreaQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<ClinicalAreaDto, ApiError | Error>({
    queryKey: queryKeys.clinicalAreas.list({ clinicalAreaId: id }),
    queryFn: async () => getClinicalArea(id),
    staleTime: STALE_TIMES.fiveMinutes,
    enabled: enabled ?? true,
    ...rest,
  });
}

// ---------- Disciplines ----------

export interface UseDisciplinesQueryOptions extends Omit<
  UseQueryOptions<DisciplineDto[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  clinicalAreaId?: string;
  includeRetired?: boolean;
}

export function useDisciplinesQuery(options: UseDisciplinesQueryOptions = {}) {
  const { clinicalAreaId, includeRetired, ...rest } = options;
  return useQuery<DisciplineDto[], ApiError | Error>({
    queryKey: queryKeys.disciplines.list({ clinicalAreaId, includeRetired }),
    queryFn: async () => listDisciplines({ clinicalAreaId, includeRetired }),
    staleTime: STALE_TIMES.fiveMinutes,
    ...rest,
  });
}

export interface UseDisciplineQueryOptions extends Omit<
  UseQueryOptions<DisciplineDto, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useDisciplineQuery(
  id: string,
  options: UseDisciplineQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<DisciplineDto, ApiError | Error>({
    queryKey: queryKeys.disciplines.list({ clinicalAreaId: id }),
    queryFn: async () => getDiscipline(id),
    staleTime: STALE_TIMES.fiveMinutes,
    enabled: enabled ?? true,
    ...rest,
  });
}
