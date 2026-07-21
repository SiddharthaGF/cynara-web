import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { createForm, listForms } from '@/api/forms.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { FormSummary } from '@/features/forms/types.ts';

function useFormsQuery() {
  return useQuery({
    queryKey: queryKeys.forms.list(),
    queryFn: listForms,
  });
}

function useCreateFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createForm,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.forms.list() });
    },
  });
}

export function useFormsCatalog(): {
  forms: FormSummary[];
  error: string | null;
  isCreating: boolean;
  isLoading: boolean;
  createForm: ReturnType<typeof useCreateFormMutation>['mutateAsync'];
} {
  const { t } = useTranslation('forms');
  const formsQuery = useFormsQuery();
  const createFormMutation = useCreateFormMutation();

  const error = useMemo((): string | null => {
    if (formsQuery.isError) {
      return formsQuery.error instanceof Error
        ? formsQuery.error.message
        : t('list.errors.loadFailed');
    }
    if (createFormMutation.isError) {
      return createFormMutation.error instanceof Error
        ? createFormMutation.error.message
        : t('list.errors.createFailed');
    }
    return null;
  }, [
    createFormMutation.error,
    createFormMutation.isError,
    formsQuery.error,
    formsQuery.isError,
    t,
  ]);

  return {
    forms: formsQuery.data ?? [],
    error,
    isCreating: createFormMutation.isPending,
    isLoading: formsQuery.isLoading,
    createForm: createFormMutation.mutateAsync,
  };
}
