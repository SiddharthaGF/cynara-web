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
  listAllForms,
  listForms,
  type FormListResponse,
  type ListFormsParams,
} from '@/api/forms.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { FormSummary } from '@/features/forms/types.ts';

import type { FormFilterStatus } from './formListSearch.ts';

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

/**
 * Full-catalog read used while a search query or status filter is active. The
 * paginated list only holds one page in memory, so client-side matching would
 * silently miss entries that live on later pages.
 */
function useAllFormsQuery(enabled: boolean): UseQueryResult<FormSummary[]> {
  return useQuery({
    queryKey: queryKeys.forms.all,
    queryFn: listAllForms,
    enabled,
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

function effectiveStatus(form: FormSummary): FormFilterStatus {
  if (form.editableStatus === 'draft' || form.editableStatus === 'review') {
    return form.editableStatus;
  }
  return form.publishedVersions.length > 0 ? 'published' : 'all';
}

function matchesFilters(
  form: FormSummary,
  query: string,
  status: FormFilterStatus,
): boolean {
  const normalized = query.trim().toLowerCase();
  const matchesQuery =
    normalized === '' ||
    form.name.toLowerCase().includes(normalized) ||
    form.code.toLowerCase().includes(normalized);
  const matchesStatus = status === 'all' || effectiveStatus(form) === status;
  return matchesQuery && matchesStatus;
}

export interface UseFormsCatalogParams extends ListFormsParams {
  query?: string;
  status?: FormFilterStatus;
}

export function useFormsCatalog(params: UseFormsCatalogParams): {
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
  const query = params.query?.trim() ?? '';
  const status = params.status ?? 'all';
  const hasFilters = query !== '' || status !== 'all';

  const formsQuery = useFormsQuery(params);
  const allFormsQuery = useAllFormsQuery(hasFilters);
  const createFormMutation = useCreateFormMutation();

  const filteredAll = useMemo(() => {
    if (!hasFilters) {
      return undefined;
    }
    return (allFormsQuery.data ?? []).filter((form) =>
      matchesFilters(form, query, status),
    );
  }, [allFormsQuery.data, hasFilters, query, status]);

  const error = useMemo((): string | null => {
    if (formsQuery.isError && !hasFilters) {
      return formsQuery.error instanceof Error
        ? formsQuery.error.message
        : t('list.errors.loadFailed');
    }
    if (allFormsQuery.isError && hasFilters) {
      return allFormsQuery.error instanceof Error
        ? allFormsQuery.error.message
        : t('list.errors.loadFailed');
    }
    if (createFormMutation.isError) {
      return createFormMutation.error instanceof Error
        ? createFormMutation.error.message
        : t('list.errors.createFailed');
    }
    return null;
  }, [
    allFormsQuery.error,
    allFormsQuery.isError,
    createFormMutation.error,
    createFormMutation.isError,
    formsQuery.error,
    formsQuery.isError,
    hasFilters,
    t,
  ]);

  const paginatedForms = formsQuery.data?.forms ?? [];
  const forms = hasFilters ? (filteredAll ?? []) : paginatedForms;
  const totalCount = hasFilters
    ? (filteredAll?.length ?? 0)
    : (formsQuery.data?.totalCount ?? 0);

  return {
    forms,
    totalCount,
    page: hasFilters ? 1 : (formsQuery.data?.page ?? params.page ?? 1),
    pageSize: hasFilters
      ? forms.length
      : (formsQuery.data?.pageSize ??
        params.pageSize ??
        DEFAULT_FORM_PAGE_SIZE),
    error,
    isCreating: createFormMutation.isPending,
    isLoading: hasFilters
      ? allFormsQuery.isLoading || allFormsQuery.isFetching
      : formsQuery.isLoading,
    createForm: createFormMutation.mutateAsync,
  };
}
