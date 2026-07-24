import { ApiError, resolveApiUrl } from '@/api/client.ts';

export const JSON_API_MEDIA = 'application/vnd.api+json';

interface JsonApiErrorObject {
  title?: string;
  detail?: string;
  status?: string;
}

interface JsonApiErrorDocument {
  errors?: JsonApiErrorObject[];
}

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
}

export interface JsonApiDocument<TAttributes = Record<string, unknown>> {
  data: JsonApiResource<TAttributes> | JsonApiResource<TAttributes>[];
  included?: JsonApiResource[];
}

function summarizeErrorBody(status: number, bodyText: string): string {
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

function throwFromJsonApiBody(status: number, bodyText: string): never {
  if (bodyText) {
    try {
      const document = JSON.parse(bodyText) as JsonApiErrorDocument;
      const first = document.errors?.[0];
      if (first) {
        throw new ApiError(
          status,
          first.title ?? 'Request failed',
          first.detail ?? `Request failed with status ${status}`,
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
    }
  }

  throw new ApiError(
    status,
    'Request failed',
    bodyText
      ? summarizeErrorBody(status, bodyText)
      : `Request failed with status ${status}`,
  );
}

async function parseJsonApiResponse(
  response: Response,
): Promise<JsonApiDocument> {
  const bodyText = await response.text();

  if (!response.ok) {
    throwFromJsonApiBody(response.status, bodyText);
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
      summarizeErrorBody(response.status, bodyText),
    );
  }
}

function jsonApiHeaders(contentType?: string): Headers {
  const headers = new Headers();
  headers.set('Accept', JSON_API_MEDIA);
  headers.set('X-Actor-Id', 'designer-user');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  return headers;
}

export async function jsonApiGet(path: string): Promise<JsonApiDocument> {
  const response = await fetch(resolveApiUrl(path), {
    headers: jsonApiHeaders(),
  });
  return parseJsonApiResponse(response);
}

export async function jsonApiGetResource<TAttributes>(
  path: string,
): Promise<JsonApiResource<TAttributes>> {
  const document = await jsonApiGet(path);
  if (Array.isArray(document.data)) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Expected a single JSON:API resource.',
    );
  }
  return document.data as JsonApiResource<TAttributes>;
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

  const response = await fetch(resolveApiUrl(`/api/${resourceType}`), {
    method: 'POST',
    headers: jsonApiHeaders(JSON_API_MEDIA),
    body: JSON.stringify({ data }),
  });
  const document = await parseJsonApiResponse(response);
  if (Array.isArray(document.data) || !document.data) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Expected a single JSON:API resource.',
    );
  }
  return document.data as JsonApiResource<TAttributes>;
}

export async function jsonApiPatchResource<TAttributes>(
  resourceType: string,
  id: string,
  attributes: Record<string, unknown>,
): Promise<JsonApiResource<TAttributes>> {
  const response = await fetch(resolveApiUrl(`/api/${resourceType}/${id}`), {
    method: 'PATCH',
    headers: jsonApiHeaders(JSON_API_MEDIA),
    body: JSON.stringify({
      data: {
        type: resourceType,
        id,
        attributes,
      },
    }),
  });
  const document = await parseJsonApiResponse(response);
  if (Array.isArray(document.data) || !document.data) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Expected a single JSON:API resource.',
    );
  }
  return document.data as JsonApiResource<TAttributes>;
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
