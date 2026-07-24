import { createIsomorphicFn } from '@tanstack/react-start';

import { buildApiUrl } from '@/lib/api-origin.ts';
import { isDevelopment } from '@/lib/environment.ts';

export class ApiError extends Error {
  public readonly status: number;
  public readonly title: string;

  public constructor(status: number, title: string, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
  }
}

interface ProblemDetails {
  title?: string;
  detail?: string;
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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  headers.set('X-Actor-Id', 'designer-user');

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let title = response.statusText;
    let detail = `Request failed with status ${response.status}`;
    const bodyText = await response.text();

    if (bodyText) {
      try {
        const problem = JSON.parse(bodyText) as ProblemDetails;
        title = problem.title ?? title;
        detail = problem.detail ?? detail;
      } catch {
        detail = summarizeErrorBody(response.status, bodyText);
      }
    }

    throw new ApiError(response.status, title, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJsonResponse<T>(response);
}
