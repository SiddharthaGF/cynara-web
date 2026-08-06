import type { ResourceInResponse } from '@/api/generated';

/** Options for building the free-form query map of a JSON:API list endpoint. */
export interface PaginatedQueryOptions {
  /** Resource `include[]` names, joined as `include=a,b`. */
  include?: readonly string[];
  /** Sort expression passed verbatim (`-updatedAt` or `code`). */
  sort?: string;
  /** Page number (1-based). */
  pageNumber?: number;
  /** Page size. */
  pageSize?: number;
  /** Free-form filters — keys become `filter[<key>]` entries. */
  filters?: Readonly<Record<string, string | number | boolean | undefined>>;
}

/**
 * Builds the `query` map that JSON:API collection endpoints accept through the
 * generated client's free-form `query` object parameter. The custom query
 * serializer flattens it into plain `?include=...&sort=...` pairs.
 */
export function buildPaginatedQuery(
  options: PaginatedQueryOptions,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (options.include && options.include.length > 0) {
    params.include = options.include.join(',');
  }
  if (options.sort) {
    params.sort = options.sort;
  }
  if (options.pageNumber !== undefined) {
    params['page[number]'] = String(options.pageNumber);
  }
  if (options.pageSize !== undefined) {
    params['page[size]'] = String(options.pageSize);
  }
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined) {
        params[`filter[${key}]`] = String(value);
      }
    }
  }
  return params;
}

/**
 * Filters a JSON:API `included` array down to the resources of one type. The
 * contract types included resources loosely (`ResourceInResponse` without an
 * `id`), so each candidate is checked for the expected type and a string id.
 */
export function includedResources<
  T extends ResourceInResponse & { id: string },
>(included: readonly ResourceInResponse[], type: T['type']): T[] {
  return included.filter((item): item is T => {
    if (item.type !== type) {
      return false;
    }
    const withId = item as ResourceInResponse & { id?: unknown };
    return typeof withId.id === 'string';
  });
}

interface ToManyRelationship {
  data?: readonly { id: string }[] | null;
}

interface ToOneRelationship {
  data?: { id: string } | null;
}

/** Reads the resource ids of a to-many relationship, if present. */
export function relationshipIds(
  relationship: ToManyRelationship | undefined,
): string[] {
  return relationship?.data?.map((item) => item.id) ?? [];
}

/** Reads the resource id of a to-one relationship, if present. */
export function relationshipId(
  relationship: ToOneRelationship | undefined,
): string | undefined {
  return relationship?.data?.id ?? undefined;
}
