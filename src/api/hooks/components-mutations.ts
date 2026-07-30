import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import {
  createComponentDefinition,
  createComponentDraft,
  createComponentVersion,
  deleteComponentDefinition,
  patchComponentDefinition,
  patchComponentVersion,
  publishComponentVersion,
  retireComponentVersion,
  softDeleteComponentDraft,
  type CreateComponentDefinitionInput,
  type CreateComponentVersionInput,
  type PatchComponentVersionInput,
} from '@/api/components.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import type { HookMutationOptions } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { ComponentSummary } from '@/features/forms/types.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

interface ComponentVersionActionVariables extends RefreshRowVersion {
  versionId: string;
  rowVersion: number;
}

export type CreateComponentDefinitionMutationOptions = HookMutationOptions<
  ComponentSummary,
  ApiError | Error,
  CreateComponentDefinitionInput
>;

export function useCreateComponentDefinitionMutation(
  options: CreateComponentDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ComponentSummary,
    ApiError | Error,
    CreateComponentDefinitionInput
  >({
    mutationFn: async (input) => createComponentDefinition(input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface PatchComponentDefinitionMutationVariables {
  id: string;
  input: { code?: string; name?: string };
}

export type PatchComponentDefinitionMutationOptions = HookMutationOptions<
  ComponentSummary,
  ApiError | Error,
  PatchComponentDefinitionMutationVariables
>;

export function usePatchComponentDefinitionMutation(
  options: PatchComponentDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ComponentSummary,
    ApiError | Error,
    PatchComponentDefinitionMutationVariables
  >({
    mutationFn: async ({ id, input }) => patchComponentDefinition(id, input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.detail(variables.id),
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface DeleteComponentDefinitionMutationVariables {
  id: string;
}

export type DeleteComponentDefinitionMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  DeleteComponentDefinitionMutationVariables
>;

export function useDeleteComponentDefinitionMutation(
  options: DeleteComponentDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    DeleteComponentDefinitionMutationVariables
  >({
    mutationFn: async ({ id }) => {
      await deleteComponentDefinition(id);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.detail(variables.id),
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface CreateComponentDraftMutationVariables {
  definitionId: string;
}

export type CreateComponentDraftMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  CreateComponentDraftMutationVariables
>;

export function useCreateComponentDraftMutation(
  options: CreateComponentDraftMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    CreateComponentDraftMutationVariables
  >({
    mutationFn: async ({ definitionId }) => {
      await createComponentDraft(definitionId);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.detail(variables.definitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.versions(
          variables.definitionId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface SoftDeleteComponentDraftMutationVariables {
  definitionId: string;
}

export type SoftDeleteComponentDraftMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  SoftDeleteComponentDraftMutationVariables
>;

export function useSoftDeleteComponentDraftMutation(
  options: SoftDeleteComponentDraftMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    SoftDeleteComponentDraftMutationVariables
  >({
    mutationFn: async ({ definitionId }) => {
      await softDeleteComponentDraft(definitionId);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.detail(variables.definitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.versions(
          variables.definitionId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type CreateComponentVersionMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  CreateComponentVersionInput
>;

export function useCreateComponentVersionMutation(
  options: CreateComponentVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    CreateComponentVersionInput
  >({
    mutationFn: async (input) => {
      await createComponentVersion(input);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.detail(
          variables.componentDefinitionId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentDefinitions.versions(
          variables.componentDefinitionId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type PatchComponentVersionMutationVariables =
  PatchComponentVersionInput & RefreshRowVersion;

export type PatchComponentVersionMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  { versionId: string } & PatchComponentVersionMutationVariables
>;

export function usePatchComponentVersionMutation(
  options: PatchComponentVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    { versionId: string } & PatchComponentVersionMutationVariables
  >({
    mutationFn: async ({ versionId, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        await patchComponentVersion(versionId, input);
        return;
      }
      // eslint-disable-next-line typescript/no-invalid-void-type
      return withConcurrencyRetry<void>({
        refreshRowVersion,
        perform: async (rowVersion) => {
          await patchComponentVersion(versionId, { ...input, rowVersion });
        },
      });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentVersions.detail(variables.versionId),
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type PublishComponentVersionMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  ComponentVersionActionVariables
>;

export function usePublishComponentVersionMutation(
  options: PublishComponentVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    ComponentVersionActionVariables
  >({
    mutationFn: async ({ versionId, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        await publishComponentVersion(versionId, rowVersion);
        return;
      }
      // eslint-disable-next-line typescript/no-invalid-void-type
      return withConcurrencyRetry<void>({
        refreshRowVersion,
        perform: async (latest) => {
          await publishComponentVersion(versionId, latest);
        },
      });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentVersions.detail(variables.versionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type RetireComponentVersionMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  ComponentVersionActionVariables
>;

export function useRetireComponentVersionMutation(
  options: RetireComponentVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    ComponentVersionActionVariables
  >({
    mutationFn: async ({ versionId, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        await retireComponentVersion(versionId, rowVersion);
        return;
      }
      // eslint-disable-next-line typescript/no-invalid-void-type
      return withConcurrencyRetry<void>({
        refreshRowVersion,
        perform: async (latest) => {
          await retireComponentVersion(versionId, latest);
        },
      });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.componentVersions.detail(variables.versionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}
