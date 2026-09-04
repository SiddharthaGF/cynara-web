import {
  ApiError,
  HOSPITAL_HEADER_NAME,
  JSON_API_MEDIA,
  buildErrorFromJsonApi,
  logApiError,
  resolveHospitalCode,
  type RequestContext,
} from '@/api/client.ts';
import type { Config } from '@/api/generated/client';
import { attachSessionAuth } from '@/api/server-auth-hook';
import { getApiOrigin } from '@/lib/api-origin.ts';

/**
 * Flattens the JSON:API `query` map into plain `?include=...&sort=...` pairs
 * (hey-api's default would emit `query[include]=...`); other params pass through.
 */
/**
 * Serializes a single query value. JSON:API query params are primitives
 * (strings, numbers, booleans); object values fall through to `undefined`
 * instead of stringifying to `[object Object]`.
 */
function stringifyQueryValue(value: unknown): string | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return undefined;
}

function appendQueryValue(
  search: URLSearchParams,
  key: string,
  value: unknown,
): void {
  const text = stringifyQueryValue(value);
  if (text !== undefined) {
    search.append(key, text);
  }
}

function cynaraQuerySerializer(queryParams: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(queryParams)) {
    if (
      name === 'query' &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      const map = value as Record<string, unknown>;
      for (const [key, item] of Object.entries(map)) {
        appendQueryValue(search, key, item);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        appendQueryValue(search, name, item);
      }
    } else if (typeof value === 'object') {
      // DeepObject fallback for any future object-typed query params.
      const map = value as Record<string, unknown>;
      for (const [key, item] of Object.entries(map)) {
        appendQueryValue(search, `${name}[${key}]`, item);
      }
    } else {
      appendQueryValue(search, name, value);
    }
  }
  return search.toString();
}

/**
 * Custom fetch wired into the generated client. Preserves the app's `ApiError`
 * contract: non-ok responses are mapped from JSON:API error documents /
 * Problem Details and thrown; network failures keep their classification and
 * are reported before rethrow. The incoming `Request` already carries the
 * tenant/actor headers (merged from the client config) and any `AbortSignal`.
 */
const cynaraFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  const url = new URL(request.url);
  const context: RequestContext = {
    path: url.pathname,
    method: request.method,
    url: request.url,
  };
  try {
    // Normalize the extension media type to plain `application/vnd.api+json`; the
    // API only matches the base type (matches the legacy hand-written client).
    const headers = new Headers(request.headers);
    const contentType = headers.get('Content-Type');
    if (contentType?.toLowerCase().startsWith('application/vnd.api+json;')) {
      headers.set('Content-Type', 'application/vnd.api+json');
    }
    let normalized = new Request(request, { headers });
    if (typeof window === 'undefined') {
      // Server-side calls bypass the BFF proxy, so they must carry the bearer token themselves.
      const authedInit = await attachSessionAuth({
        method: request.method,
        headers,
        body: request.body,
        signal: request.signal,
      });
      normalized = new Request(normalized, {
        headers: new Headers(authedInit.headers),
      });
    }
    const response = await fetch(normalized);
    if (!response.ok) {
      const bodyText = await response.text();
      const apiError = buildErrorFromJsonApi(response.status, bodyText);
      logApiError('http', context, apiError);
      throw apiError;
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logApiError('network', context, error);
    throw error;
  }
};

/**
 * Headers the OpenAPI contract marks as required on every operation. The
 * client config already injects the same values; passing them per-call
 * satisfies the generated option types (required header params) without
 * changing the wire request.
 */
export function contractHeaders(): { [HOSPITAL_HEADER_NAME]: string } {
  return { [HOSPITAL_HEADER_NAME]: resolveHospitalCode() };
}

/**
 * Promotes a generated (all-optional) DTO to the app-facing required shape.
 * The API serializes complete records, so the fields are always present; the
 * generated types only lack `required` markers in the OpenAPI contract.
 */
export function requireDto<T extends object>(data: T): Required<T> {
  return data as Required<T>;
}

/**
 * Initial configuration for the generated client, consumed through the
 * `runtimeConfigPath` hook in `tools/api-client/openapi-ts.config.ts`.
 */
export function createClientConfig(override?: Config): Config {
  return {
    ...override,
    baseUrl: getApiOrigin(),
    throwOnError: true,
    fetch: cynaraFetch,
    querySerializer: cynaraQuerySerializer,
    headers: {
      'Accept': JSON_API_MEDIA,
      'Content-Type': JSON_API_MEDIA,
    },
  };
}
