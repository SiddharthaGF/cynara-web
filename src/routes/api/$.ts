import { createFileRoute } from '@tanstack/react-router';

import { ApiError } from '@/api/client.ts';
import {
  callApiWithAuth,
  createReplayableRequestInitFactory,
} from '@/server/api-proxy.ts';
import { getAuthSession } from '@/server/auth-session.ts';

const FORWARDED_HEADERS = [
  'accept',
  'content-type',
  'if-match',
  'if-none-match',
];

/** Same-origin BFF for every browser API call. Tokens never enter browser JS. */
export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});

async function handle({ request }: { request: Request }): Promise<Response> {
  const session = await getAuthSession();
  if (!session) {
    return Response.json(
      { title: 'Unauthorized', detail: 'Sign-in required.' },
      { status: 401 },
    );
  }

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  const url = new URL(request.url);
  try {
    const response = await callApiWithAuth(session, {
      path: `${url.pathname}${url.search}`,
      initFactory: createReplayableRequestInitFactory(request, headers),
    });
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { title: error.title, detail: error.message },
        { status: error.status },
      );
    }
    return Response.json(
      {
        title: 'Request failed',
        detail: 'The request could not be completed.',
      },
      { status: 502 },
    );
  }
}
