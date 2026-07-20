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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Actor-Id', 'designer-user');

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  let title = response.statusText;
  let detail = `Request failed with status ${response.status}`;
  const bodyText = await response.text();

  if (bodyText) {
    try {
      const problem = JSON.parse(bodyText) as ProblemDetails;
      title = problem.title ?? title;
      detail = problem.detail ?? detail;
    } catch {
      detail = bodyText;
    }
  }

  throw new ApiError(response.status, title, detail);
}
