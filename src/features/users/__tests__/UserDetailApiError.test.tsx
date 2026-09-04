import { QueryClient } from '@tanstack/react-query';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client.ts';
import { queryKeys } from '@/api/query-keys.ts';
import { UserDetailPage } from '@/features/users/UserDetailPage.tsx';

import {
  detailFixture,
  makeI18n,
  renderStatic,
  usersT,
} from './usersTestHarness.tsx';

vi.mock(import('@tanstack/react-router'), () => ({
  Link: (props: { children?: unknown }) =>
    createElement('a', {}, props.children as never),
  useNavigate: () => async (): Promise<void> => {
    await Promise.resolve();
  },
  useParams: () => ({ locale: 'en', userId: 'u-1' }) as never,
  useRouteContext: (() => ({ locale: 'en' })) as never,
  useLocation: (() => ({ pathname: '/en/admin/users/u-1' })) as never,
  useRouterState: (() => ({
    location: { pathname: '/en/admin/users/u-1' },
  })) as never,
}));

/**
 * Drives the REAL useUserDetail hook into an error state by running a
 * rejecting queryFn through fetchQuery before rendering. The hook then maps
 * the ApiError through describeApiError exactly as it does in production.
 */
async function clientWithDetailFailure(
  cachedUser?: typeof detailFixture,
): Promise<QueryClient> {
  // Keep the failed load frozen (retryOnMount off), mirroring the settled state the page receives.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryOnMount: false },
    },
  });
  if (cachedUser) {
    client.setQueryData(queryKeys.users.detail('u-1'), cachedUser);
  }
  await client
    .fetchQuery({
      queryKey: queryKeys.users.detail('u-1'),
      queryFn: async () => {
        await Promise.reject(
          new ApiError(400, 'Bad Request', 'malformed identifier'),
        );
      },
    })
    .catch(() => undefined);
  return client;
}

describe('UserDetailPage ApiError 400 handling', () => {
  it('renders the destructive validation alert with zero row data on a failed initial load', async () => {
    const client = await clientWithDetailFailure();
    const html = renderStatic(createElement(UserDetailPage), { client });
    expect(html).toContain('role="alert"');
    // 400 maps to the validation copy, NOT the network copy reserved for
    // 0/502/503/504 — pinning the status-specific describeApiError branch.
    expect(html).toContain(makeI18n('en').t('api:errors.validation'));
    expect(html).not.toContain(makeI18n('en').t('api:errors.network'));
    expect(html).toContain(usersT(makeI18n('en'))('error.retry'));
    expect(html).not.toContain('ada@cynara.dev');
  });

  it('dims previously cached content behind the 400 alert instead of presenting it as current', async () => {
    const client = await clientWithDetailFailure(detailFixture);
    const html = renderStatic(createElement(UserDetailPage), { client });
    expect(html).toContain(makeI18n('en').t('api:errors.validation'));
    expect(html).toContain(usersT(makeI18n('en'))('error.title'));
    // The stale snapshot survives only visually subordinated and dimmed.
    expect(html).toContain('opacity-60');
    expect(html).toContain('ada@cynara.dev');
  });
});
