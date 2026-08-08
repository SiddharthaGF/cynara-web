import { vi } from 'vitest';

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Headers;
  bodyText: string;
}

export function stubFetchWithCapture(
  impl: (
    request: Request,
    captured: CapturedRequest,
  ) => Response | Promise<Response>,
): CapturedRequest {
  const captured: CapturedRequest = {
    url: '',
    method: '',
    headers: new Headers(),
    bodyText: '',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        captured.url = request.url;
        captured.method = request.method;
        captured.headers = new Headers(request.headers);
        captured.bodyText = await request.text();
        const response = await impl(request, captured);
        return response;
      },
    ),
  );
  return captured;
}

export function jsonApiResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Content-Type': 'application/vnd.api+json' },
  });
}
