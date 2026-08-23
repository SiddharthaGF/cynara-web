import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getUser as sdkGetUser,
  listUsers as sdkListUsers,
  type ListUsersData,
  type UserDirectoryDetail,
  type UserDirectoryListItem,
  type UserDirectoryListResponse,
} from '@/api/generated';

/**
 * Read model for the administrative user directory. Derived from the
 * generated contract types with the fields the app relies on promoted to
 * required. The detail exposes exactly the DTO fields returned by the
 * CYN-103 scoped read API — no roles exist anywhere in this contract.
 */
export type UserDto = Required<UserDirectoryDetail>;
export type UserListItem = Required<UserDirectoryListItem>;
export type UserListResponse = Omit<UserDirectoryListResponse, 'items'> & {
  items: UserListItem[];
};

/**
 * Wire-level listing parameters, taken verbatim from the generated contract
 * (`hospital` is the wire name; the URL search param stays `hospitalCode`
 * and is mapped at the feature boundary without altering its value).
 */
export type ListUsersParams = NonNullable<ListUsersData['query']>;

/**
 * Lists directory users. Query params are forwarded verbatim so a
 * hospital-scoped caller's pinned scope and any URL-supplied hospital code
 * reach the server untouched; the server re-pins results to the caller's
 * scope. There is no client-side fallback to an unfiltered listing.
 */
export async function listUsers(
  params: ListUsersParams = {},
): Promise<UserListResponse> {
  const { data } = await sdkListUsers({
    query: params,
    headers: contractHeaders(),
  });
  return {
    ...data,
    items: (data.items ?? []).map(requireDto),
  };
}

export async function getUser(id: string): Promise<UserDto> {
  const { data } = await sdkGetUser({
    path: { id },
    headers: contractHeaders(),
  });
  return requireDto(data);
}

export function isForbiddenUserError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}
