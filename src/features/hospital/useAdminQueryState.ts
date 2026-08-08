import {
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import {
  listDocumentDefinitions,
  type DocumentDefinitionDto,
  type ListDocumentDefinitionsParams,
} from '@/api/document-catalog.ts';
import { describeApiError } from '@/api/error-message.ts';
import {
  listFormVersionPickerOptions,
  type FormVersionPickerOption,
} from '@/api/formVersionPicker.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  listClinicalAreas,
  listDisciplines,
  listFacilities,
  type ClinicalAreaDto,
  type DisciplineDto,
  type FacilityDto,
  type ListClinicalAreasParams,
  type ListDisciplinesParams,
  type ListFacilitiesParams,
} from '@/api/taxonomy.ts';
import { getWorkspace, type HospitalWorkspaceDto } from '@/api/workspace.ts';

export interface AdminListState<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
}

export function useAdminListState<TItem>(
  query: UseQueryResult<TItem[]>,
): AdminListState<TItem> {
  const { t } = useTranslation(['hospital', 'api']);
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
    items: query.data ?? [],
    isLoading: query.isLoading,
    error,
    isForbidden,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface AdminMutationState<TInput, TData> {
  mutate: (input: TInput) => Promise<TData>;
  isPending: boolean;
  error: string | null;
  isConflict: boolean;
  isDuplicateCode: boolean;
  isForbidden: boolean;
  reset: () => void;
}

export function useAdminMutationState<TInput, TData>(
  mutation: UseMutationResult<TData, Error, TInput>,
  isStale: (error: unknown) => boolean,
  isDuplicate: (error: unknown) => boolean,
  isForbidden: (error: unknown) => boolean,
): AdminMutationState<TInput, TData> {
  const { t } = useTranslation(['hospital', 'api']);

  const error = useMemo((): string | null => {
    if (mutation.isError) {
      return describeApiError(mutation.error, t);
    }
    return null;
  }, [mutation.isError, mutation.error, t]);

  return {
    mutate: mutation.mutateAsync,
    isPending: mutation.isPending,
    error,
    isConflict: mutation.isError && isStale(mutation.error),
    isDuplicateCode: mutation.isError && isDuplicate(mutation.error),
    isForbidden: mutation.isError && isForbidden(mutation.error),
    reset: mutation.reset,
  };
}

export function useWorkspaceQuery(): UseQueryResult<HospitalWorkspaceDto> {
  return useQuery({
    queryKey: queryKeys.workspace.detail(),
    queryFn: getWorkspace,
  });
}

export function useListFacilitiesQuery(
  params: ListFacilitiesParams = {},
): UseQueryResult<FacilityDto[]> {
  return useQuery({
    queryKey: queryKeys.facilities.list(params),
    queryFn: async () => {
      const { facilities } = await listFacilities(params);
      return facilities;
    },
  });
}

export function useListClinicalAreasQuery(
  params: ListClinicalAreasParams = {},
): UseQueryResult<ClinicalAreaDto[]> {
  return useQuery({
    queryKey: queryKeys.clinicalAreas.list(params),
    queryFn: async () => {
      const { clinicalAreas } = await listClinicalAreas(params);
      return clinicalAreas;
    },
  });
}

export function useListDisciplinesQuery(
  params: ListDisciplinesParams = {},
): UseQueryResult<DisciplineDto[]> {
  return useQuery({
    queryKey: queryKeys.disciplines.list(params),
    queryFn: async () => {
      const { disciplines } = await listDisciplines(params);
      return disciplines;
    },
  });
}

export function useListDocumentDefinitionsQuery(
  params: ListDocumentDefinitionsParams = {},
): UseQueryResult<DocumentDefinitionDto[]> {
  return useQuery({
    queryKey: queryKeys.documentDefinitions.list(params),
    queryFn: async () => listDocumentDefinitions(params),
  });
}

export function useFormVersionPickerOptionsQuery(): UseQueryResult<
  FormVersionPickerOption[]
> {
  return useQuery({
    queryKey: queryKeys.formDefinitions.versionOptions(),
    queryFn: listFormVersionPickerOptions,
  });
}
