import {
  ApiError,
  HOSPITAL_HEADER_NAME,
  JSON_API_MEDIA,
  buildErrorFromJsonApi,
} from '@/api/client.ts';
import {
  clearAuthSession,
  getAuthSession,
  readAuthSessionData,
  rotateAuthSession,
  type AuthSessionManager,
} from '@/server/auth-session.ts';
import {
  getAuthClientId,
  getAuthClientSecret,
  getIdentityOrigin,
} from '@/server/env.ts';

/**
 * BFF API proxy. Each call mints a fresh access
 * token with the refresh-token grant, rotates the sealed session cookie with
 * the new refresh token, injects Bearer + session-derived X-Hospital-Code,
 * and maps non-2xx responses to the app's ApiError contract. One 401 is
 * retried with a fresh mint; a second 401 or a refresh failure clears the
 * session. No workerd memory is used — the refresh token lives only in the
 * sealed cookie.
 */

export interface MintedToken {
  accessToken: string;
  /** Present when the identity provider rotates the refresh token. */
  refreshToken?: string;
  /** Absolute expiry (ms) with a safety margin already applied. */
  accessTokenExpiresAt?: number;
}

export interface TokenEndpointResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/** Thrown when the refresh grant itself fails (invalid/expired/revoked token). */
export class TokenRefreshError extends Error {
  public readonly status: number;

  public constructor(status: number, message: string) {
    super(message);
    this.name = 'TokenRefreshError';
    this.status = status;
  }
}

function oauthError(status: number, bodyText: string): ApiError {
  if (bodyText) {
    try {
      const body = JSON.parse(bodyText) as TokenEndpointResponse;
      if (typeof body.error === 'string') {
        return new ApiError(
          status,
          body.error,
          body.error_description ?? `Identity provider error ${status}`,
        );
      }
    } catch {
      // Fall through to the generic mapping.
    }
  }
  return buildErrorFromJsonApi(status, bodyText);
}

export async function mintAccessToken(
  refreshToken: string,
): Promise<MintedToken> {
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: getAuthClientId(),
    client_secret: getAuthClientSecret(),
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
    throw new TokenRefreshError(
      response.status,
      oauthError(response.status, bodyText).message,
    );
  }
  const body = JSON.parse(bodyText) as TokenEndpointResponse;
  if (typeof body.access_token !== 'string') {
    throw new TokenRefreshError(
      502,
      'Identity provider returned no access token',
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken:
      typeof body.refresh_token === 'string' ? body.refresh_token : undefined,
    // Renew one minute before actual expiry.
    accessTokenExpiresAt:
      typeof body.expires_in === 'number' && body.expires_in > 60
        ? Date.now() + (body.expires_in - 60) * 1000
        : undefined,
  };
}

interface AttemptOptions {
  path: string;
  init?: RequestInit;
  initFactory?: () => RequestInit;
}

function resolveAttemptInit(
  options: Pick<AttemptOptions, 'init' | 'initFactory'>,
): RequestInit | undefined {
  return options.initFactory?.() ?? options.init;
}

function hasNonReplayableBody(init: RequestInit | undefined): boolean {
  return (
    typeof ReadableStream !== 'undefined' &&
    init?.body instanceof ReadableStream
  );
}

export function isRequestInitReplayable(
  init: RequestInit | undefined,
): boolean {
  return !hasNonReplayableBody(init);
}

export function createReplayableRequestInitFactory(
  request: Request,
  headers: Headers,
): () => RequestInit {
  return () => {
    const clone = request.clone();
    return {
      method: request.method,
      headers: new Headers(headers),
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : clone.body,
      signal: request.signal,
    };
  };
}

/**
 * Concurrent proxied calls (parallel loaders, guard + query fan-out) unseal
 * the same cookie and would otherwise redeem the same refresh token twice;
 * the second redemption fails because OpenIddict revokes redeemed tokens on
 * rotation. Two layers keep that surface near zero:
 *
 * 1. Single-flight per refresh-token value: concurrent callers share one
 *    in-flight grant instead of racing duplicates.
 * 2. A per-session access-token cache (keyed by the app session id, never
 *    written back into the sealed cookie): repeated proxied calls reuse a
 *    still-valid access token, so redemptions happen only when it expires.
 */
const inflightMints = new Map<string, Promise<MintedToken>>();

function mintAccessTokenOnce(refreshToken: string): Promise<MintedToken> {
  const existing = inflightMints.get(refreshToken);
  if (existing) {
    return existing;
  }
  const minted = mintAccessToken(refreshToken).finally(() => {
    inflightMints.delete(refreshToken);
  });
  inflightMints.set(refreshToken, minted);
  return minted;
}

interface CachedSessionTokens {
  /** The refresh token this cache entry was minted from. */
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;
}

const TOKEN_CACHE_LIMIT = 200;
const sessionTokenCache = new Map<string, CachedSessionTokens>();

function cachedAccessToken(data: {
  sid: string;
  refreshToken: string;
}): string | undefined {
  const cached = sessionTokenCache.get(data.sid);
  if (!cached || cached.refreshToken !== data.refreshToken) {
    return undefined;
  }
  if (
    typeof cached.accessToken !== 'string' ||
    typeof cached.accessTokenExpiresAt !== 'number' ||
    Date.now() >= cached.accessTokenExpiresAt
  ) {
    return undefined;
  }
  return cached.accessToken;
}

