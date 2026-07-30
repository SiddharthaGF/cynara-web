import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import {
  getFormDefinitionById,
  getFormDraft,
  getFormVersion,
  getFormVersionById,
  listFormVersions,
  listForms,
  listFormsPaginated,
  type ListFormsPaginatedOptions,
} from '@/api/forms.ts';
import { STALE_TIMES } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

export * from './forms-mutations.ts';

// ---------- Form definition catalog ----------

export type UseFormsQueryOptions = Omit<
  UseQueryOptions<FormSummary[], ApiError | Error>,
  'queryKey' | 'queryFn'
>;

export function useFormsQuery(options: UseFormsQueryOptions = {}) {
  return useQuery<FormSummary[], ApiError | Error>({
    queryKey: queryKeys.forms.list(),
    queryFn: async () => listForms(),
    staleTime: STALE_TIMES.thirtySeconds,
    ...options,
  });
}

export interface UseFormsPaginatedQueryOptions extends Omit<
  UseQueryOptions<FormSummary[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  listOptions?: ListFormsPaginatedOptions;
}

export function useFormsPaginatedQuery(
  options: UseFormsPaginatedQueryOptions = {},
) {
  const { listOptions, ...rest } = options;
  return useQuery<FormSummary[], ApiError | Error>({
    queryKey: queryKeys.formDefinitions.list({
      status: listOptions?.status,
      sort: listOptions?.sort,
    }),
    queryFn: async () => listFormsPaginated(listOptions ?? {}),
    staleTime: STALE_TIMES.thirtySeconds,
    ...rest,
  });
}

export interface UseFormDefinitionQueryOptions extends Omit<
  UseQueryOptions<FormSummary, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useFormDefinitionQuery(
  definitionId: string,
  options: UseFormDefinitionQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<FormSummary, ApiError | Error>({
    queryKey: queryKeys.formDefinitions.detail(definitionId),
    queryFn: async () => getFormDefinitionById(definitionId),
    staleTime: STALE_TIMES.thirtySeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}

// ---------- Form draft (designer) ----------

export interface UseFormDraftQueryOptions extends Omit<
  UseQueryOptions<FormVersion, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useFormDraftQuery(
  code: string,
  options: UseFormDraftQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<FormVersion, ApiError | Error>({
    queryKey: queryKeys.forms.draft(code),
    queryFn: async () => getFormDraft(code),
    staleTime: STALE_TIMES.thirtySeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}

// ---------- Form versions ----------

export interface UseFormVersionQueryOptions extends Omit<
  UseQueryOptions<FormVersion, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  expectedCode?: string;
  enabled?: boolean;
}

export function useFormVersionQuery(
  versionId: string,
  options: UseFormVersionQueryOptions = {},
) {
  const { expectedCode, enabled, ...rest } = options;
  return useQuery<FormVersion, ApiError | Error>({
    queryKey: queryKeys.formVersions.detail(versionId),
    queryFn: async () => getFormVersion(versionId, expectedCode),
    staleTime: STALE_TIMES.thirtySeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}

export interface UseFormVersionByIdQueryOptions extends Omit<
  UseQueryOptions<FormVersion, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useFormVersionByIdQuery(
  versionId: string,
  options: UseFormVersionByIdQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<FormVersion, ApiError | Error>({
    queryKey: queryKeys.formVersions.detail(versionId),
    queryFn: async () => getFormVersionById(versionId),
    staleTime: STALE_TIMES.thirtySeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}

export interface UseFormVersionsQueryOptions extends Omit<
  UseQueryOptions<FormVersion[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  formDefinitionId?: string;
  include?: string;
}

export function useFormVersionsQuery(
  options: UseFormVersionsQueryOptions = {},
) {
  const { formDefinitionId, include, ...rest } = options;
  return useQuery<FormVersion[], ApiError | Error>({
    queryKey: queryKeys.formVersions.list({ formDefinitionId, include }),
    queryFn: async () => listFormVersions({ formDefinitionId, include }),
    staleTime: STALE_TIMES.thirtySeconds,
    ...rest,
  });
}
