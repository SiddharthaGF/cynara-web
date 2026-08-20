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
 * Global Start configuration. Mounted by
 * `createStartHandler` (see src/server.ts); `startInstance` is also imported
 * by the generated route tree so server-function context types pick up the
 * middleware below.
 *
 * - CSRF: rejects cross-site server-function requests (Sec-Fetch-Site /
 *   Origin / Referer validation). Page navigations are exempt so the
 *   identity provider redirect back to /$locale/login works.
 * - Session: threads the sealed auth cookie into server-function context.
 */

const csrfMiddleware = createCsrfMiddleware({
  // Protect the same-origin RPC endpoints. Page navigations stay exempt:
  // Identity-provider redirects are idempotent GET loads, not RPC calls.
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
 * Function middleware for protected server functions. Rejects the call with
 * ApiError 401 when there is no active session holding a refresh token.
 * Attach with `.middleware([requireAuthMiddleware])` before `.handler()`.
 *
 * Built from startInstance.createMiddleware so its context picks up the
 * request middleware threading from Register.config.
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
