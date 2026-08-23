import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client.ts';
import type { UserListResponse } from '@/api/users.ts';
import { UserDirectoryWorkspace } from '@/features/users/UserDirectoryWorkspace.tsx';
import {
  userListParamsFromSearch,
  type UserListSearch,
} from '@/features/users/userListSearch.ts';
import { useUserList } from '@/features/users/useUsersDirectory.ts';

import {
  listResponse,
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
  useParams: () => ({ locale: 'en' }) as never,
  useSearch: (() => searchHolder.search) as never,
}));

const searchHolder = vi.hoisted(() => ({
  search: {
    q: undefined as string | undefined,
    hospitalCode: undefined as string | undefined,
    page: 1,
    pageSize: 20,
  },
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
      useUserList: vi.fn<typeof actual.useUserList>(actual.useUserList),
    };
  },
);

type UserListResult = ReturnType<typeof useUserList>;

const listFixture: UserListResponse = {
  items: listResponse.items,
  page: 1,
  pageSize: 20,
  totalCount: 2,
};

function hookState(overrides: Partial<UserListResult> = {}): UserListResult {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    isLoading: false,
    isFetching: false,
    error: null,
    isForbidden: false,
    queryError: null,
    retry: () => undefined,
    ...overrides,
  };
}

function setSearch(search: Partial<UserListSearch>): void {
  searchHolder.search = {
    q: undefined,
    hospitalCode: undefined,
    page: 1,
    pageSize: 20,
    ...search,
  };
}

describe('UserDirectoryWorkspace states', () => {
  beforeEach(() => {
    missingKeys.length = 0;
    setSearch({});
  });

  it('renders the loading skeleton while the first fetch is pending', () => {
    vi.mocked(useUserList).mockReturnValue(hookState({ isLoading: true }));
    const html = renderStatic(
      createElement(UserDirectoryWorkspace, { hospitalContext: null }),
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('ada@cynara.dev');
  });

  it('renders resolved rows with hospital badges on success', () => {
    vi.mocked(useUserList).mockReturnValue(hookState(listFixture));
    const html = renderStatic(
      createElement(UserDirectoryWorkspace, { hospitalContext: null }),
    );
    expect(html).toContain('ada@cynara.dev');
    expect(html).toContain('grace@cynara.dev');
    expect(html).toContain('hospital-norte');
  });

  it('shows the hospital filter and optional-narrowing hint for platform scope', () => {
    vi.mocked(useUserList).mockReturnValue(hookState(listFixture));
    const html = renderStatic(
      createElement(UserDirectoryWorkspace, { hospitalContext: null }),
    );
    expect(html).toContain('user-directory-hospital');
    expect(html).toContain(
      usersT(makeI18n('en'))('hospitalFilter.platformHint'),
    );
    expect(html).not.toContain(usersT(makeI18n('en'))('scope.hospital'));
  });

  it('hides the filter under hospital context and keeps scope copy neutral', () => {
    setSearch({ hospitalCode: 'crafted-code' });
    vi.mocked(useUserList).mockReturnValue(
      hookState({
        items: [
          { id: 'u-9', email: 'pinned@cynara.dev', hospitals: ['default'] },
        ],
        totalCount: 1,
        queryError: null,
      }),
    );
    const html = renderStatic(createElement(UserDirectoryWorkspace));
    expect(html).not.toContain('user-directory-hospital');
    expect(html).toContain('pinned@cynara.dev');
    // The crafted URL code maps verbatim onto the wire param.
    expect(userListParamsFromSearch(searchHolder.search).hospital).toBe(
      'crafted-code',
    );
    // Resolved-scope copy never promises narrowing.
    expect(html).toContain(usersT(makeI18n('en'))('scope.hospital'));
    expect(html).not.toContain(
      usersT(makeI18n('en'))('hospitalFilter.platformHint'),
    );
  });

  it('renders an empty state for zero matches without any unfiltered fallback', () => {
    setSearch({ hospitalCode: 'no-such-hospital' });
    vi.mocked(useUserList).mockReturnValue(hookState());
    const html = renderStatic(
      createElement(UserDirectoryWorkspace, { hospitalContext: null }),
    );
    expect(html).toContain(usersT(makeI18n('en'))('empty.title'));
    expect(html).not.toContain('@cynara.dev');
    // Exactly one scoped query — no second unfiltered listing exists.
    expect(userListParamsFromSearch(searchHolder.search)).toStrictEqual({
      hospital: 'no-such-hospital',
      page: 1,
      pageSize: 20,
    });
  });

  it('renders the forbidden empty state with zero row data on 403', () => {
    vi.mocked(useUserList).mockReturnValue(
      hookState({
        error: 'forbidden',
        isForbidden: true,
        queryError: new Error('403'),
      }),
    );
    const html = renderStatic(
      createElement(UserDirectoryWorkspace, { hospitalContext: null }),
    );
    expect(html).toContain(usersT(makeI18n('en'))('forbidden.title'));
    expect(html).not.toContain('@cynara.dev');
    expect(html).not.toContain('user-directory-q');
  });

  it('clears prior rows on a validation failure instead of showing them as current', () => {
    vi.mocked(useUserList).mockReturnValue(
      hookState({
        items: listResponse.items,
        totalCount: 2,
        error: 'invalid parameters',
        queryError: new ApiError(400, 'Bad Request', 'invalid'),
      }),
    );
    const html = renderStatic(
      createElement(UserDirectoryWorkspace, { hospitalContext: null }),
    );
    expect(html).toContain(usersT(makeI18n('en'))('error.title'));
    expect(html).toContain(usersT(makeI18n('en'))('error.retry'));
    expect(html).not.toContain('ada@cynara.dev');
  });

  it('dims stale rows behind a destructive alert after a failed refetch over cache', () => {
    vi.mocked(useUserList).mockReturnValue(
      hookState({
        items: listResponse.items,
        totalCount: 2,
        isFetching: true,
        error: 'network unreachable',
        queryError: new Error('network'),
      }),
    );
    const html = renderStatic(
      createElement(UserDirectoryWorkspace, { hospitalContext: null }),
    );
    expect(html).toContain(usersT(makeI18n('en'))('error.title'));
    expect(html).toContain('ada@cynara.dev');
    expect(html).toContain('opacity-60');
    expect(html).toContain(usersT(makeI18n('en'))('stale.refreshing'));
  });

  it('re-queries identical params for an identical filtered URL (reload persistence)', () => {
    setSearch({
      q: 'ada',
      hospitalCode: 'hospital-norte',
      page: 3,
      pageSize: 20,
    });
    expect(userListParamsFromSearch(searchHolder.search)).toStrictEqual({
      q: 'ada',
      hospital: 'hospital-norte',
      page: 3,
      pageSize: 20,
    });
  });
});
