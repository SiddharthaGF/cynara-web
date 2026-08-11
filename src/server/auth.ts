import { createServerFn } from '@tanstack/react-start';

import { ApiError } from '@/api/client.ts';
import { isAppLocale, type AppLocale } from '@/lib/locale.ts';
import {
  callApiWithAuth,
  mapApiResponseError,
  type TokenEndpointResponse,
} from '@/server/api-proxy.ts';
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  clearAuthSession,
  clearPkceTransaction,
  createAuthSession,
  getPkceTransaction,
  readAuthSessionData,
  readPkceTransactionData,
  setPkceTransaction,
  type PkceTransactionData,
} from '@/server/auth-session.ts';
import {
  getAppOrigin,
  getAuthClientId,
  getAuthClientSecret,
  getAuthScopes,
  getIdentityOrigin,
} from '@/server/env.ts';
import { requireAuthMiddleware } from '@/start.ts';

/**
 * Auth server functions for the CYN-96 disposable spike: authorization-code +
 * PKCE login, refresh-token logout, and a protected /api/me call through the
 * BFF. Tokens never reach browser JS; the refresh token lives in the sealed
 * httpOnly session cookie.
 */

export interface AuthenticatedUser {
  actorId: string;
  capabilities: string[];
  email?: string | null;
  hospital?: string | null;
}

export type LoginInput =
  | {
      kind: 'start';
      locale: AppLocale;
      redirectTo: string;
      hospitalCode: string;
    }
  | { kind: 'callback'; code: string; state: string };

const MAX_REDIRECT_LENGTH = 2048;
const MAX_CODE_LENGTH = 2048;
const MAX_STATE_LENGTH = 256;
const HOSPITAL_CODE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/u;

/**
 * Internal-only redirect target: a same-origin path. Rejects protocol-relative
 * URLs, backslashes, and path traversal so the post-login redirect cannot
 * become an open redirect.
 */
export function isSafeRedirectPath(value: string): boolean {
  if (value.length === 0 || value.length > MAX_REDIRECT_LENGTH) {
    return false;
  }
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return false;
  }
  return !value.split('/').includes('..');
}

/** Auth-flow pages that the route guard must not bounce to login. */
export function isAuthRoutePath(pathname: string): boolean {
  return /^\/(?:en|es)\/(?:login|logout)(?:\/|$)/u.test(pathname);
}

export function parseLoginInput(value: unknown): LoginInput {
  if (typeof value !== 'object' || value === null) {
    throw new ApiError(
      400,
      'Invalid login request',
      'Expected an object payload',
    );
  }
  const record = value as Record<string, unknown>;
  const { kind } = record;
  if (kind === 'start') {
    const { locale, redirectTo, hospitalCode } = record;
    if (!isAppLocale(locale)) {
      throw new ApiError(400, 'Invalid login request', 'Unknown locale');
    }
    if (typeof redirectTo !== 'string' || !isSafeRedirectPath(redirectTo)) {
      throw new ApiError(
        400,
        'Invalid login request',
        'Unsafe redirect target',
      );
    }
    if (
      typeof hospitalCode !== 'string' ||
      !HOSPITAL_CODE_PATTERN.test(hospitalCode)
    ) {
      throw new ApiError(400, 'Invalid login request', 'Invalid hospital code');
    }
    return { kind: 'start', locale, redirectTo, hospitalCode };
  }
  if (kind === 'callback') {
    const { code, state } = record;
    if (
      typeof code !== 'string' ||
      code.length === 0 ||
      code.length > MAX_CODE_LENGTH
    ) {
      throw new ApiError(
        400,
        'Invalid login callback',
        'Missing authorization code',
      );
    }
    if (
      typeof state !== 'string' ||
      state.length === 0 ||
      state.length > MAX_STATE_LENGTH
    ) {
      throw new ApiError(400, 'Invalid login callback', 'Missing state');
    }
    return { kind: 'callback', code, state };
  }
  throw new ApiError(400, 'Invalid login request', 'Unknown login variant');
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function createPkceVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function derivePkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

async function exchangeAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: getAuthClientId(),
    client_secret: getAuthClientSecret(),
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.verifier,
  });
  const response = await fetch(`${getIdentityOrigin()}/connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: form,
  });
  const bodyText = await response.text();
  if (!response.ok) {
    const parsed = parseOAuthError(response.status, bodyText);
    throw new ApiError(parsed.status, 'Token exchange failed', parsed.message);
  }
  const body = JSON.parse(bodyText) as TokenEndpointResponse;
  if (
    typeof body.access_token !== 'string' ||
    typeof body.refresh_token !== 'string'
  ) {
    throw new ApiError(
      502,
      'Token exchange failed',
      'Identity provider returned no access or refresh token',
    );
  }
  return { accessToken: body.access_token, refreshToken: body.refresh_token };
}

function parseOAuthError(
  status: number,
  bodyText: string,
): {
  status: number;
  message: string;
} {
  if (bodyText) {
    try {
      const body = JSON.parse(bodyText) as TokenEndpointResponse;
      if (typeof body.error === 'string') {
        return {
          status,
          message:
            body.error_description ?? `Identity provider error ${status}`,
        };
      }
    } catch {
      // Fall through to the generic message.
    }
  }
  return { status, message: `Identity provider error ${status}` };
}

async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const form = new URLSearchParams({
    token: refreshToken,
    token_type_hint: 'refresh_token',
    client_id: getAuthClientId(),
    client_secret: getAuthClientSecret(),
  });
  try {
    await fetch(`${getIdentityOrigin()}/connect/revocation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: form,
    });
  } catch {
    // Best effort: a failed revocation must not block logout.
  }
}

