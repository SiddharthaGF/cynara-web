import { getIdentityOrigin } from '@/server/env.ts';

export { AUTH_AUTHORIZE_PATH } from '@/lib/auth-authorize.ts';

const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type'] as const;
const ALLOWED_FORM_FIELDS = new Set([
  'client_id',
  'request_uri',
  'email',
  'password',
]);

export class AuthorizeProxyRequestError extends Error {
  public readonly status: number;

  public constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthorizeProxyRequestError';
    this.status = status;
  }
}

export async function createAuthorizeProxyRequest(
  request: Request,
  identityOrigin: string,
): Promise<{ url: string; init: RequestInit }> {
  const url = new URL(request.url);
  const backendUrl = new URL('/connect/authorize', `${identityOrigin}/`);
  backendUrl.search = url.search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  let body: string | undefined = undefined;
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
      throw new AuthorizeProxyRequestError(
        415,
        'Authorization requests must use form encoding.',
      );
    }

    const form = new URLSearchParams(await request.text());
    for (const key of form.keys()) {
      if (!ALLOWED_FORM_FIELDS.has(key)) {
        throw new AuthorizeProxyRequestError(
          400,
          'Authorization request contains an unsupported field.',
        );
      }
    }
    if (!form.has('client_id') || !form.has('request_uri')) {
      throw new AuthorizeProxyRequestError(
        400,
        'Authorization request is missing its transaction handle.',
      );
    }
    body = form.toString();
    headers.set('content-type', 'application/x-www-form-urlencoded');
  }

  return {
    url: backendUrl.href,
    init: {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      signal: request.signal,
    },
  };
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const [name, value] of source) {
    if (
      name !== 'connection' &&
      name !== 'keep-alive' &&
      name !== 'set-cookie' &&
      name !== 'transfer-encoding' &&
      name !== 'upgrade'
    ) {
      headers.set(name, value);
    }
  }
  return headers;
}

export async function proxyAuthorizeRequest(
  request: Request,
  identityOrigin?: string,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return Response.json(
      { title: 'Method not allowed', detail: 'Use GET or POST.' },
      { status: 405, headers: { Allow: 'GET, POST' } },
    );
  }

  try {
    const upstreamRequest = await createAuthorizeProxyRequest(
      request,
      identityOrigin ?? getIdentityOrigin(),
    );
    const upstream = await fetch(upstreamRequest.url, upstreamRequest.init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream.headers),
    });
  } catch (error) {
    if (error instanceof AuthorizeProxyRequestError) {
      return Response.json(
        { title: 'Invalid authorization request', detail: error.message },
        { status: error.status },
      );
    }
    return Response.json(
      {
        title: 'Authorization request failed',
        detail: 'The authorization request could not be completed.',
      },
      { status: 502 },
    );
  }
}
