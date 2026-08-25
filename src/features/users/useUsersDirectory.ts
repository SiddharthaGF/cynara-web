import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import { describeApiError } from '@/api/error-message.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  getUser,
  isForbiddenUserError,
  listUsers,
  type ListUsersParams,
  type UserDto,
  type UserListItem,
} from '@/api/users.ts';
import { DEFAULT_USER_PAGE_SIZE } from '@/features/users/userListSearch.ts';

/**
 * Composite hook for the directory listing. Submit-driven (no debounce):
 * `isFetching` drives in-flight affordances while cached data stays visible,
 * so a refetch over cache keeps stale rows distinguishable from fresh ones.
 */
export function useUserList(params: ListUsersParams): {
  items: UserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isForbidden: boolean;
  queryError: Error | null;
  retry: () => void;
} {
  const { t } = useTranslation(['users', 'api']);
  const query = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: async () => listUsers(params),
  });

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    items: query.data?.items ?? [],
    page: query.data?.page ?? params.page ?? 1,
    pageSize: query.data?.pageSize ?? params.pageSize ?? DEFAULT_USER_PAGE_SIZE,
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    isForbidden: query.isError && isForbiddenUserError(query.error),
    queryError: query.error ?? null,
    retry: () => {
      void query.refetch();
    },
  };
}

/**
 * Composite hook for the directory detail view. A 404 collapses to the
 * shared not-found state regardless of whether the id is unknown or outside
 * the caller's scope; no existence hint leaks either way.
 */
export function useUserDetail(id: string): {
  user: UserDto | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isForbidden: boolean;
  isNotFound: boolean;
  retry: () => void;
} {
  const { t } = useTranslation(['users', 'api']);
  const query = useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => getUser(id),
  });

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    isForbidden: query.isError && isForbiddenUserError(query.error),
    isNotFound:
      query.isError && query.error instanceof ApiError
        ? query.error.status === 404
        : false,
    retry: () => {
      void query.refetch();
    },
  };
}