function unwrapJsonApiData(body: unknown): Record<string, unknown> {
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.data === 'object' && record.data !== null) {
      return record.data as Record<string, unknown>;
    }
    return record;
  }
  return {};
}

function adaptMeResponse(body: unknown): AuthenticatedUser {
  const data = unwrapJsonApiData(body);
  const { actorId: rawActorId, userId, capabilities, email, hospital } = data;
  let actorId: string | null = null;
  if (typeof rawActorId === 'string') {
    actorId = rawActorId;
  } else if (typeof userId === 'string') {
    actorId = userId;
  }
  if (actorId === null || actorId.length === 0) {
    throw new ApiError(502, 'Invalid /api/me response', 'No actor resolved');
  }
  return {
    actorId,
    capabilities: Array.isArray(capabilities)
      ? capabilities.filter((item): item is string => typeof item === 'string')
      : [],
    email: typeof email === 'string' ? email : null,
    hospital: typeof hospital === 'string' ? hospital : null,
  };
}

/** Begins authorization-code + PKCE: validates input, seals a transaction, builds the authorize URL. */
export const loginStart = createServerFn({ method: 'POST' })
  .validator(parseLoginInput)
  .handler(async ({ data }): Promise<{ authorizeUrl: string }> => {
    if (data.kind !== 'start') {
      throw new ApiError(
        400,
        'Invalid login request',
        'Expected a start payload',
      );
    }

    const state = crypto.randomUUID();
    const verifier = createPkceVerifier();
    const challenge = await derivePkceChallenge(verifier);
    const redirectUri = `${getAppOrigin()}/${data.locale}/login`;

    const transaction: PkceTransactionData = {
      state,
      verifier,
      redirectUri,
      redirectTo: data.redirectTo,
      hospitalCode: data.hospitalCode,
      locale: data.locale,
    };
    await setPkceTransaction(transaction);

    const params = new URLSearchParams({
      client_id: getAuthClientId(),
      redirect_uri: redirectUri,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      scope: getAuthScopes(),
    });
    return {
      authorizeUrl: `${getIdentityOrigin()}/connect/authorize?${params.toString()}`,
    };
  });

/** Completes login: validates state, exchanges the code with PKCE, rotates to a fresh session. */
export const loginCallback = createServerFn({ method: 'POST' })
  .validator(parseLoginInput)
  .handler(async ({ data }): Promise<{ redirectTo: string }> => {
    if (data.kind !== 'callback') {
      throw new ApiError(
        400,
        'Invalid login callback',
        'Expected a callback payload',
      );
    }

    const transaction = await getPkceTransaction();
    const tx = transaction ? readPkceTransactionData(transaction) : null;
    if (!tx) {
      throw new ApiError(
        400,
        'Login session expired',
        'No active login transaction. Start again.',
      );
    }
    if (tx.state !== data.state) {
      await clearPkceTransaction();
      throw new ApiError(
        400,
        'Login state mismatch',
        'State parameter did not match the login transaction',
      );
    }

    const token = await exchangeAuthorizationCode({
      code: data.code,
      redirectUri: tx.redirectUri,
      verifier: tx.verifier,
    });

    await createAuthSession({
      refreshToken: token.refreshToken,
      hospitalCode: tx.hospitalCode,
      expiresAt: Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000,
    });
    await clearPkceTransaction();

    return { redirectTo: tx.redirectTo };
  });

/** Logs out: best-effort refresh-token revocation, then clears the session and any transaction. */
export const logout = createServerFn({ method: 'POST' }).handler(
  async ({ context }): Promise<{ ok: true }> => {
    const { auth } = context;
    const data = auth?.session ? readAuthSessionData(auth.session) : null;
    if (data?.refreshToken) {
      await revokeRefreshToken(data.refreshToken);
    }
    await clearAuthSession();
    await clearPkceTransaction();
    return { ok: true };
  },
);

/** Protected: resolves the authenticated actor and capabilities through the BFF /api/me. */
export const getMe = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }): Promise<AuthenticatedUser> => {
    const { auth } = context;
    const session = auth?.session;
    if (!session) {
      throw new ApiError(401, 'Unauthorized', 'No active session');
    }
    const response = await callApiWithAuth(session, {
      path: '/api/me',
      init: { method: 'GET' },
    });
    if (!response.ok) {
      throw await mapApiResponseError(response);
    }
    return adaptMeResponse(await response.json());
  });
