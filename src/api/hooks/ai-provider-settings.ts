import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  createAiProviderSettings,
  deleteAiProviderSettings,
  getAiProviderSettings,
  listAiProviderSettings,
  updateAiProviderSettings,
  type AiProviderSettingsDto,
  type CreateAiProviderSettingsInput,
  type UpdateAiProviderSettingsInput,
} from '@/api/ai-provider-settings.ts';
import { ApiError } from '@/api/client.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import { STALE_TIMES, type HookMutationOptions } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

export type UseAiProviderSettingsQueryOptions = Omit<
  UseQueryOptions<AiProviderSettingsDto[], ApiError | Error>,
  'queryKey' | 'queryFn'
>;

export function useAiProviderSettingsQuery(
  options: UseAiProviderSettingsQueryOptions = {},
) {
  return useQuery<AiProviderSettingsDto[], ApiError | Error>({
    queryKey: queryKeys.ai.settings(),
    queryFn: async () => listAiProviderSettings(),
    staleTime: STALE_TIMES.fiveMinutes,
    ...options,
  });
}

export interface UseAiProviderSettingQueryOptions extends Omit<
  UseQueryOptions<AiProviderSettingsDto, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useAiProviderSettingQuery(
  id: string,
  options: UseAiProviderSettingQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<AiProviderSettingsDto, ApiError | Error>({
    queryKey: [...queryKeys.ai.settings(), id],
    queryFn: async () => getAiProviderSettings(id),
    staleTime: STALE_TIMES.fiveMinutes,
    enabled: enabled ?? true,
    ...rest,
  });
}

export type CreateAiProviderSettingsMutationOptions = HookMutationOptions<
  AiProviderSettingsDto,
  ApiError | Error,
  CreateAiProviderSettingsInput
>;

export function useCreateAiProviderSettingsMutation(
  options: CreateAiProviderSettingsMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    AiProviderSettingsDto,
    ApiError | Error,
    CreateAiProviderSettingsInput
  >({
    mutationFn: async (input) => {
      const result = await createAiProviderSettings(input);
      return result;
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.settings() });
      void queryClient.setQueryData(
        [...queryKeys.ai.settings(), data.id],
        data,
      );
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface UpdateAiProviderSettingsMutationVariables
  extends UpdateAiProviderSettingsInput, RefreshRowVersion {}

export type UpdateAiProviderSettingsMutationOptions = HookMutationOptions<
  AiProviderSettingsDto,
  ApiError | Error,
  { id: string } & UpdateAiProviderSettingsMutationVariables
>;

export function useUpdateAiProviderSettingsMutation(
  options: UpdateAiProviderSettingsMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    AiProviderSettingsDto,
    ApiError | Error,
    { id: string } & UpdateAiProviderSettingsMutationVariables
  >({
    mutationFn: async ({ id, refreshRowVersion, ...input }) => {
      if (!refreshRowVersion) {
        const result = await updateAiProviderSettings(id, input);
        return result;
      }
      return withConcurrencyRetry<AiProviderSettingsDto>({
        refreshRowVersion,
        perform: async (rowVersion) => {
          const result = await updateAiProviderSettings(id, {
            ...input,
            rowVersion,
          });
          return result;
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.settings() });
      void queryClient.setQueryData(
        [...queryKeys.ai.settings(), variables.id],
        data,
      );
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface DeleteAiProviderSettingsMutationVariables {
  id: string;
}

export type DeleteAiProviderSettingsMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  DeleteAiProviderSettingsMutationVariables
>;

export function useDeleteAiProviderSettingsMutation(
  options: DeleteAiProviderSettingsMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    DeleteAiProviderSettingsMutationVariables
  >({
    mutationFn: async ({ id }) => {
      await deleteAiProviderSettings(id);
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: [...queryKeys.ai.settings(), variables.id],
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.settings() });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}
