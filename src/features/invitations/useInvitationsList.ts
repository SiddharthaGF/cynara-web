import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import {
  isForbiddenInvitationError,
  listInvitations,
  type InvitationDto,
} from '@/api/invitations.ts';
import { queryKeys } from '@/api/query-keys.ts';

/** Composite hook for the invitation listing. Cached rows stay visible while a refetch is in flight. */
export function useInvitationsList(): {
  items: InvitationDto[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isForbidden: boolean;
  queryError: Error | null;
  retry: () => void;
} {
  const { t } = useTranslation(['invitations', 'api']);
  const query = useQuery({
    queryKey: queryKeys.invitations.list(),
    queryFn: listInvitations,
    // Status can flip in another tab (someone accepts the link) or right
    // After the admin creates a new one. Keep the cache short so the next
    // Focus/mount refetches and the row reflects reality.
    staleTime: 0,
  });

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    isForbidden: query.isError && isForbiddenInvitationError(query.error),
    queryError: query.error ?? null,
    retry: () => {
      void query.refetch();
    },
  };
}
