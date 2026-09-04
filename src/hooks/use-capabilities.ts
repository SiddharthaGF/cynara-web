import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { ApiError } from '@/api/client.ts';
import {
  getEffectiveCapabilities,
  isCapabilitiesForbiddenError,
} from '@/api/effective-capabilities.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  buildCapabilityAbility,
  type AppAbility,
  type CapabilityAction,
  type CapabilitySubject,
} from '@/lib/capabilities.ts';

export function useCapabilities(enabled = true): {
  capabilities: string[];
  actorId: string | null;
  ability: AppAbility;
  hasData: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isDenied: boolean;
  isUnauthorized: boolean;
  error: Error | null;
  can: (action: CapabilityAction, subject: CapabilitySubject) => boolean;
  refresh: () => void;
} {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.capabilities.current(),
    queryFn: getEffectiveCapabilities,
    enabled,
    // Authorization must never go stale: refetch on mount and window focus.
    staleTime: 0,
  });

  const capabilities = useMemo(
    () => query.data?.capabilities ?? [],
    [query.data],
  );

  const ability = useMemo(
    () => buildCapabilityAbility(capabilities),
    [capabilities],
  );

  const can = useCallback(
    (action: CapabilityAction, subject: CapabilitySubject) =>
      ability.can(action, subject),
    [ability],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.capabilities.all,
    });
  }, [queryClient]);

  return {
    capabilities,
    actorId: query.data?.actorId ?? null,
    ability,
    hasData: query.data !== undefined,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    isDenied: isCapabilitiesForbiddenError(query.error),
    isUnauthorized:
      query.error instanceof ApiError && query.error.status === 401,
    error: query.error ?? null,
    can,
    refresh,
  };
}
