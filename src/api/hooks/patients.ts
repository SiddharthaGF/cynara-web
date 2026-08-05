import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import { STALE_TIMES, type HookMutationOptions } from '@/api/hooks/_shared.ts';
import {
  createPatient,
  getPatient,
  listPatients,
  patchPatient,
  softDeletePatient,
  type CreatePatientInput,
  type ListPatientsParams,
  type PatchPatientInput,
  type PatientDto,
  type PatientListResponse,
} from '@/api/patients.ts';
import { queryKeys } from '@/api/query-keys.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

export interface UsePatientsQueryOptions extends Omit<
  UseQueryOptions<PatientListResponse, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  listParams?: ListPatientsParams;
}

export function usePatientsQuery(options: UsePatientsQueryOptions = {}) {
  const { listParams, ...rest } = options;
  return useQuery<PatientListResponse, ApiError | Error>({
    queryKey: queryKeys.patients.list({
      mrn: listParams?.mrn,
      nationalId: listParams?.nationalId,
      givenName: listParams?.givenName,
      familyName: listParams?.familyName,
      includeDeleted: listParams?.includeDeleted,
      page: listParams?.page,
      pageSize: listParams?.pageSize,
    }),
    queryFn: async () => listPatients(listParams ?? {}),
    staleTime: STALE_TIMES.twoMinutes,
    ...rest,
  });
}

export interface UsePatientQueryOptions extends Omit<
  UseQueryOptions<PatientDto, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function usePatientQuery(
  id: string,
  options: UsePatientQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<PatientDto, ApiError | Error>({
    queryKey: queryKeys.patients.detail(id),
    queryFn: async () => getPatient(id),
    staleTime: STALE_TIMES.twoMinutes,
    enabled: enabled ?? true,
    ...rest,
  });
}

export type CreatePatientMutationOptions = HookMutationOptions<
  PatientDto,
  ApiError | Error,
  CreatePatientInput
>;

export function useCreatePatientMutation(
  options: CreatePatientMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<PatientDto, ApiError | Error, CreatePatientInput>({
    mutationFn: async (input) => {
      const result = await createPatient(input);
      return result;
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(queryKeys.patients.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface PatchPatientMutationVariables
  extends PatchPatientInput, RefreshRowVersion {}

export type PatchPatientMutationOptions = HookMutationOptions<
  PatientDto,
  ApiError | Error,
  { id: string } & PatchPatientMutationVariables
>;

export function usePatchPatientMutation(
  options: PatchPatientMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    PatientDto,
    ApiError | Error,
    { id: string } & PatchPatientMutationVariables
  >({
    mutationFn: async ({ id, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        const result = await patchPatient(id, input);
        return result;
      }
      return withConcurrencyRetry<PatientDto>({
        refreshRowVersion,
        perform: async (rowVersion) => {
          const result = await patchPatient(id, { ...input, rowVersion });
          return result;
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.patients.detail(variables.id),
        data,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface SoftDeletePatientMutationVariables {
  id: string;
  rowVersion: number;
}

export type SoftDeletePatientMutationOptions = HookMutationOptions<
  PatientDto,
  ApiError | Error,
  SoftDeletePatientMutationVariables
>;

export function useSoftDeletePatientMutation(
  options: SoftDeletePatientMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    PatientDto,
    ApiError | Error,
    SoftDeletePatientMutationVariables
  >({
    mutationFn: async ({ id, rowVersion }) => {
      const result = await softDeletePatient(id, rowVersion);
      return result;
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.patients.detail(variables.id),
        data,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}
