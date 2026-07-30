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
import { describeApiError } from '@/api/error-message.ts';
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
} from '@/api/patients.ts';
import { queryKeys } from '@/api/query-keys.ts';

// ─── List / Search ───────────────────────────────────────────────────────────

function useListPatientsQuery(
  params: ListPatientsParams,
): UseQueryResult<PatientDto[]> {
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: async () => listPatients(params),
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────────

function useGetPatientQuery(
  id: string,
  enabled = true,
): UseQueryResult<PatientDto> {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: async () => getPatient(id),
    enabled,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

function useCreatePatientMutation(): UseMutationResult<
  PatientDto,
  ApiError | Error,
  CreatePatientInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPatient,
    onSuccess: async (data) => {
      void queryClient.setQueryData(queryKeys.patients.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

// ─── Patch (Edit) ────────────────────────────────────────────────────────────

function usePatchPatientMutation(): UseMutationResult<
  PatientDto,
  ApiError | Error,
  { id: string } & PatchPatientInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }) => patchPatient(id, input),
    onSuccess: async (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.patients.detail(variables.id),
        data,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

// ─── Soft Delete ─────────────────────────────────────────────────────────────

function useSoftDeletePatientMutation(): UseMutationResult<
  PatientDto,
  ApiError | Error,
  { id: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => softDeletePatient(id),
    onSuccess: async (data) => {
      void queryClient.setQueryData(queryKeys.patients.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

// ─── Composite Hook: Patient Search ──────────────────────────────────────────

export function usePatientSearch(params: ListPatientsParams) {
  const { t } = useTranslation(['patients', 'api']);
  const query = useListPatientsQuery(params);

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    patients: query.data ?? [],
    isLoading: query.isLoading,
    error,
  };
}

// ─── Composite Hook: Patient Detail ──────────────────────────────────────────

export function usePatientDetail(id: string) {
  const { t } = useTranslation(['patients', 'api']);
  const query = useGetPatientQuery(id);

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    patient: query.data ?? null,
    isLoading: query.isLoading,
    error,
  };
}

// ─── Composite Hook: Patient Registration ────────────────────────────────────

export function useRegisterPatient() {
  const { t } = useTranslation(['patients', 'api']);
  const mutation = useCreatePatientMutation();

  const error = useMemo((): string | null => {
    if (mutation.isError) {
      return describeApiError(mutation.error, t);
    }
    return null;
  }, [mutation.isError, mutation.error, t]);

  return {
    registerPatient: mutation.mutateAsync,
    isRegistering: mutation.isPending,
    error,
    reset: mutation.reset,
    isSuccess: mutation.isSuccess,
    data: mutation.data ?? null,
  };
}

// ─── Composite Hook: Patient Edit ────────────────────────────────────────────

export function useEditPatient() {
  const { t } = useTranslation(['patients', 'api']);
  const mutation = usePatchPatientMutation();

  const error = useMemo((): string | null => {
    if (mutation.isError) {
      return describeApiError(mutation.error, t);
    }
    return null;
  }, [mutation.isError, mutation.error, t]);

  return {
    editPatient: mutation.mutateAsync,
    isEditing: mutation.isPending,
    error,
    reset: mutation.reset,
    isSuccess: mutation.isSuccess,
    data: mutation.data ?? null,
  };
}

// ─── Composite Hook: Patient Soft Delete ─────────────────────────────────────

export function useDeletePatient() {
  const { t } = useTranslation(['patients', 'api']);
  const mutation = useSoftDeletePatientMutation();

  const error = useMemo((): string | null => {
    if (mutation.isError) {
      return describeApiError(mutation.error, t);
    }
    return null;
  }, [mutation.isError, mutation.error, t]);

  return {
    deletePatient: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error,
    reset: mutation.reset,
    isSuccess: mutation.isSuccess,
  };
}

export type {
  CreatePatientInput,
  ListPatientsParams,
  PatientDto,
} from '@/api/patients.ts';
