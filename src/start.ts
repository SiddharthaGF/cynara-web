import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start';

import { ApiError } from '@/api/client.ts';
import {
  getAuthSession,
  readAuthSessionData,
  type AuthSessionManager,
} from '@/server/auth-session.ts';

/**
 * Global Start configuration (mounted by `createStartHandler`; see
 * src/server.ts). `startInstance` is also imported by the generated route tree
 * so server-function context types pick up the middleware:
 * - CSRF: rejects cross-site server-function requests (Sec-Fetch-Site / Origin
 *   / Referer); page navigations stay exempt so the IdP redirect works.
 * - Session: threads the sealed auth cookie into server-function context.
 */

const csrfMiddleware = createCsrfMiddleware({
  // Protect RPC endpoints only; IdP redirects are idempotent GET navigations, not RPC calls.
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export interface AuthSessionContext {
  session: AuthSessionManager;
  hospitalCode: string | null;
}

export interface AuthRequestContext {
  auth: AuthSessionContext | null;
}

const sessionMiddleware = createMiddleware({
  type: 'request',
}).server(async ({ next }) => {
  let auth: AuthSessionContext | null = null;
  const session = await getAuthSession();
  const data = session ? readAuthSessionData(session) : null;
  if (session && data) {
    auth = {
      session,
      hospitalCode: data.hospitalCode,
    };
  }
  return next({ context: { auth } satisfies AuthRequestContext });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, sessionMiddleware],
}));

/**
 * Function middleware for protected server functions: rejects with ApiError
 * 401 when there is no active session holding a refresh token.
 */
export const requireAuthMiddleware = startInstance
  .createMiddleware({
    type: 'function',
  })
  .server(async ({ context, next }) => {
    const { auth } = context;
    if (!auth?.session || !auth.session.data.refreshToken) {
      throw new ApiError(401, 'Unauthorized', 'No active session');
    }
    return next({ context: { auth } satisfies AuthRequestContext });
  });
