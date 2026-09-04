import type { ListUsersParams } from '@/api/users.ts';

export const DEFAULT_USER_PAGE_SIZE = 20;

/** Validated URL-persisted directory filters produced by the router. */
export interface UserListSearch {
  q?: string;
  hospitalCode?: string;
  page: number;
  pageSize: number;
}

/**
 * Raw router search before validation. Values arrive from the URL as
 * strings or numbers (or garbage), so the validator reads them
 * defensively off an unknown-keyed record.
 */
export type UserListSearchInput = Record<string, unknown>;

function positiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Keeps non-blank strings as-is (verbatim) and collapses blank or
 * whitespace-only values to `undefined`.
 */
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

export function validateUserListSearch(
  search: UserListSearchInput,
): UserListSearch {
  return {
    q: optionalString(search.q),
    // Passed verbatim: an unknown code must reach the server so it resolves to an empty scoped page.
    hospitalCode: optionalString(search.hospitalCode),
    page: positiveInt(search.page, 1),
    pageSize: positiveInt(search.pageSize, DEFAULT_USER_PAGE_SIZE),
  };
}

/**
 * Maps validated URL search onto wire-level listing params. The URL's
 * `hospitalCode` becomes the contract's `hospital` query key without any
 * transformation of its value.
 */
export function userListParamsFromSearch(
  search: UserListSearch,
): ListUsersParams {
  const params: ListUsersParams = {
    page: search.page,
    pageSize: search.pageSize,
  };
  if (search.q !== undefined) {
    params.q = search.q;
  }
  if (search.hospitalCode !== undefined) {
    params.hospital = search.hospitalCode;
  }
  return params;
}

/** Values collected by the directory search form right before submit. */
export interface UserDirectoryFormValues {
  q: string;
  hospitalCode: string;
}

/**
 * Next URL search after a submit-driven filter change: filters replace
 * their previous values, page always resets to 1, and the page size in
 * effect persists. Any hospital code present passes through verbatim.
 */
export function nextSearchAfterSubmit(
  prev: UserListSearch,
  values: UserDirectoryFormValues,
): UserListSearch {
  return {
    q: optionalString(values.q),
    hospitalCode: optionalString(values.hospitalCode),
    page: 1,
    pageSize: prev.pageSize,
  };
}