function rememberMintedTokens(
  sid: string,
  data: { refreshToken: string },
  minted: MintedToken,
): void {
  if (sessionTokenCache.size >= TOKEN_CACHE_LIMIT) {
    const oldest = sessionTokenCache.keys().next().value;
    if (oldest !== undefined) {
      sessionTokenCache.delete(oldest);
    }
  }
  sessionTokenCache.set(sid, {
    refreshToken: minted.refreshToken ?? data.refreshToken,
    accessToken: minted.accessToken,
    accessTokenExpiresAt: minted.accessTokenExpiresAt,
  });
}

/**
 * Resolves the access token for a session snapshot: cache first, refresh
 * grant only when needed. Returns the mint result so callers can rotate the
 * sealed cookie exactly when the identity provider rotated the token.
 */
async function resolveAccessToken(
  data: Readonly<{ sid: string; refreshToken: string }>,
): Promise<{
  minted: MintedToken;
  /** True when an existing cache entry satisfied the call. */
  fromCache: boolean;
}> {
  const cachedAccessTokenValue = cachedAccessToken(data);
  if (cachedAccessTokenValue !== undefined) {
    return {
      minted: { accessToken: cachedAccessTokenValue },
      fromCache: true,
    };
  }
  const minted = await mintAccessTokenOnce(data.refreshToken);
  rememberMintedTokens(data.sid, data, minted);
  return { minted, fromCache: false };
}

/**
 * Attaches session auth to a raw API request init for server-side callers
 * that bypass the BFF proxy (for example generated-SDK calls made from route
 * loaders). Anonymous visitors pass through untouched; authenticated requests
 * get a fresh bearer token plus the session-derived hospital header.
 */
export async function attachSessionAuth(
  init: RequestInit | undefined,
): Promise<RequestInit> {
  const session = await getAuthSession();
  const data = session ? readAuthSessionData(session) : null;
  if (!session || !data) {
    return init ?? {};
  }

  const { minted, fromCache } = await resolveAccessToken(data);
  if (!fromCache && minted.refreshToken !== undefined) {
    const { refreshToken } = minted;
    await rotateAuthSession({
      refreshToken,
      hospitalCode: data.hospitalCode,
      expiresAt: data.expiresAt,
    });
    // Keep the caller's manager aligned with the sealed cookie.
    session.data.refreshToken = refreshToken;
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${minted.accessToken}`);
  if (data.hospitalCode) {
    headers.set(HOSPITAL_HEADER_NAME, data.hospitalCode);
  }
  headers.set('Accept', JSON_API_MEDIA);
  return { ...init, headers };
}

async function attemptWithToken(
  session: AuthSessionManager,
  { path, ...options }: AttemptOptions,
): Promise<Response> {
  const init = resolveAttemptInit(options);
  const data = readAuthSessionData(session);
  if (!data) {
    await clearAuthSession();
    throw new ApiError(401, 'Unauthorized', 'Session data is incomplete');
  }

  const { minted } = await resolveAccessToken(data).catch(
    async (): Promise<{
      minted: MintedToken;
      fromCache: boolean;
    }> => {
      await clearAuthSession();
      throw new ApiError(401, 'Unauthorized', 'Session refresh failed');
    },
  );

  // Re-seal the cookie only when the identity provider rotated the refresh
  // Token; cache hits keep the current seal untouched.
  const { refreshToken: rotatedToken } = minted;
  if (rotatedToken !== undefined && rotatedToken !== data.refreshToken) {
    await rotateAuthSession({
      refreshToken: rotatedToken,
      hospitalCode: data.hospitalCode,
      expiresAt: data.expiresAt,
    });
    // Keep the caller's manager aligned with the sealed cookie. A later
    // Operation in this request may need the rotated token.
    session.data.refreshToken = rotatedToken;
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${minted.accessToken}`);
  if (data.hospitalCode) {
    headers.set(HOSPITAL_HEADER_NAME, data.hospitalCode);
  } else {
    headers.delete(HOSPITAL_HEADER_NAME);
  }
  headers.set('Accept', JSON_API_MEDIA);
  if (init?.method && init.method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', JSON_API_MEDIA);
  }

  return fetch(`${getIdentityOrigin()}${path}`, {
    ...init,
    headers,
  });
}

/**
 * Proxies an API request on behalf of the authenticated session. Maps every
 * non-2xx outcome to ApiError (retry-once on 401, session cleared on second
 * 401 or refresh failure) and returns the Response on success.
 */
export async function callApiWithAuth(
  session: AuthSessionManager,
  options: AttemptOptions,
): Promise<Response> {
  const first = await attemptWithToken(session, options);
  if (first.ok) {
    return first;
  }
  if (first.status !== 401) {
    throw await mapApiResponseError(first);
  }

  // Exactly one retry with a freshly minted token.
  // A second 401 means the session is invalid: Clear it and throw 401.
  if (!options.initFactory && !isRequestInitReplayable(options.init)) {
    await clearAuthSession();
    throw new ApiError(401, 'Unauthorized', 'Session expired or invalid');
  }
  const currentSession = await getAuthSession();
  if (!currentSession) {
    throw new ApiError(401, 'Unauthorized', 'Session expired or invalid');
  }
  const retried = await attemptWithToken(currentSession, options);
  if (retried.ok) {
    return retried;
  }
  if (retried.status === 401) {
    await clearAuthSession();
    throw new ApiError(401, 'Unauthorized', 'Session expired or invalid');
  }
  throw await mapApiResponseError(retried);
}

/** Maps a non-ok proxied response to ApiError (JSON:API / Problem Details). */
export async function mapApiResponseError(
  response: Response,
): Promise<ApiError> {
  const bodyText = await response.text();
  return buildErrorFromJsonApi(response.status, bodyText);
}
