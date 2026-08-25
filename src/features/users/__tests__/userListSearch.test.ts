import { describe, expect, it } from 'vitest';

import {
  DEFAULT_USER_PAGE_SIZE,
  nextSearchAfterSubmit,
  userListParamsFromSearch,
  validateUserListSearch,
} from '@/features/users/userListSearch.ts';

describe('validateUserListSearch', () => {
  it('applies defaults for missing page and pageSize', () => {
    const search = validateUserListSearch({});
    expect(search.page).toBe(1);
    expect(search.pageSize).toBe(DEFAULT_USER_PAGE_SIZE);
  });

  it('clamps invalid page values to the default', () => {
    expect(validateUserListSearch({ page: 0 }).page).toBe(1);
    expect(validateUserListSearch({ page: -3 }).page).toBe(1);
    expect(validateUserListSearch({ page: 'two' }).page).toBe(1);
    expect(validateUserListSearch({ page: 1.5 }).page).toBe(1);
  });

  it('clamps invalid pageSize values to the default', () => {
    expect(validateUserListSearch({ pageSize: 0 }).pageSize).toBe(
      DEFAULT_USER_PAGE_SIZE,
    );
    expect(validateUserListSearch({ pageSize: 'x' }).pageSize).toBe(
      DEFAULT_USER_PAGE_SIZE,
    );
  });

  it('keeps valid positive integers', () => {
    const search = validateUserListSearch({ page: 3, pageSize: 50 });
    expect(search.page).toBe(3);
    expect(search.pageSize).toBe(50);
  });

  it('collapses blank strings to undefined', () => {
    const search = validateUserListSearch({ q: '   ', hospitalCode: '' });
    expect(search.q).toBeUndefined();
    expect(search.hospitalCode).toBeUndefined();
  });

  it('preserves hospitalCode verbatim when present', () => {
    // Whitespace inside is kept; the value is never trimmed, defaulted,
    // Or cleared client-side.
    const search = validateUserListSearch({ hospitalCode: ' hospital-norte ' });
    expect(search.hospitalCode).toBe(' hospital-norte ');
  });

  it('preserves a plain q value', () => {
    expect(validateUserListSearch({ q: 'ada' }).q).toBe('ada');
  });
});

describe('userListParamsFromSearch', () => {
  it('maps URL filters onto wire params verbatim', () => {
    const params = userListParamsFromSearch({
      q: 'ada',
      hospitalCode: 'hospital-norte',
      page: 2,
      pageSize: 20,
    });
    expect(params).toStrictEqual({
      q: 'ada',
      hospital: 'hospital-norte',
      page: 2,
      pageSize: 20,
    });
  });

  it('omits absent filters instead of sending empties', () => {
    const params = userListParamsFromSearch({
      page: 1,
      pageSize: DEFAULT_USER_PAGE_SIZE,
    });
    expect(params).toStrictEqual({
      page: 1,
      pageSize: DEFAULT_USER_PAGE_SIZE,
    });
    expect('hospital' in params).toBeFalsy();
    expect('q' in params).toBeFalsy();
  });

  it('forwards an unknown hospital code without any fallback', () => {
    const params = userListParamsFromSearch({
      hospitalCode: 'no-such-hospital',
      page: 1,
      pageSize: DEFAULT_USER_PAGE_SIZE,
    });
    expect(params.hospital).toBe('no-such-hospital');
  });
});

describe('nextSearchAfterSubmit', () => {
  it('resets the page to 1 when filters change (spec: filter change resets page)', () => {
    const next = nextSearchAfterSubmit(
      { q: 'old', hospitalCode: undefined, page: 3, pageSize: 20 },
      { q: 'ada', hospitalCode: '' },
    );
    expect(next.page).toBe(1);
    expect(next.pageSize).toBe(20);
    expect(next.q).toBe('ada');
    expect(next.hospitalCode).toBeUndefined();
  });

  it('keeps a present hospital code verbatim while resetting the page', () => {
    const next = nextSearchAfterSubmit(
      { page: 7, pageSize: 50 },
      { q: '', hospitalCode: ' crafted-code ' },
    );
    expect(next.page).toBe(1);
    expect(next.pageSize).toBe(50);
    expect(next.q).toBeUndefined();
    expect(next.hospitalCode).toBe(' crafted-code ');
  });
});
