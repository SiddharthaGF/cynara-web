import {
  ACTOR_HEADER_NAME,
  ApiError,
  DEFAULT_ACTOR_ID,
  HOSPITAL_HEADER_NAME,
  performRequest,
  resolveHospitalCode,
  type RequestContext,
} from '@/api/client.ts';

export const JSON_API_MEDIA = 'application/vnd.api+json';

export interface JsonApiResource<TAttributes = Record<string, unknown>> {
  id: string;
  type: string;
  attributes: TAttributes;
  relationships?: Record<
    string,
    {
      data:
        | { type: string; id: string }
        | { type: string; id: string }[]
        | null;
    }
  >;
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface JsonApiDocument<TAttributes = Record<string, unknown>> {
  data: JsonApiResource<TAttributes> | JsonApiResource<TAttributes>[];
  included?: JsonApiResource[];
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface JsonApiCollection<TAttributes = Record<string, unknown>> {
  data: JsonApiResource<TAttributes>[];
  included: JsonApiResource[];
  links: Record<string, string>;
  meta: Record<string, unknown>;
}

export interface PaginatedQueryOptions {
  /** Resource `include[]` names, joined as `?include=a,b`. */
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

export function buildPaginatedQuery(options: PaginatedQueryOptions): string {
  const params = new URLSearchParams();
  if (options.include && options.include.length > 0) {
    params.set('include', options.include.join(','));
  }
  if (options.sort) {
    params.set('sort', options.sort);
  }
  if (options.pageNumber !== undefined) {
    params.set('page[number]', String(options.pageNumber));
  }
  if (options.pageSize !== undefined) {
    params.set('page[size]', String(options.pageSize));
  }
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined) {
        params.set(`filter[${key}]`, String(value));
      }
    }
  }
  return params.toString();
}

function jsonApiHeaders(contentType?: string): Headers {
  const headers = new Headers();
  headers.set('Accept', JSON_API_MEDIA);
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  headers.set(HOSPITAL_HEADER_NAME, resolveHospitalCode());
  headers.set(ACTOR_HEADER_NAME, DEFAULT_ACTOR_ID);
  return headers;
}

async function parseJsonApiResponse(
  response: Response,
): Promise<JsonApiDocument> {
  const bodyText = await response.text();

  if (!response.ok) {
    throwJsonApiError(response.status, bodyText);
  }

  if (response.status === 204 || bodyText.trim() === '') {
    return { data: [] };
  }

  try {
    return JSON.parse(bodyText) as JsonApiDocument;
  } catch {
    throw new ApiError(
      response.status,
      'Invalid API response',
      summarizeJsonApiBody(response.status, bodyText),
    );
  }
}

function throwJsonApiError(status: number, bodyText: string): never {
  if (bodyText) {
    const parsed = parseBodyForErrors(bodyText);
    if (isJsonApiErrorDocument(parsed)) {
      const first = parsed.errors?.[0];
      if (first) {
        throw new ApiError(
          status,
          first.title ?? 'Request failed',
          first.detail ?? `Request failed with status ${status}`,
          { errors: parsed.errors ?? [] },
        );
      }
    }
  }

  throw new ApiError(
    status,
    'Request failed',
    bodyText
      ? summarizeJsonApiBody(status, bodyText)
      : `Request failed with status ${status}`,
  );
}

function requireSingleResource<TAttributes>(
  data: JsonApiDocument['data'],
): JsonApiResource<TAttributes> {
  if (Array.isArray(data) || !data) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Expected a single JSON:API resource.',
    );
  }
  return data as JsonApiResource<TAttributes>;
}

function summarizeJsonApiBody(status: number, bodyText: string): string {
  const trimmed = bodyText.trimStart();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML')
  ) {
    return `Request failed with status ${status}`;
  }
  return bodyText;
}

function parseBodyForErrors(bodyText: string): unknown {
  try {
    return JSON.parse(bodyText);
  } catch {
    return undefined;
  }
}

function isJsonApiErrorDocument(value: unknown): value is {
  errors?: {
    title?: string;
    detail?: string;
    status?: string;
    code?: string;
  }[];
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'errors' in value &&
    Array.isArray((value as { errors?: unknown }).errors)
  );
}

export async function jsonApiGet(path: string): Promise<JsonApiDocument> {
  const context: RequestContext = { path, method: 'GET', url: '' };
  const response = await performRequest(path, context, {
    headers: jsonApiHeaders(),
  });
  context.url = response.url || context.url;
  return parseJsonApiResponse(response);
}

export async function jsonApiGetResource<TAttributes>(
  path: string,
): Promise<JsonApiResource<TAttributes>> {
  const document = await jsonApiGet(path);
  return requireSingleResource<TAttributes>(document.data);
}

export async function jsonApiGetCollection<TAttributes>(path: string): Promise<{
  data: JsonApiResource<TAttributes>[];
  included: JsonApiResource[];
}> {
  const document = await jsonApiGet(path);
  let data: JsonApiResource<TAttributes>[] = [];
  if (Array.isArray(document.data)) {
    data = document.data as JsonApiResource<TAttributes>[];
  } else if (document.data) {
    data = [document.data as JsonApiResource<TAttributes>];
  }
  return {
    data,
    included: document.included ?? [],
  };
}

export async function jsonApiPostResource<TAttributes>(
  resourceType: string,
  attributes: Record<string, unknown>,
  relationships?: Record<string, unknown>,
): Promise<JsonApiResource<TAttributes>> {
  const data: Record<string, unknown> = {
    type: resourceType,
    attributes,
  };
  if (relationships) {
    data.relationships = relationships;
  }

  const path = `/api/${resourceType}`;
  const context: RequestContext = { path, method: 'POST', url: '' };
  const response = await performRequest(path, context, {
    method: 'POST',
    headers: jsonApiHeaders(JSON_API_MEDIA),
    body: JSON.stringify({ data }),
  });
  context.url = response.url || context.url;
  const document = await parseJsonApiResponse(response);
  return requireSingleResource<TAttributes>(document.data);
}

export async function jsonApiPatchResource<TAttributes>(
  resourceType: string,
  id: string,
  attributes: Record<string, unknown>,
  relationships?: Record<string, unknown>,
): Promise<JsonApiResource<TAttributes>> {
  const data: Record<string, unknown> = {
    type: resourceType,
    id,
    attributes,
  };
  if (relationships) {
    data.relationships = relationships;
  }

  const path = `/api/${resourceType}/${id}`;
  const context: RequestContext = { path, method: 'PATCH', url: '' };
  const response = await performRequest(path, context, {
    method: 'PATCH',
    headers: jsonApiHeaders(JSON_API_MEDIA),
    body: JSON.stringify({ data }),
  });
  context.url = response.url || context.url;
  const document = await parseJsonApiResponse(response);
  return requireSingleResource<TAttributes>(document.data);
}

export function includedOfType(
  included: JsonApiResource[],
  type: string,
): JsonApiResource[] {
  return included.filter((item) => item.type === type);
}

export function relatedIds(
  resource: JsonApiResource<unknown>,
  relationshipName: string,
): string[] {
  const rel = resource.relationships?.[relationshipName]?.data;
  if (!rel) {
    return [];
  }
  if (Array.isArray(rel)) {
    return rel.map((item) => item.id);
  }
  return [rel.id];
}

export function attrString(attributes: object, name: string): string | null {
  const value = (attributes as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : null;
}

export function attrNumber(attributes: object, name: string): number | null {
  const value = (attributes as Record<string, unknown>)[name];
  return typeof value === 'number' ? value : null;
}
