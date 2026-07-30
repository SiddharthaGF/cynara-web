import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import {
  createDraft,
  createForm,
  createFormVersion,
  patchFormDefinition,
  patchFormVersion,
  publishFormVersion,
  rejectFormVersionReview,
  retireFormDefinition,
  retireFormVersion,
  softDeleteDraft,
  submitFormVersionForReview,
  updateFormDraft,
  withdrawFormVersionReview,
} from '@/api/forms.ts';
import type { HookMutationOptions } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

interface VersionActionVariables extends RefreshRowVersion {
  versionId: string;
  rowVersion: number;
}

export interface CreateFormMutationInput {
  code: string;
  name: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
}

export type CreateFormMutationOptions = HookMutationOptions<
  FormSummary,
  ApiError | Error,
  CreateFormMutationInput
>;

export function useCreateFormMutation(options: CreateFormMutationOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation<FormSummary, ApiError | Error, CreateFormMutationInput>({
    mutationFn: async (input) => createForm(input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface PatchFormDefinitionInput {
  code?: string;
  name?: string;
}

export type PatchFormDefinitionMutationOptions = HookMutationOptions<
  FormSummary,
  ApiError | Error,
  { id: string; input: PatchFormDefinitionInput }
>;

export function usePatchFormDefinitionMutation(
  options: PatchFormDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormSummary,
    ApiError | Error,
    { id: string; input: PatchFormDefinitionInput }
  >({
    mutationFn: async ({ id, input }) => patchFormDefinition(id, input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface RetireFormDefinitionMutationVariables extends RefreshRowVersion {
  id: string;
  rowVersion: number;
}

export type RetireFormDefinitionMutationOptions = HookMutationOptions<
  FormSummary,
  ApiError | Error,
  RetireFormDefinitionMutationVariables
>;

export function useRetireFormDefinitionMutation(
  options: RetireFormDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormSummary,
    ApiError | Error,
    RetireFormDefinitionMutationVariables
  >({
    mutationFn: async ({ id, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        return retireFormDefinition(id, rowVersion);
      }
      return withConcurrencyRetry<FormSummary>({
        refreshRowVersion,
        perform: async (latest) => retireFormDefinition(id, latest),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface UpdateFormDraftInput {
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
  rowVersion: number;
}

export type UpdateFormDraftMutationVariables = UpdateFormDraftInput &
  RefreshRowVersion;

export type UpdateFormDraftMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  { code: string } & UpdateFormDraftMutationVariables
>;

export function useUpdateFormDraftMutation(
  options: UpdateFormDraftMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormVersion,
    ApiError | Error,
    { code: string } & UpdateFormDraftMutationVariables
  >({
    mutationFn: async ({ code, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        return updateFormDraft(code, input);
      }
      return withConcurrencyRetry<FormVersion>({
        refreshRowVersion,
        perform: async (rowVersion) =>
          updateFormDraft(code, { ...input, rowVersion }),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.forms.draft(variables.code),
        data,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface CreateDraftMutationVariables {
  definitionId: string;
}

export type CreateDraftMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  CreateDraftMutationVariables
>;

export function useCreateDraftMutation(
  options: CreateDraftMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormVersion,
    ApiError | Error,
    CreateDraftMutationVariables
  >({
    mutationFn: async ({ definitionId }) => createDraft(definitionId),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.detail(variables.definitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.versions(variables.definitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface CreateFormVersionInput {
  formDefinitionId: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
  rowVersion: number;
}

export type CreateFormVersionMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  CreateFormVersionInput
>;

export function useCreateFormVersionMutation(
  options: CreateFormVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<FormVersion, ApiError | Error, CreateFormVersionInput>({
    mutationFn: async (input) => createFormVersion(input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.detail(variables.formDefinitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface PatchFormVersionInput {
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
  rowVersion: number;
}

export type PatchFormVersionMutationVariables = PatchFormVersionInput &
  RefreshRowVersion;

export type PatchFormVersionMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  { versionId: string } & PatchFormVersionMutationVariables
>;

export function usePatchFormVersionMutation(
  options: PatchFormVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormVersion,
    ApiError | Error,
    { versionId: string } & PatchFormVersionMutationVariables
  >({
    mutationFn: async ({ versionId, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        return patchFormVersion(versionId, input);
      }
      return withConcurrencyRetry<FormVersion>({
        refreshRowVersion,
        perform: async (rowVersion) =>
          patchFormVersion(versionId, { ...input, rowVersion }),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formVersions.detail(variables.versionId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface SoftDeleteDraftMutationVariables {
  definitionId: string;
  reason: string;
}

export type SoftDeleteDraftMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  SoftDeleteDraftMutationVariables
>;

export function useSoftDeleteDraftMutation(
  options: SoftDeleteDraftMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    SoftDeleteDraftMutationVariables
  >({
    mutationFn: async ({ definitionId, reason }) =>
      softDeleteDraft(definitionId, reason),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.detail(variables.definitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formDefinitions.versions(variables.definitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

function buildVersionActionMutation<TData>(
  performAction: (versionId: string, rowVersion: number) => Promise<TData>,
) {
  return async ({
    versionId,
    rowVersion,
    refreshRowVersion,
  }: VersionActionVariables): Promise<TData> => {
    if (!refreshRowVersion) {
      return performAction(versionId, rowVersion);
    }
    return withConcurrencyRetry<TData>({
      refreshRowVersion,
      perform: async (latest) => performAction(versionId, latest),
    });
  };
}

export type SubmitFormVersionForReviewMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  VersionActionVariables
>;

export function useSubmitFormVersionForReviewMutation(
  options: SubmitFormVersionForReviewMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<FormVersion, ApiError | Error, VersionActionVariables>({
    mutationFn: buildVersionActionMutation(submitFormVersionForReview),
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formVersions.detail(variables.versionId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type WithdrawFormVersionReviewMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  VersionActionVariables
>;

export function useWithdrawFormVersionReviewMutation(
  options: WithdrawFormVersionReviewMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<FormVersion, ApiError | Error, VersionActionVariables>({
    mutationFn: buildVersionActionMutation(withdrawFormVersionReview),
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formVersions.detail(variables.versionId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type PublishFormVersionMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  VersionActionVariables
>;

export function usePublishFormVersionMutation(
  options: PublishFormVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<FormVersion, ApiError | Error, VersionActionVariables>({
    mutationFn: buildVersionActionMutation(publishFormVersion),
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formVersions.detail(variables.versionId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface RejectFormVersionReviewInput {
  versionId: string;
  rowVersion: number;
  comment: string;
}

export type RejectFormVersionReviewVariables = RefreshRowVersion;

export type RejectFormVersionReviewMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  RejectFormVersionReviewInput & RejectFormVersionReviewVariables
>;

export function useRejectFormVersionReviewMutation(
  options: RejectFormVersionReviewMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormVersion,
    ApiError | Error,
    RejectFormVersionReviewInput & RejectFormVersionReviewVariables
  >({
    mutationFn: async ({
      versionId,
      rowVersion,
      comment,
      refreshRowVersion,
    }) => {
      if (!refreshRowVersion) {
        return rejectFormVersionReview({ versionId, rowVersion, comment });
      }
      return withConcurrencyRetry<FormVersion>({
        refreshRowVersion,
        perform: async (latest) =>
          rejectFormVersionReview({
            versionId,
            rowVersion: latest,
            comment,
          }),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formVersions.detail(variables.versionId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type RetireFormVersionMutationOptions = HookMutationOptions<
  FormVersion,
  ApiError | Error,
  VersionActionVariables
>;

export function useRetireFormVersionMutation(
  options: RetireFormVersionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<FormVersion, ApiError | Error, VersionActionVariables>({
    mutationFn: buildVersionActionMutation(retireFormVersion),
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formVersions.detail(variables.versionId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formVersions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}
