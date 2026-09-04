export interface AcceptSearch {
  token?: string;
}

/**
 * Normalizes the accept-route search params. Pure helper kept outside
 * the route module so the route file only exports the TanStack `Route`.
 */
export function parseAcceptSearch(
  search: Record<string, unknown>,
): AcceptSearch {
  return {
    token: typeof search.token === 'string' ? search.token.trim() : undefined,
  };
}
