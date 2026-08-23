import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client.ts';
import { UserDetailPage } from '@/features/users/UserDetailPage.tsx';
import { UserDetailView } from '@/features/users/UserDetailView.tsx';
import { UserNotFoundState } from '@/features/users/UserNotFoundState.tsx';
import { useUserDetail } from '@/features/users/useUsersDirectory.ts';

import {
  detailFixture,
  makeI18n,
  missingKeys,
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

vi.mock(
  import('@/features/users/useUsersDirectory.ts'),
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/features/users/useUsersDirectory.ts')
      >();
    return {
      ...actual,
      useUserDetail: vi.fn<typeof actual.useUserDetail>(actual.useUserDetail),
    };
  },
);

type DetailResult = ReturnType<typeof useUserDetail>;

function detailState(overrides: Partial<DetailResult> = {}): DetailResult {
  return {
    user: null,
    isLoading: false,
    isFetching: false,
    error: null,
    isForbidden: false,
    isNotFound: false,
    retry: () => undefined,
    ...overrides,
  };
}

describe('UserDetailPage', () => {
  beforeEach(() => {
    missingKeys.length = 0;
    vi.mocked(useUserDetail).mockReturnValue(detailState());
  });

  describe('UserDetailView rendering', () => {
    it('renders exactly the DTO sections as returned', () => {
      const html = renderStatic(
        createElement(UserDetailView, { user: detailFixture, locale: 'en' }),
      );
      expect(html).toContain('ada@cynara.dev');
      expect(html).toContain('ada');
      expect(html).toContain('hospital-norte');
      expect(html).toContain('actor-ada');
      expect(html).toContain('2026-01-02T03:04:05Z');
    });

    it('renders the capability union and flags as returned by the server', () => {
      const html = renderStatic(
        createElement(UserDetailView, { user: detailFixture, locale: 'en' }),
      );
      expect(html).toContain(usersT(makeI18n('en'))('detail.capabilities'));
      // Capability union renders in server order (not re-sorted).
      expect(html.indexOf('users.read')).toBeLessThan(
        html.indexOf('audit.read'),
      );
      expect(html.indexOf('audit.read')).toBeLessThan(
        html.indexOf('catalog.read'),
      );
      // Flags render with their values.
      expect(html).toContain(
        usersT(makeI18n('en'))('detail.flags.emailConfirmed'),
      );
    });

    it('never renders any roles section, label, or placeholder', () => {
      const views = [
        renderStatic(
          createElement(UserDetailView, { user: detailFixture, locale: 'en' }),
        ),
        renderStatic(createElement(UserNotFoundState, { locale: 'en' })),
        renderStatic(
          createElement(UserDetailView, {
            user: {
              ...detailFixture,
              memberships: [],
              capabilities: [],
            },
            locale: 'es',
          }),
          { i18n: makeI18n('es') },
        ),
      ];
      for (const html of views) {
        // Visible text only: class attributes legitimately mention ARIA roles.
        // Locale-neutral: whole-word /roles?/ matches en "role" and es "rol",
        // Excluding substrings such as "control" from false positives.
        const text = html.replaceAll(/<[^>]*>/gu, ' ');
        expect(text).not.toMatch(/\broles?\b/i);
      }
      // Empty collections fall back to the neutral copy, never placeholders.
      expect(views[2]).toContain(usersT(makeI18n('es'))('detail.none'));
      expect(missingKeys).toStrictEqual([]);
    });
  });

  describe('UserDetailPage states matrix', () => {
    it('renders the loading skeleton first', () => {
      vi.mocked(useUserDetail).mockReturnValue(
        detailState({ isLoading: true }),
      );
      const html = renderStatic(createElement(UserDetailPage));
      expect(html).toContain('aria-busy="true"');
      expect(html).not.toContain('ada@cynara.dev');
    });

    it('renders forbidden with zero row data', () => {
      vi.mocked(useUserDetail).mockReturnValue(
        detailState({ isForbidden: true, error: 'denied' }),
      );
      const html = renderStatic(createElement(UserDetailPage));
      expect(html).toContain(usersT(makeI18n('en'))('forbidden.title'));
      expect(html).not.toContain('ada@cynara.dev');
    });

    it('collapses unknown and out-of-scope ids to the identical no-hint 404 state', () => {
      vi.mocked(useUserDetail)
        .mockReturnValueOnce(
          detailState({ isNotFound: true, error: 'missing' }),
        )
        .mockReturnValueOnce(
          detailState({ isNotFound: true, error: 'out of scope' }),
        );
      const unknownHtml = renderStatic(createElement(UserDetailPage));
      const scopedHtml = renderStatic(createElement(UserDetailPage));
      expect(unknownHtml).toContain(usersT(makeI18n('en'))('notFound.title'));
      // Identical collapse: same markup regardless of cause.
      expect(scopedHtml).toBe(unknownHtml);
      expect(unknownHtml).not.toContain('u-1');
    });

    it('renders a destructive alert with retry when loading fails outright', () => {
      vi.mocked(useUserDetail).mockReturnValue(
        detailState({
          error: new ApiError(503, 'Service Unavailable', 'down').message,
        }),
      );
      const html = renderStatic(createElement(UserDetailPage));
      expect(html).toContain(usersT(makeI18n('en'))('error.title'));
      expect(html).toContain(usersT(makeI18n('en'))('error.retry'));
      expect(html).not.toContain('ada@cynara.dev');
    });

    it('dims stale content behind an alert when a refetch over cache fails', () => {
      vi.mocked(useUserDetail).mockReturnValue(
        detailState({
          user: detailFixture,
          isFetching: true,
          error: 'network unreachable',
        }),
      );
      const html = renderStatic(createElement(UserDetailPage));
      expect(html).toContain(usersT(makeI18n('en'))('error.title'));
      expect(html).toContain('ada@cynara.dev');
      expect(html).toContain('opacity-60');
    });

    it('renders the fresh detail without alerts on success', () => {
      vi.mocked(useUserDetail).mockReturnValue(
        detailState({ user: detailFixture }),
      );
      const html = renderStatic(createElement(UserDetailPage));
      expect(html).toContain('ada@cynara.dev');
      expect(html).toContain(usersT(makeI18n('en'))('detail.memberships'));
      expect(html).not.toContain(usersT(makeI18n('en'))('error.title'));
      expect(missingKeys).toStrictEqual([]);
    });
  });
});
