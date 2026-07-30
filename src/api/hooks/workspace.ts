import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import { STALE_TIMES, type HookMutationOptions } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  getWorkspace,
  updateWorkspace,
  type HospitalWorkspace,
  type UpdateHospitalWorkspaceInput,
} from '@/api/workspace.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

export type UseWorkspaceQueryOptions = Omit<
  UseQueryOptions<HospitalWorkspace, ApiError | Error>,
  'queryKey' | 'queryFn'
>;

export function useWorkspaceQuery(options: UseWorkspaceQueryOptions = {}) {
  return useQuery<HospitalWorkspace, ApiError | Error>({
    queryKey: queryKeys.workspace.detail(),
    queryFn: async () => getWorkspace(),
    staleTime: STALE_TIMES.fiveMinutes,
    ...options,
  });
}

export interface UpdateWorkspaceMutationVariables extends RefreshRowVersion {
  input: UpdateHospitalWorkspaceInput;
}

export type UpdateWorkspaceMutationOptions = HookMutationOptions<
  HospitalWorkspace,
  ApiError | Error,
  UpdateWorkspaceMutationVariables
>;

export function useUpdateWorkspaceMutation(
  options: UpdateWorkspaceMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    HospitalWorkspace,
    ApiError | Error,
    UpdateWorkspaceMutationVariables
  >({
    mutationFn: async ({ input, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        const result = await updateWorkspace(input);
        return result;
      }
      return withConcurrencyRetry<HospitalWorkspace>({
        refreshRowVersion,
        perform: async (rowVersion) => {
          const result = await updateWorkspace({ ...input, rowVersion });
          return result;
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(queryKeys.workspace.detail(), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace.all });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}
