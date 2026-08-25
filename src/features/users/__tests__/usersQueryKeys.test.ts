import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/api/query-keys.ts';
import { DEFAULT_USER_PAGE_SIZE } from '@/features/users/userListSearch.ts';

/**
 * Spec: query keys isolate caches — differing params or ids must produce
 * distinct keys, and every users key must stay inside the `users` family
 * so invalidation scoped to `queryKeys.users.all` cannot leak into other
 * families.
 */
describe('queryKeys.users', () => {
  it('roots the family at ["users"]', () => {
    expect(queryKeys.users.all).toStrictEqual(['users']);
  });

  it('derives distinct list keys from differing params', () => {
    const base = queryKeys.users.list({
      page: 1,
      pageSize: DEFAULT_USER_PAGE_SIZE,
    });
    const filtered = queryKeys.users.list({
      q: 'ada',
      hospital: 'hospital-norte',
      page: 2,
      pageSize: DEFAULT_USER_PAGE_SIZE,
    });
    const differentPage = queryKeys.users.list({
      page: 3,
      pageSize: DEFAULT_USER_PAGE_SIZE,
    });
    expect(base).not.toStrictEqual(filtered);
    expect(base).not.toStrictEqual(differentPage);
  });

  it('derives distinct detail keys from differing ids', () => {
    expect(queryKeys.users.detail('u-1')).not.toStrictEqual(
      queryKeys.users.detail('u-2'),
    );
    // List and detail spaces never collide.
    expect(queryKeys.users.detail('u-1')).not.toStrictEqual(
      queryKeys.users.list({ page: 1, pageSize: DEFAULT_USER_PAGE_SIZE }),
    );
  });

  it('keeps every key scoped to the users family', () => {
    const params = { q: 'ada', page: 1, pageSize: DEFAULT_USER_PAGE_SIZE };
    const keys = [
      queryKeys.users.list(params),
      queryKeys.users.detail('u-1'),
      queryKeys.users.all,
    ];
    for (const candidate of keys) {
      expect(candidate[0]).toBe('users');
    }
    // A different family is never swallowed by the users prefix.
    expect(queryKeys.patients.all).not.toStrictEqual(queryKeys.users.all);
  });
});
