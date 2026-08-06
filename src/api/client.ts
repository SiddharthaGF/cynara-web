import { createIsomorphicFn } from '@tanstack/react-start';

import {
  buildApiUrl,
  resolveHospitalCode as resolveHospitalCodeShared,
} from '@/lib/api-origin.ts';

export const HOSPITAL_HEADER_NAME = 'X-Hospital-Code';

export const ACTOR_HEADER_NAME = 'X-Actor-Id';
export const DEFAULT_ACTOR_ID = 'designer-user';
export const JSON_API_MEDIA = 'application/vnd.api+json';

const TENANT_FALLBACK = 'default';

const resolveTenantCode = createIsomorphicFn()
  .client((): string => resolveHospitalCodeShared() || TENANT_FALLBACK)
  .server((): string => resolveHospitalCodeShared() || TENANT_FALLBACK);

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

export function summarizeErrorBody(status: number, bodyText: string): string {
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

export function describeNetworkError(error: unknown): {
  status: number;
  title: string;
} {
  if (error instanceof TypeError) {
    const { message } = error;
    if (message === 'Failed to fetch') {
      // The browser refused to perform the request (typically CORS, mixed content, extensions, or offline).
      return { status: 0, title: 'Network error (CORS or offline)' };
    }
    if (message.toLowerCase().includes('networkerror')) {
      return { status: 0, title: 'Network error' };
    }
    if (error.name === 'AbortError') {
      return { status: 0, title: 'Request aborted' };
    }
    return { status: 0, title: 'Network error' };
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { status: 0, title: 'Request aborted' };
  }
  return { status: 0, title: 'Unexpected error' };
}

function buildLogDetail(
  phase: 'http' | 'parse' | 'network',
  error: unknown,
): { status: number; title: string; message: string } {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof ApiError) {
    return { status: error.status, title: error.title, message: error.message };
  }

  if (phase === 'network') {
    const { status, title } = describeNetworkError(error);
    return { status, title, message };
  }

  return { status: 0, title: 'Unexpected error', message };
}

export function logApiError(
  phase: 'http' | 'parse' | 'network',
  context: {
    path: string;
    method: string;
    url: string;
  },
  error: unknown,
): void {
  const detail = buildLogDetail(phase, error);
  const reported =
    error instanceof Error
      ? error
      : new Error(`[cynara-api] ${phase} ${context.method} ${context.path}`);
  reported.cause = {
    url: context.url,
    ...detail,
    original: error instanceof Error ? undefined : error,
  };
  // Browser-native reporting avoids console.* (forbidden by lint) while still
  // Surfacing failures to DevTools / error reporters. The guard keeps the
  // Isomorphic path safe on the server, where `reportError` does not exist.
  if (typeof reportError === 'function') {
    reportError(reported);
  }
}

export function buildErrorFromJsonApi(
  status: number,
  bodyText: string,
): ApiError {
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

export function buildErrorFromProblem(
  status: number,
  bodyText: string,
): ApiError {
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

export const resolveApiUrl = createIsomorphicFn()
  .client((path: string) => buildApiUrl(path))
  .server((path: string) => buildApiUrl(path));

export interface RequestContext {
  readonly path: string;
  readonly method: string;
  url: string;
}

export async function performRequest(
  path: string,
  context: RequestContext,
  fetchInit: RequestInit,
): Promise<Response> {
  const url = resolveApiUrl(path);
  context.url = url;
  try {
    return await fetch(url, fetchInit);
  } catch (error) {
    logApiError('network', context, error);
    throw error;
  }
}
