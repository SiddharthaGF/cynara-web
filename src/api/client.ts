import { createIsomorphicFn } from '@tanstack/react-start';

import { buildApiUrl } from '@/lib/api-origin.ts';
import { isDevelopment } from '@/lib/environment.ts';

export const HOSPITAL_HEADER_NAME = 'X-Hospital-Code';

export const ACTOR_HEADER_NAME = 'X-Actor-Id';
export const DEFAULT_ACTOR_ID = 'designer-user';

const TENANT_FALLBACK = 'default';

function resolveTenantCode(): string {
  const fromEnv = import.meta.env.VITE_HOSPITAL_CODE;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }
  return TENANT_FALLBACK;
}

export function resolveHospitalCode(): string {
  return resolveTenantCode();
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly title: string;
  public readonly errors: readonly JsonApiErrorObject[];
  public readonly problem: ProblemDetails | null;

  public constructor(
    status: number,
    title: string,
    detail: string,
    options: {
      errors?: JsonApiErrorObject[];
      problem?: ProblemDetails | null;
    } = {},
  ) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
    this.errors = options.errors ?? [];
    this.problem = options.problem ?? null;
  }
}

interface JsonApiErrorObject {
  title?: string;
  detail?: string;
  status?: string;
  code?: string;
}

interface JsonApiErrorDocument {
  errors?: JsonApiErrorObject[];
}

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
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

function isConcurrencyConflict(status: number): boolean {
  return status === 409 || status === 412;
}

function buildErrorFromJsonApi(status: number, bodyText: string): ApiError {
  if (bodyText) {
    try {
      const document = JSON.parse(bodyText) as JsonApiErrorDocument;
      const first = document.errors?.[0];
      if (first) {
        return new ApiError(
          status,
          first.title ?? 'Request failed',
          first.detail ?? `Request failed with status ${status}`,
          {
            errors: document.errors ?? [],
          },
        );
      }
    } catch {
      // Fall through to problem details / raw text handling.
    }
  }

  return buildErrorFromProblem(status, bodyText);
}

function buildErrorFromProblem(status: number, bodyText: string): ApiError {
  if (bodyText) {
    try {
      const problem = JSON.parse(bodyText) as ProblemDetails;
      const title = problem.title ?? 'Request failed';
      const detail = problem.detail ?? `Request failed with status ${status}`;
      return new ApiError(status, title, detail, { problem });
    } catch {
      return new ApiError(
        status,
        'Request failed',
        summarizeErrorBody(status, bodyText),
      );
    }
  }

  return new ApiError(
    status,
    'Request failed',
    `Request failed with status ${status}`,
  );
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const bodyText = await response.text();

  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new ApiError(
      response.status,
      'Invalid API response',
      summarizeErrorBody(response.status, bodyText),
    );
  }
}

function buildDefaultHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has(HOSPITAL_HEADER_NAME)) {
    headers.set(HOSPITAL_HEADER_NAME, resolveTenantCode());
  }
  if (!headers.has(ACTOR_HEADER_NAME)) {
    headers.set(ACTOR_HEADER_NAME, DEFAULT_ACTOR_ID);
  }
  return headers;
}

export const resolveApiUrl = createIsomorphicFn()
  .client((path: string) => {
    if (isDevelopment()) {
      return path.startsWith('/') ? path : `/${path}`;
    }
    return buildApiUrl(path);
  })
  .server((path: string) =>
    // In Vite/Cloudflare SSR, prefer the API origin directly. Relative /api
    // Paths are not valid fetch targets on the server.
    buildApiUrl(path),
  );

export interface ApiRequestInit extends RequestInit {
  /** Set `true` to send the `If-None-Match` header when an ETag is known. */
  etag?: string | null;
}

export async function apiRequest<T>(
  path: string,
  init?: ApiRequestInit,
): Promise<T> {
  const { etag, ...requestInit } = init ?? {};
  const headers = buildDefaultHeaders(requestInit);
  if (etag) {
    headers.set('If-None-Match', etag);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...requestInit,
    headers,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw buildErrorFromJsonApi(response.status, bodyText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJsonResponse<T>(response);
}

/**
 * Returns either the parsed body or, when the server replies `304 Not Modified`,
 * the supplied cached value. The ETag echo is intentionally not surfaced — the
 * caller can refresh it from the response when needed.
 */
export async function apiRequestWithCache<T>(
  path: string,
  etag: string | null | undefined,
  fallback: T,
  init?: ApiRequestInit,
): Promise<{ data: T; etag: string | null }> {
  const headers = buildDefaultHeaders(init);
  if (etag) {
    headers.set('If-None-Match', etag);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    method: init?.method ?? 'GET',
    headers,
  });

  if (response.status === 304) {
    return { data: fallback, etag: etag ?? null };
  }

  if (!response.ok) {
    const bodyText = await response.text();
    throw buildErrorFromJsonApi(response.status, bodyText);
  }

  if (response.status === 204) {
    return { data: fallback, etag: response.headers.get('etag') };
  }

  const data = await parseJsonResponse<T>(response);
  return { data, etag: response.headers.get('etag') };
}

export { isConcurrencyConflict };
