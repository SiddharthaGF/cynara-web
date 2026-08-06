import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import {
  cancelEncounter,
  completeEncounter,
  createEncounter,
  enterEncounterInError,
  getEncounter,
  listEncounters,
  type CreateEncounterInput,
  type EncounterDto,
  type EncounterListResponse,
  type ListEncountersParams,
  type TransitionEncounterInput,
} from '@/api/encounters.ts';
import { describeApiError } from '@/api/error-message.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  listClinicalAreas,
  listFacilities,
  type ClinicalAreaDto,
  type FacilityDto,
  type ListClinicalAreasParams,
  type ListFacilitiesParams,
} from '@/api/taxonomy.ts';

// ─── Queries ─────────────────────────────────────────────────────────────────

function useListEncountersQuery(
  params: ListEncountersParams,
  enabled = true,
): UseQueryResult<EncounterListResponse> {
  return useQuery({
    queryKey: queryKeys.encounters.list(params),
    queryFn: async () => listEncounters(params),
    enabled,
  });
}

function useGetEncounterQuery(
  id: string,
  enabled = true,
): UseQueryResult<EncounterDto> {
  return useQuery({
    queryKey: queryKeys.encounters.detail(id),
    queryFn: async () => getEncounter(id),
    enabled,
  });
}

function useListFacilitiesQuery(
  params: ListFacilitiesParams = {},
  enabled = true,
): UseQueryResult<{ facilities: FacilityDto[] }> {
  return useQuery({
    queryKey: queryKeys.facilities.list(params),
    queryFn: async () => listFacilities(params),
    enabled,
  });
}

function useListClinicalAreasQuery(
  params: ListClinicalAreasParams = {},
  enabled = true,
): UseQueryResult<{ clinicalAreas: ClinicalAreaDto[] }> {
  return useQuery({
    queryKey: queryKeys.clinicalAreas.list(params),
    queryFn: async () => listClinicalAreas(params),
    enabled,
  });
}

async function invalidateEncounterQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  encounter: EncounterDto,
): Promise<void> {
  queryClient.setQueryData(
    queryKeys.encounters.detail(encounter.id),
    encounter,
  );
  await queryClient.invalidateQueries({
    queryKey: queryKeys.encounters.all,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

function useCreateEncounterMutation(): UseMutationResult<
  EncounterDto,
  ApiError | Error,
  CreateEncounterInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEncounter,
    onSuccess: async (data) => {
      await invalidateEncounterQueries(queryClient, data);
    },
  });
}

function useCompleteEncounterMutation(): UseMutationResult<
  EncounterDto,
  ApiError | Error,
  { id: string } & TransitionEncounterInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) => completeEncounter(id, input),
    onSuccess: async (data) => {
      await invalidateEncounterQueries(queryClient, data);
    },
  });
}

function useCancelEncounterMutation(): UseMutationResult<
  EncounterDto,
  ApiError | Error,
  { id: string } & TransitionEncounterInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) => cancelEncounter(id, input),
    onSuccess: async (data) => {
      await invalidateEncounterQueries(queryClient, data);
    },
  });
}

function useEnterEncounterInErrorMutation(): UseMutationResult<
  EncounterDto,
  ApiError | Error,
  { id: string } & TransitionEncounterInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) => enterEncounterInError(id, input),
    onSuccess: async (data) => {
      await invalidateEncounterQueries(queryClient, data);
    },
  });
}

// ─── Composite hooks ─────────────────────────────────────────────────────────

export function usePatientEncounters(patientId: string): {
  encounters: EncounterDto[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
} {
  const { t } = useTranslation(['encounters', 'api']);
  const query = useListEncountersQuery({ patientId }, patientId.length > 0);

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  const isForbidden =
    query.isError &&
    query.error instanceof ApiError &&
    (query.error.status === 401 || query.error.status === 403);

  return {
    encounters: query.data?.encounters ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    isForbidden,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useEncounterDetail(id: string): {
  encounter: EncounterDto | null;
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
} {
  const { t } = useTranslation(['encounters', 'api']);
  const query = useGetEncounterQuery(id);

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  const isForbidden =
    query.isError &&
    query.error instanceof ApiError &&
    (query.error.status === 401 || query.error.status === 403);

  return {
    encounter: query.data ?? null,
    isLoading: query.isLoading,
    error,
    isForbidden,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useCreateEncounter(): {
  createEncounter: (input: CreateEncounterInput) => Promise<EncounterDto>;
  isCreating: boolean;
  error: string | null;
  reset: () => void;
} {
  const { t } = useTranslation(['encounters', 'api']);
  const mutation = useCreateEncounterMutation();

  const error = useMemo((): string | null => {
    if (mutation.isError) {
      return describeApiError(mutation.error, t);
    }
    return null;
  }, [mutation.isError, mutation.error, t]);

  return {
    createEncounter: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error,
    reset: mutation.reset,
  };
}

export function useEncounterTransitions(): {
  complete: (
    input: { id: string } & TransitionEncounterInput,
  ) => Promise<EncounterDto>;
  cancel: (
    input: { id: string } & TransitionEncounterInput,
  ) => Promise<EncounterDto>;
  enterInError: (
    input: { id: string } & TransitionEncounterInput,
  ) => Promise<EncounterDto>;
  isTransitioning: boolean;
  error: string | null;
  reset: () => void;
} {
  const { t } = useTranslation(['encounters', 'api']);
  const completeMutation = useCompleteEncounterMutation();
  const cancelMutation = useCancelEncounterMutation();
  const enterInErrorMutation = useEnterEncounterInErrorMutation();

  const activeError =
    completeMutation.error ??
    cancelMutation.error ??
    enterInErrorMutation.error;

  const error = useMemo((): string | null => {
    if (activeError) {
      return describeApiError(activeError, t);
    }
    return null;
  }, [activeError, t]);

  return {
    complete: completeMutation.mutateAsync,
    cancel: cancelMutation.mutateAsync,
    enterInError: enterInErrorMutation.mutateAsync,
    isTransitioning:
      completeMutation.isPending ||
      cancelMutation.isPending ||
      enterInErrorMutation.isPending,
    error,
    reset: () => {
      completeMutation.reset();
      cancelMutation.reset();
      enterInErrorMutation.reset();
    },
  };
}

export function useActiveFacilities(enabled = true): {
  facilities: FacilityDto[];
  isLoading: boolean;
  error: string | null;
} {
  const { t } = useTranslation(['encounters', 'api']);
  const query = useListFacilitiesQuery({ includeRetired: false }, enabled);

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    facilities: query.data?.facilities ?? [],
    isLoading: query.isLoading,
    error,
  };
}

export function useActiveClinicalAreas(facilityId: string | null): {
  clinicalAreas: ClinicalAreaDto[];
  isLoading: boolean;
  error: string | null;
} {
  const { t } = useTranslation(['encounters', 'api']);
  const enabled = facilityId !== null && facilityId.length > 0;
  const query = useListClinicalAreasQuery(
    { facilityId: facilityId ?? undefined, includeRetired: false },
    enabled,
  );

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    clinicalAreas: enabled ? (query.data?.clinicalAreas ?? []) : [],
    isLoading: enabled && query.isLoading,
    error,
  };
}

export type {
  CreateEncounterInput,
  EncounterDto,
  ListEncountersParams,
} from '@/api/encounters.ts';
