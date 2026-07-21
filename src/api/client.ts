import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

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

function resolveSsrApiOrigin(): string {
  const origin = import.meta.env.VITE_API_ORIGIN;
  if (typeof origin === 'string' && origin.trim() !== '') {
    return origin.trim().replace(/\/$/, '');
  }
  throw new Error('Server unavailable');
}

const resolveApiUrl = createIsomorphicFn()
  .client((path: string) => path)
  .server((path: string) => {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const ssrApiOrigin = resolveSsrApiOrigin();
    if (import.meta.env.DEV) {
      return new URL(path, `${ssrApiOrigin}/`).href;
    }
    try {
      return new URL(path, getRequestUrl().origin).href;
    } catch {
      return new URL(path, `${ssrApiOrigin}/`).href;
    }
  });

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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
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
  return (await response.json()) as T;
}
