import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import {
  getAuditEvent,
  listAuditEvents,
  type AuditEvent,
  type GetAuditEventOptions,
  type ListAuditEventsOptions,
} from '@/api/audit-events.ts';
import { ApiError } from '@/api/client.ts';
import { STALE_TIMES } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';

/**
 * Audit events are write-only at the service layer. The web client must never
 * POST/PATCH/DELETE audit events, so this hook module exposes only read hooks.
 */

export interface UseAuditEventsQueryOptions extends Omit<
  UseQueryOptions<AuditEvent[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  listOptions?: ListAuditEventsOptions;
}

export function useAuditEventsQuery(options: UseAuditEventsQueryOptions = {}) {
  const { listOptions, ...rest } = options;
  return useQuery<AuditEvent[], ApiError | Error>({
    queryKey: queryKeys.auditEvents.list({
      resourceType: listOptions?.resourceType,
      resourceId: listOptions?.resourceId,
      sort: listOptions?.sort,
    }),
    queryFn: async () => listAuditEvents(listOptions ?? {}),
    staleTime: STALE_TIMES.fifteenSeconds,
    ...rest,
  });
}

export interface UseAuditEventQueryOptions extends Omit<
  UseQueryOptions<AuditEvent, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  requestOptions?: GetAuditEventOptions;
  enabled?: boolean;
}

/**
 * Single-event lookup with optional ETag support. When `etag` is provided the
 * underlying client emits `If-None-Match`; the server's `304 Not Modified`
 * keeps the cached data on the client without an extra refetch.
 */
export function useAuditEventQuery(
  id: string,
  options: UseAuditEventQueryOptions = {},
) {
  const { requestOptions, enabled, ...rest } = options;
  return useQuery<AuditEvent, ApiError | Error>({
    queryKey: queryKeys.auditEvents.list({ resourceId: id }),
    queryFn: async () => getAuditEvent(id, requestOptions ?? {}),
    staleTime: STALE_TIMES.fifteenSeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}
