import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import { getComponentVersion, listComponents } from '@/api/components.ts';
import { STALE_TIMES } from '@/api/hooks/_shared.ts';
import type { JsonApiResource } from '@/api/json-api.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { ComponentSummary } from '@/features/forms/types.ts';

export * from './components-mutations.ts';

export interface ComponentVersionAttributes {
  version?: string | null;
  status?: string;
  clinicalSchemaJson?: string;
  uiSchemaJson?: string | null;
  contentHash?: string | null;
  rowVersion?: number;
  createdAt?: string;
  publishedAt?: string | null;
  retiredAt?: string | null;
}

// ---------- Component definition catalog ----------

export type UseComponentsQueryOptions = Omit<
  UseQueryOptions<ComponentSummary[], ApiError | Error>,
  'queryKey' | 'queryFn'
>;

export function useComponentsQuery(options: UseComponentsQueryOptions = {}) {
  return useQuery<ComponentSummary[], ApiError | Error>({
    queryKey: queryKeys.components.list(),
    queryFn: async () => listComponents(),
    staleTime: STALE_TIMES.thirtySeconds,
    ...options,
  });
}

// ---------- Component versions ----------

export interface UseComponentVersionQueryOptions extends Omit<
  UseQueryOptions<
    JsonApiResource<ComponentVersionAttributes>,
    ApiError | Error
  >,
  'queryKey' | 'queryFn'
> {
  enabled?: boolean;
}

export function useComponentVersionQuery(
  versionId: string,
  options: UseComponentVersionQueryOptions = {},
) {
  const { enabled, ...rest } = options;
  return useQuery<
    JsonApiResource<ComponentVersionAttributes>,
    ApiError | Error
  >({
    queryKey: queryKeys.componentVersions.detail(versionId),
    queryFn: async () => getComponentVersion(versionId),
    staleTime: STALE_TIMES.thirtySeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}
