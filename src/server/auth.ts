import { createServerFn } from '@tanstack/react-start';

import { ApiError } from '@/api/client.ts';
import { isAppLocale, type AppLocale } from '@/lib/locale.ts';
import { callApiWithAuth, mapApiResponseError } from '@/server/api-proxy.ts';
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
  getAuthScopes,
  getConfiguredHospitalCode,
} from '@/server/env.ts';
import {
  HOSPITAL_CODE_PATTERN,
  parseHospitals,
  resolveSelectedHospital,
  selectHospitalSessionData,
  type HospitalMembership,
} from '@/server/hospital-workspace.ts';
import {
  buildAuthorizeUrl,
  createPkceVerifier,
  derivePkceChallenge,
  exchangeAuthorizationCode,
  revokeRefreshToken,
} from '@/server/identity-provider.ts';
import { requireAuthMiddleware } from '@/start.ts';

/**
 * Auth server functions. OAuth tokens and the client secret stay in server
 * functions; the browser only receives safe session/bootstrap data.
 *
 * Login/logout/status and workspace-selection flows live here;
 * identity-provider transport lives in `identity-provider.ts`, the pure
 * hospital-membership domain in `hospital-workspace.ts`, account recovery in
 * `account-recovery.ts`, and capability exposure in `capabilities.ts`.
 */

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

/** Selects the configured or first backend-verified membership for the session. */
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
