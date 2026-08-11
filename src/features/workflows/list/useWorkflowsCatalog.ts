import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/api/query-keys.ts';
import {
  createWorkflow,
  createWorkflowDraft,
  listWorkflows,
} from '@/api/workflows.ts';
import type { WorkflowSummary } from '@/features/workflows/types.ts';

export function useWorkflowsCatalog(): {
  workflows: WorkflowSummary[];
  error: string | null;
  isCreating: boolean;
  isLoading: boolean;
  isCreatingDraft: boolean;
  createWorkflow: (values: {
    code: string;
    name: string;
  }) => Promise<WorkflowSummary>;
  createDraft: (code: string) => Promise<void>;
} {
  const { t } = useTranslation('workflows');
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.workflowDefinitions.list(),
    queryFn: listWorkflows,
  });

  const createWorkflowMutation = useMutation({
    mutationFn: createWorkflow,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workflowDefinitions.all,
      });
    },
  });

  const createDraftMutation = useMutation({
    mutationFn: createWorkflowDraft,
    onSuccess: async (version) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workflowDefinitions.all,
      });
      await queryClient.setQueryData(
        queryKeys.workflowDefinitions.draft(version.code),
        version,
      );
    },
  });

  const error = useMemo((): string | null => {
    if (listQuery.isError) {
      return listQuery.error instanceof Error
        ? listQuery.error.message
        : t('list.errors.loadFailed');
    }
    if (createWorkflowMutation.isError) {
      return createWorkflowMutation.error instanceof Error
        ? createWorkflowMutation.error.message
        : t('list.errors.createFailed');
    }
    if (createDraftMutation.isError) {
      return createDraftMutation.error instanceof Error
        ? createDraftMutation.error.message
        : t('list.errors.draftFailed');
    }
    return null;
  }, [
    createDraftMutation.error,
    createDraftMutation.isError,
    createWorkflowMutation.error,
    createWorkflowMutation.isError,
    listQuery.error,
    listQuery.isError,
    t,
  ]);

  return {
    workflows: listQuery.data ?? [],
    error,
    isCreating: createWorkflowMutation.isPending,
    isLoading: listQuery.isLoading,
    isCreatingDraft: createDraftMutation.isPending,
    createWorkflow: createWorkflowMutation.mutateAsync,
    createDraft: async (code: string) => {
      await createDraftMutation.mutateAsync(code);
    },
  };
}
