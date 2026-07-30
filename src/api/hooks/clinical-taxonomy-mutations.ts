import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import {
  createClinicalArea,
  createDiscipline,
  createFacility,
  retireClinicalArea,
  retireDiscipline,
  retireFacility,
  updateClinicalArea,
  updateDiscipline,
  updateFacility,
  type ClinicalAreaDto,
  type CreateClinicalAreaInput,
  type CreateDisciplineInput,
  type CreateFacilityInput,
  type DisciplineDto,
  type FacilityDto,
  type UpdateClinicalAreaInput,
  type UpdateDisciplineInput,
  type UpdateFacilityInput,
} from '@/api/clinical-taxonomy.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import type { HookMutationOptions } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

// ---------- Facilities ----------

export type CreateFacilityMutationOptions = HookMutationOptions<
  FacilityDto,
  ApiError | Error,
  CreateFacilityInput
>;

export function useCreateFacilityMutation(
  options: CreateFacilityMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<FacilityDto, ApiError | Error, CreateFacilityInput>({
    mutationFn: async (input) => createFacility(input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.facilities.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type UpdateFacilityMutationVariables = UpdateFacilityInput &
  RefreshRowVersion;

export type UpdateFacilityMutationOptions = HookMutationOptions<
  FacilityDto,
  ApiError | Error,
  { id: string } & UpdateFacilityMutationVariables
>;

export function useUpdateFacilityMutation(
  id: string,
  options: UpdateFacilityMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FacilityDto,
    ApiError | Error,
    { id: string } & UpdateFacilityMutationVariables
  >({
    mutationFn: async ({ id: _ignored, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        return updateFacility(id, input);
      }
      return withConcurrencyRetry<FacilityDto>({
        refreshRowVersion,
        perform: async (rowVersion) =>
          updateFacility(id, { ...input, rowVersion }),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.facilities.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface RetireFacilityMutationVariables extends RefreshRowVersion {
  id: string;
  rowVersion: number;
}

export type RetireFacilityMutationOptions = HookMutationOptions<
  FacilityDto,
  ApiError | Error,
  RetireFacilityMutationVariables
>;

export function useRetireFacilityMutation(
  options: RetireFacilityMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FacilityDto,
    ApiError | Error,
    RetireFacilityMutationVariables
  >({
    mutationFn: async ({ id, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        return retireFacility(id, rowVersion);
      }
      return withConcurrencyRetry<FacilityDto>({
        refreshRowVersion,
        perform: async (latest) => retireFacility(id, latest),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.facilities.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

// ---------- Clinical areas ----------

export type CreateClinicalAreaMutationOptions = HookMutationOptions<
  ClinicalAreaDto,
  ApiError | Error,
  CreateClinicalAreaInput
>;

export function useCreateClinicalAreaMutation(
  options: CreateClinicalAreaMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ClinicalAreaDto,
    ApiError | Error,
    CreateClinicalAreaInput
  >({
    mutationFn: async (input) => createClinicalArea(input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clinicalAreas.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type UpdateClinicalAreaMutationVariables = UpdateClinicalAreaInput &
  RefreshRowVersion;

export type UpdateClinicalAreaMutationOptions = HookMutationOptions<
  ClinicalAreaDto,
  ApiError | Error,
  { id: string } & UpdateClinicalAreaMutationVariables
>;

export function useUpdateClinicalAreaMutation(
  id: string,
  options: UpdateClinicalAreaMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ClinicalAreaDto,
    ApiError | Error,
    { id: string } & UpdateClinicalAreaMutationVariables
  >({
    mutationFn: async ({ id: _ignored, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        return updateClinicalArea(id, input);
      }
      return withConcurrencyRetry<ClinicalAreaDto>({
        refreshRowVersion,
        perform: async (rowVersion) =>
          updateClinicalArea(id, { ...input, rowVersion }),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clinicalAreas.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface RetireClinicalAreaMutationVariables extends RefreshRowVersion {
  id: string;
  rowVersion: number;
}

export type RetireClinicalAreaMutationOptions = HookMutationOptions<
  ClinicalAreaDto,
  ApiError | Error,
  RetireClinicalAreaMutationVariables
>;

export function useRetireClinicalAreaMutation(
  options: RetireClinicalAreaMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ClinicalAreaDto,
    ApiError | Error,
    RetireClinicalAreaMutationVariables
  >({
    mutationFn: async ({ id, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        return retireClinicalArea(id, rowVersion);
      }
      return withConcurrencyRetry<ClinicalAreaDto>({
        refreshRowVersion,
        perform: async (latest) => retireClinicalArea(id, latest),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clinicalAreas.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

// ---------- Disciplines ----------

export type CreateDisciplineMutationOptions = HookMutationOptions<
  DisciplineDto,
  ApiError | Error,
  CreateDisciplineInput
>;

export function useCreateDisciplineMutation(
  options: CreateDisciplineMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<DisciplineDto, ApiError | Error, CreateDisciplineInput>({
    mutationFn: async (input) => createDiscipline(input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disciplines.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type UpdateDisciplineMutationVariables = UpdateDisciplineInput &
  RefreshRowVersion;

export type UpdateDisciplineMutationOptions = HookMutationOptions<
  DisciplineDto,
  ApiError | Error,
  { id: string } & UpdateDisciplineMutationVariables
>;

export function useUpdateDisciplineMutation(
  id: string,
  options: UpdateDisciplineMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    DisciplineDto,
    ApiError | Error,
    { id: string } & UpdateDisciplineMutationVariables
  >({
    mutationFn: async ({ id: _ignored, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        return updateDiscipline(id, input);
      }
      return withConcurrencyRetry<DisciplineDto>({
        refreshRowVersion,
        perform: async (rowVersion) =>
          updateDiscipline(id, { ...input, rowVersion }),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disciplines.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface RetireDisciplineMutationVariables extends RefreshRowVersion {
  id: string;
  rowVersion: number;
}

export type RetireDisciplineMutationOptions = HookMutationOptions<
  DisciplineDto,
  ApiError | Error,
  RetireDisciplineMutationVariables
>;

export function useRetireDisciplineMutation(
  options: RetireDisciplineMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    DisciplineDto,
    ApiError | Error,
    RetireDisciplineMutationVariables
  >({
    mutationFn: async ({ id, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        return retireDiscipline(id, rowVersion);
      }
      return withConcurrencyRetry<DisciplineDto>({
        refreshRowVersion,
        perform: async (latest) => retireDiscipline(id, latest),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disciplines.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}
