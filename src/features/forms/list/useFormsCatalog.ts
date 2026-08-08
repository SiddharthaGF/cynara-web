import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createForm,
  DEFAULT_FORM_PAGE_SIZE,
  listForms,
  type FormListResponse,
  type ListFormsParams,
} from '@/api/forms.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { FormSummary } from '@/features/forms/types.ts';

function useFormsQuery(
  params: ListFormsParams,
): UseQueryResult<FormListResponse> {
  return useQuery({
    queryKey: queryKeys.forms.list({
      page: params.page,
      pageSize: params.pageSize,
    }),
    queryFn: async () => listForms(params),
    placeholderData: keepPreviousData,
  });
}

function useCreateFormMutation(): UseMutationResult<
  FormSummary,
  unknown,
  Parameters<typeof createForm>[0]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createForm,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
    },
  });
}

export function useFormsCatalog(params: ListFormsParams): {
  forms: FormSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  error: string | null;
  isCreating: boolean;
  isLoading: boolean;
  createForm: ReturnType<typeof useCreateFormMutation>['mutateAsync'];
} {
  const { t } = useTranslation('forms');
  const formsQuery = useFormsQuery(params);
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
    forms: formsQuery.data?.forms ?? [],
    totalCount: formsQuery.data?.totalCount ?? 0,
    page: formsQuery.data?.page ?? params.page ?? 1,
    pageSize:
      formsQuery.data?.pageSize ?? params.pageSize ?? DEFAULT_FORM_PAGE_SIZE,
    error,
    isCreating: createFormMutation.isPending,
    isLoading: formsQuery.isLoading,
    createForm: createFormMutation.mutateAsync,
  };
}
