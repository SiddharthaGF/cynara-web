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
  rotateAuthSession,
  setPkceTransaction,
  type PkceTransactionData,
} from '@/server/auth-session.ts';
import {
  getAppOrigin,
  getAuthClientId,
  getAuthClientSecret,
  getAuthScopes,
  getConfiguredHospitalCode,
  getIdentityOrigin,
} from '@/server/env.ts';
import { requireAuthMiddleware } from '@/start.ts';

/**
 * Auth server functions. OAuth tokens and the client secret stay in server
 * functions; the browser only receives safe session/bootstrap data.
 */

export interface AuthenticatedUser {
  actorId: string | null;
  capabilities: string[];
}

export interface HospitalMembership {
  code: string;
  name: string;
}

export interface AuthStatus {
  authenticated: boolean;
  hospitalCode: string | null;
}

export type LoginInput =
  | {
      kind: 'start';
      locale: AppLocale;
      redirectTo: string;
    }
  | { kind: 'callback'; code: string; state: string };

const MAX_REDIRECT_LENGTH = 2048;
const MAX_CODE_LENGTH = 2048;
const MAX_STATE_LENGTH = 256;
const HOSPITAL_CODE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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
  return /^\/(?:en|es)\/(?:login|logout|recovery|reset)(?:\/|$)/u.test(
    pathname,
  );
}

export function buildAuthorizeUrl(
  appOrigin: string,
  params: URLSearchParams,
): string {
  return `${appOrigin.replace(/\/$/u, '')}/auth/authorize?${params.toString()}`;
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
    const { locale, redirectTo } = record;
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
    return { kind: 'start', locale, redirectTo };
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

function adaptCapabilitiesResponse(body: unknown): AuthenticatedUser {
  const data = unwrapJsonApiData(body);
  const { actorId, capabilities } = data;
  return {
    actorId: typeof actorId === 'string' ? actorId : null,
    capabilities: Array.isArray(capabilities)
      ? capabilities.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function parseHospitals(body: unknown): HospitalMembership[] {
  if (!Array.isArray(body)) {
    throw new ApiError(
      502,
      'Invalid hospital response',
      'Invalid membership list',
    );
  }
  return body.flatMap((item): HospitalMembership[] => {
    if (!isRecord(item)) {
      return [];
    }
    const record = item;
    return typeof record.code === 'string' && typeof record.name === 'string'
      ? [{ code: record.code, name: record.name }]
      : [];
  });
}

export function choosePreferredHospital(
  memberships: readonly HospitalMembership[],
  configuredCode: string,
): string | null {
  return (
    memberships.find((membership) => membership.code === configuredCode)?.code ??
    memberships[0]?.code ??
    null
  );
}

export function resolveSelectedHospital(
  selectedCode: string | null,
  memberships: readonly HospitalMembership[],
  configuredCode: string,
): string | null {
  return selectedCode && memberships.some((item) => item.code === selectedCode)
    ? selectedCode
    : choosePreferredHospital(memberships, configuredCode);
}

async function loadHospitalMemberships(
  session: Parameters<typeof callApiWithAuth>[0],
): Promise<HospitalMembership[]> {
  const response = await callApiWithAuth(session, {
    path: '/api/me/hospitals',
    init: { method: 'GET' },
  });
  if (!response.ok) {
    throw await mapApiResponseError(response);
  }
  return parseHospitals(await response.json());
}

interface WorkspaceSelectionResult {
  hospitalCode: string | null;
  memberships: HospitalMembership[];
}

async function ensureSelectedHospitalForSession(
  session: Parameters<typeof callApiWithAuth>[0],
): Promise<WorkspaceSelectionResult> {
  const current = readAuthSessionData(session);
  if (!current) {
    throw new ApiError(401, 'Unauthorized', 'Invalid session');
  }

  const memberships = await loadHospitalMemberships(session);
  // Membership loading can refresh the access token and synchronize the
  // Caller's session manager. Never persist the pre-load refresh token.
  const latest = readAuthSessionData(session);
  if (!latest) {
    throw new ApiError(401, 'Unauthorized', 'Invalid session');
  }
  const hospitalCode = resolveSelectedHospital(
    latest.hospitalCode,
    memberships,
    getConfiguredHospitalCode(),
  );

  if (hospitalCode !== latest.hospitalCode) {
    await rotateAuthSession({
      refreshToken: latest.refreshToken,
      hospitalCode,
      expiresAt: latest.expiresAt,
    });
  }

  return { hospitalCode, memberships };
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
      authorizeUrl: buildAuthorizeUrl(getAppOrigin(), params),
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

    const session = await createAuthSession({
      refreshToken: token.refreshToken,
      hospitalCode: null,
      expiresAt: Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000,
    });
    await ensureSelectedHospitalForSession(session);
    await clearPkceTransaction();

    return {
      redirectTo: tx.redirectTo,
    };
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

export const getAuthStatus = createServerFn({ method: 'GET' }).handler(
  ({ context }): AuthStatus => ({
    authenticated: context.auth?.session !== undefined,
    hospitalCode: context.auth?.hospitalCode ?? null,
  }),
);

/** Protected tenant-exempt membership bootstrap. */
export const getHospitals = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }): Promise<HospitalMembership[]> => {
    const { auth } = context;
    const session = auth?.session;
    if (!session) {
      throw new ApiError(401, 'Unauthorized', 'No active session');
    }
    return loadHospitalMemberships(session);
  });

/** Selects the configured or first backend-verified membership for the session. */
export const ensureSelectedHospital = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }): Promise<WorkspaceSelectionResult> => {
    const session = context.auth?.session;
    if (!session) {
      throw new ApiError(401, 'Unauthorized', 'No active session');
    }
    return ensureSelectedHospitalForSession(session);
  });

