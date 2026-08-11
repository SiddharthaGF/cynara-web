import {
  ApiError,
  HOSPITAL_HEADER_NAME,
  JSON_API_MEDIA,
  buildErrorFromJsonApi,
} from '@/api/client.ts';
import {
  clearAuthSession,
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
 * BFF API proxy for the CYN-96 auth spike. Each call mints a fresh access
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
  };
}

interface AttemptOptions {
  path: string;
  init?: RequestInit;
}

/**
 * Mints an access token for the session's refresh token. On refresh failure
 * the session is cleared and a 401 ApiError is raised (the refresh token is
 * invalid, expired, or revoked).
 */
async function mintOrClear(
  data: Readonly<{ refreshToken: string }>,
): Promise<MintedToken> {
  try {
    return await mintAccessToken(data.refreshToken);
  } catch (error) {
    await clearAuthSession();
    throw new ApiError(
      401,
      'Unauthorized',
      error instanceof Error ? error.message : 'Session refresh failed',
    );
  }
}

async function attemptWithToken(
  session: AuthSessionManager,
  { path, init }: AttemptOptions,
): Promise<Response> {
  const data = readAuthSessionData(session);
  if (!data) {
    await clearAuthSession();
    throw new ApiError(401, 'Unauthorized', 'Session data is incomplete');
  }

  const minted = await mintOrClear(data);

  await rotateAuthSession({
    refreshToken: minted.refreshToken ?? data.refreshToken,
    hospitalCode: data.hospitalCode,
    expiresAt: data.expiresAt,
  });

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${minted.accessToken}`);
  headers.set(HOSPITAL_HEADER_NAME, data.hospitalCode);
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
  const retried = await attemptWithToken(session, options);
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
