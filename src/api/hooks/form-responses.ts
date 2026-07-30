import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import {
  completeFormResponse,
  createFormResponse,
  getFormResponse,
  getFormResponseRevision,
  listFormResponseRevisions,
  listFormResponses,
  patchFormResponse,
  type CreateFormResponseInput,
  type FormResponse,
  type FormResponseRevision,
  type ListFormResponseRevisionsOptions,
  type ListFormResponsesOptions,
  type PatchFormResponseInput,
} from '@/api/form-responses.ts';
import { STALE_TIMES, type HookMutationOptions } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

// ---------- Form responses ----------

export interface UseFormResponsesQueryOptions extends Omit<
  UseQueryOptions<FormResponse[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  listOptions?: ListFormResponsesOptions;
}

export function useFormResponsesQuery(
  options: UseFormResponsesQueryOptions = {},
) {
  const { listOptions, ...rest } = options;
  return useQuery<FormResponse[], ApiError | Error>({
    queryKey: queryKeys.formResponses.list({
      formVersionId: listOptions?.formVersionId,
      pageSize: listOptions?.pageSize,
    }),
    queryFn: async () => listFormResponses(listOptions ?? {}),
    staleTime: STALE_TIMES.fifteenSeconds,
    ...rest,
  });
}

export interface UseFormResponseQueryOptions extends Omit<
  UseQueryOptions<FormResponse, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  include?: readonly string[];
  enabled?: boolean;
}

export function useFormResponseQuery(
  id: string,
  options: UseFormResponseQueryOptions = {},
) {
  const { include, enabled, ...rest } = options;
  return useQuery<FormResponse, ApiError | Error>({
    queryKey: queryKeys.formResponses.detail(id),
    queryFn: async () => getFormResponse(id, { include }),
    staleTime: STALE_TIMES.fifteenSeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}

export type CreateFormResponseMutationOptions = HookMutationOptions<
  FormResponse,
  ApiError | Error,
  CreateFormResponseInput
>;

export function useCreateFormResponseMutation(
  options: CreateFormResponseMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<FormResponse, ApiError | Error, CreateFormResponseInput>({
    mutationFn: async (input) => {
      const result = await createFormResponse(input);
      return result;
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formResponses.detail(data.id),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formResponses.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export type PatchFormResponseMutationVariables = PatchFormResponseInput &
  RefreshRowVersion;

export type PatchFormResponseMutationOptions = HookMutationOptions<
  FormResponse,
  ApiError | Error,
  { id: string } & PatchFormResponseMutationVariables
>;

export function usePatchFormResponseMutation(
  options: PatchFormResponseMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormResponse,
    ApiError | Error,
    { id: string } & PatchFormResponseMutationVariables
  >({
    mutationFn: async ({ id, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        const result = await patchFormResponse(id, input);
        return result;
      }
      return withConcurrencyRetry<FormResponse>({
        refreshRowVersion,
        perform: async (rowVersion) => {
          const result = await patchFormResponse(id, { ...input, rowVersion });
          return result;
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formResponses.detail(variables.id),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formResponses.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface CompleteFormResponseMutationVariables extends RefreshRowVersion {
  id: string;
  rowVersion: number;
}

export type CompleteFormResponseMutationOptions = HookMutationOptions<
  FormResponse,
  ApiError | Error,
  CompleteFormResponseMutationVariables
>;

export function useCompleteFormResponseMutation(
  options: CompleteFormResponseMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    FormResponse,
    ApiError | Error,
    CompleteFormResponseMutationVariables
  >({
    mutationFn: async ({ id, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        const result = await completeFormResponse(id, rowVersion);
        return result;
      }
      return withConcurrencyRetry<FormResponse>({
        refreshRowVersion,
        perform: async (latest) => {
          const result = await completeFormResponse(id, latest);
          return result;
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.formResponses.detail(variables.id),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formResponses.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.formResponseRevisions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

// ---------- Form response revisions ----------

export interface UseFormResponseRevisionsQueryOptions extends Omit<
  UseQueryOptions<FormResponseRevision[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  listOptions?: ListFormResponseRevisionsOptions;
}

export function useFormResponseRevisionsQuery(
  formResponseId: string,
  options: UseFormResponseRevisionsQueryOptions = {},
) {
  const { listOptions, ...rest } = options;
  return useQuery<FormResponseRevision[], ApiError | Error>({
    queryKey: queryKeys.formResponses.revisions(formResponseId),
    queryFn: async () =>
      listFormResponseRevisions(formResponseId, listOptions ?? {}),
    staleTime: STALE_TIMES.fifteenSeconds,
    ...rest,
  });
}

export interface UseFormResponseRevisionQueryOptions extends Omit<
  UseQueryOptions<FormResponseRevision, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  include?: readonly string[];
  enabled?: boolean;
}

export function useFormResponseRevisionQuery(
  id: string,
  options: UseFormResponseRevisionQueryOptions = {},
) {
  const { include, enabled, ...rest } = options;
  return useQuery<FormResponseRevision, ApiError | Error>({
    queryKey: queryKeys.formResponseRevisions.detail(id),
    queryFn: async () => getFormResponseRevision(id, { include }),
    staleTime: STALE_TIMES.fifteenSeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}