/** Selects a membership only after verifying it against the backend list. */
export const selectHospital = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator((value: unknown) => {
    if (typeof value !== 'string' || !HOSPITAL_CODE_PATTERN.test(value)) {
      throw new ApiError(400, 'Invalid hospital', 'Invalid hospital selection');
    }
    return value;
  })
  .handler(async ({ context, data }): Promise<{ redirectTo: string }> => {
    const session = context.auth?.session;
    if (!session) {
      throw new ApiError(401, 'Unauthorized', 'No active session');
    }
    const hospitals = await loadHospitalMemberships(session);
    if (!hospitals.some((item) => item.code === data)) {
      throw new ApiError(403, 'Forbidden', 'Hospital membership required');
    }
    const current = readAuthSessionData(session);
    if (!current) {
      throw new ApiError(401, 'Unauthorized', 'Invalid session');
    }
    await rotateAuthSession(selectHospitalSessionData(current, data));
    return { redirectTo: '/' };
  });

export function selectHospitalSessionData(
  session: Readonly<{
    refreshToken: string;
    hospitalCode: string | null;
    expiresAt: number;
  }>,
  hospitalCode: string,
): {
  refreshToken: string;
  hospitalCode: string;
  expiresAt: number;
} {
  return {
    refreshToken: session.refreshToken,
    hospitalCode,
    expiresAt: session.expiresAt,
  };
}

export const getCapabilities = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }): Promise<AuthenticatedUser> => {
    const session = context.auth?.session;
    if (!session) {
      throw new ApiError(401, 'Unauthorized', 'No active session');
    }
    const response = await callApiWithAuth(session, {
      path: '/api/me/capabilities',
      init: { method: 'GET' },
    });
    if (!response.ok) {
      throw await mapApiResponseError(response);
    }
    return adaptCapabilitiesResponse(await response.json());
  });

export const requestPasswordRecovery = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ApiError(400, 'Invalid account', 'Account is required');
    }
    return value.trim();
  })
  .handler(async ({ data }): Promise<void> => {
    await postAccount('/connect/account/recovery', { account: data });
  });

export const resetPassword = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    if (typeof value !== 'object' || value === null) {
      throw new ApiError(400, 'Invalid reset request', 'Invalid reset request');
    }
    if (!isRecord(value)) {
      throw new ApiError(400, 'Invalid reset request', 'Invalid reset request');
    }
    const input = value;
    if (
      typeof input.account !== 'string' ||
      typeof input.token !== 'string' ||
      typeof input.newPassword !== 'string'
    ) {
      throw new ApiError(400, 'Invalid reset request', 'Invalid reset request');
    }
    return {
      account: input.account,
      token: input.token,
      newPassword: input.newPassword,
    };
  })
  .handler(async ({ data }): Promise<void> => {
    await postAccount('/connect/account/reset', data);
  });

async function postAccount(
  path: string,
  body: Record<string, string>,
): Promise<void> {
  const response = await fetch(`${getIdentityOrigin()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      'Request failed',
      'The request could not be completed.',
    );
  }
}
