import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import { queryKeys } from '@/api/query-keys.ts';

export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });

  // Invalidate capabilities on 401/403 so guards re-evaluate; the capabilities query itself is excluded to avoid loops.
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') {
      return;
    }
    const { status, error } = event.query.state;
    if (status !== 'error') {
      return;
    }
    if (!(error instanceof ApiError)) {
      return;
    }
    if (error.status !== 401 && error.status !== 403) {
      return;
    }
    const { queryKey } = event.query;
    const key = queryKey as readonly unknown[];
    if (key[0] === 'capabilities') {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.capabilities.all,
    });
  });

  return queryClient;
}
