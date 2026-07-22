import { createIsomorphicFn } from '@tanstack/react-start';

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

function resolveApiOrigin(): string {
  const candidates = [
    { name: 'VITE_API_ORIGIN', value: import.meta.env.VITE_API_ORIGIN },
    { name: 'API_ORIGIN', value: import.meta.env.API_ORIGIN },
  ];
  for (const { value } of candidates) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim().replace(/\/$/u, '');
    }
  }
  const seen = candidates
    .map(({ name, value }) => `${name}=${JSON.stringify(value)}`)
    .join(', ');
  throw new Error(`Server unavailable (env: ${seen})`);
}

export const resolveApiUrl = createIsomorphicFn()
  .client((path: string) => {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    if (import.meta.env.DEV) {
      return path.startsWith('/') ? path : `/${path}`;
    }
    return new URL(path, `${resolveApiOrigin()}/`).href;
  })
  .server((path: string) => {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return new URL(path, `${resolveApiOrigin()}/`).href;
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
