import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

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

export function useCapabilities(): {
  capabilities: string[];
  actorId: string | null;
  ability: AppAbility;
  hasData: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isDenied: boolean;
  error: Error | null;
  can: (action: CapabilityAction, subject: CapabilitySubject) => boolean;
  refresh: () => void;
} {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.capabilities.current(),
    queryFn: getEffectiveCapabilities,
    // Authorization state must never go stale: always refetch on mount and
    // On window focus so changed assignments take effect immediately.
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
    error: query.error ?? null,
    can,
    refresh,
  };
}
