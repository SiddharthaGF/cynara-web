import {
  clearSession,
  getCookie,
  getRequestProtocol,
  useSession as createServerSession,
} from '@tanstack/react-start/server';

import { getSessionSecret } from '@/server/env.ts';

/**
 * Sealed, stateless session: refresh token + hospital context live in an
 * httpOnly, SameSite=Lax cookie sealed with AUTH_SESSION_SECRET (aes-256-cbc +
 * sha256 HMAC); no workerd memory is used. A short-lived, separately named
 * transaction session carries the PKCE verifier + state between
 * `login(start)` and `login(callback)`.
 */

export interface AuthSessionData {
  /** App-level session id. Mirrors the h3 session id to stay in lockstep. */
  sid: string;
  /** OpenIddict refresh token (rotated on every refresh grant). */
  refreshToken: string;
  /** Hospital selected after membership verification; never trusted from the browser. */
  hospitalCode: string | null;
  /** Absolute expiry (ms) enforced by the sealed session lifetime. */
  expiresAt: number;
}

// Not re-exported from @tanstack/react-start/server; derive shapes from createServerSession.
export type AuthSessionConfig = Parameters<typeof createServerSession>[0];
export type AuthSessionManager = Awaited<
  ReturnType<typeof createServerSession<AuthSessionData>>
>;

export const AUTH_SESSION_NAME = 'cynara-auth';
export const PKCE_TRANSACTION_NAME = 'cynara-pkce';

// Seven days, matching the sealed session lifetime.
export const AUTH_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
// Ten minutes, enough for the authorize round trip.
const PKCE_TRANSACTION_MAX_AGE_SECONDS = 10 * 60;

function buildCookieOptions(): NonNullable<AuthSessionConfig['cookie']> {
  // Secure stays disabled on plain http (local PoC); https keeps it enabled.
  const secure = getRequestProtocol() === 'https';
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
  };
}

/**
 * Config used to read/write/clear the auth session. Cookie attributes are
 * computed per request so clear() matches what was set.
 */
export function getSessionConfig(): AuthSessionConfig {
  return {
    name: AUTH_SESSION_NAME,
    password: getSessionSecret(),
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    // Keep the session only in the sealed cookie, not the X-cynara-auth-session header.
    sessionHeader: false,
    cookie: buildCookieOptions(),
  };
}

function getTransactionConfig(): AuthSessionConfig {
  return {
    name: PKCE_TRANSACTION_NAME,
    password: getSessionSecret(),
    maxAge: PKCE_TRANSACTION_MAX_AGE_SECONDS,
    sessionHeader: false,
    cookie: buildCookieOptions(),
  };
}

/** True when a sealed auth cookie is present. Used to avoid minting sessions for anonymous visitors. */
export function hasAuthSessionCookie(): boolean {
  return getCookie(AUTH_SESSION_NAME) !== undefined;
}

/** Reads the sealed auth session. Returns undefined for anonymous visitors. */
export async function getAuthSession(): Promise<
  AuthSessionManager | undefined
> {
  if (!hasAuthSessionCookie()) {
    return undefined;
  }
  // Unsealing silently replaces tampered/expired cookies; missing data means signed out.
  return createServerSession<AuthSessionData>(getSessionConfig());
}

/**
 * Validates and narrows the sealed session data. The seal shape makes every
 * field optional (a tampered or expired cookie unseals to an empty object),
 * so callers must treat anything missing as "no session".
 */
export function readAuthSessionData(
  manager: AuthSessionManager,
): AuthSessionData | null {
  const { sid, refreshToken, hospitalCode, expiresAt } = manager.data;
  if (
    typeof sid === 'string' &&
    typeof refreshToken === 'string' &&
    (hospitalCode === null || typeof hospitalCode === 'string') &&
    typeof expiresAt === 'number'
  ) {
    return { sid, refreshToken, hospitalCode, expiresAt };
  }
  return null;
}

/**
 * Creates a brand-new auth session (fresh h3 id + fresh app sid) holding the
 * given data, clearing any previous session first. Calling this inside the
 * login callback is what rotates the SID away from any pre-auth cookie.
 */
export async function createAuthSession(
  data: Omit<AuthSessionData, 'sid'>,
): Promise<AuthSessionManager> {
  await clearAuthSession();
  const manager =
    await createServerSession<AuthSessionData>(getSessionConfig());
  await manager.update({ ...data, sid: manager.id ?? '' });
  return manager;
}

/** Updates the session data in place, keeping the sid (used for refresh-token rotation). */
export async function rotateAuthSession(
  data: Omit<AuthSessionData, 'sid'>,
): Promise<AuthSessionManager> {
  const manager =
    await createServerSession<AuthSessionData>(getSessionConfig());
  await manager.update({ ...data, sid: manager.data.sid });
  return manager;
}

/** Deletes the auth cookie and drops the in-request session. */
export async function clearAuthSession(): Promise<void> {
  await clearSession(getSessionConfig());
}

export interface PkceTransactionData {
  state: string;
  /** RFC 7636 code verifier. Sealed so it cannot be tampered with. */
  verifier: string;
  /** Exact redirect_uri used in the authorize request; must match on exchange. */
  redirectUri: string;
  /** Internal path to return to after login. */
  redirectTo: string;
  locale: string;
}

export type PkceTransactionManager = Awaited<
  ReturnType<typeof createServerSession<PkceTransactionData>>
>;

export async function getPkceTransaction(): Promise<
  PkceTransactionManager | undefined
> {
  if (getCookie(PKCE_TRANSACTION_NAME) === undefined) {
    return undefined;
  }
  return createServerSession<PkceTransactionData>(getTransactionConfig());
}

/** Narrows the sealed PKCE transaction data; null when fields are missing. */
export function readPkceTransactionData(
  manager: PkceTransactionManager,
): PkceTransactionData | null {
  const { state, verifier, redirectUri, redirectTo, locale } = manager.data;
  if (
    typeof state === 'string' &&
    typeof verifier === 'string' &&
    typeof redirectUri === 'string' &&
    typeof redirectTo === 'string' &&
    typeof locale === 'string'
  ) {
    return { state, verifier, redirectUri, redirectTo, locale };
  }
  return null;
}

export async function setPkceTransaction(
  data: PkceTransactionData,
): Promise<
  Awaited<ReturnType<typeof createServerSession<PkceTransactionData>>>
> {
  const manager = await createServerSession<PkceTransactionData>(
    getTransactionConfig(),
  );
  await manager.update(data);
  return manager;
}

export async function clearPkceTransaction(): Promise<void> {
  await clearSession(getTransactionConfig());
}
