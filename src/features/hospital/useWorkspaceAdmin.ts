import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  isForbiddenWorkspaceError,
  isStaleWorkspaceError,
  updateWorkspace,
  type HospitalWorkspaceDto,
  type UpdateWorkspaceInput,
} from '@/api/workspace.ts';
import {
  useAdminMutationState,
  useWorkspaceQuery,
  type AdminMutationState,
} from '@/features/hospital/useAdminQueryState.ts';

export interface WorkspaceState {
  workspace: HospitalWorkspaceDto | null;
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
}

export function useWorkspace(): WorkspaceState {
  const { t } = useTranslation(['hospital', 'api']);
  const query = useWorkspaceQuery();

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    workspace: query.data ?? null,
    isLoading: query.isLoading,
    error,
    isForbidden: isForbiddenWorkspaceError(query.error),
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useUpdateWorkspace(): AdminMutationState<
  UpdateWorkspaceInput,
  HospitalWorkspaceDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    HospitalWorkspaceDto,
    Error,
    UpdateWorkspaceInput
  >({
    mutationFn: updateWorkspace,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workspace.detail(), data);
    },
  });
  return useAdminMutationState(
    mutation,
    isStaleWorkspaceError,
    () => false,
    isForbiddenWorkspaceError,
  );
}
