import { ApiError } from '@/api/client.ts';
import type { TokenEndpointResponse } from '@/server/api-proxy.ts';
import {
  getAuthClientId,
  getAuthClientSecret,
  getIdentityOrigin,
} from '@/server/env.ts';

/**
 * Transport for the identity provider (OpenIddict): authorize URL building,
 * PKCE generation, authorization-code exchange, refresh-token revocation, and
 * account endpoints. Pure HTTP plumbing — no session state lives here.
 */

export function buildAuthorizeUrl(
  appOrigin: string,
  params: URLSearchParams,
): string {
  return `${appOrigin.replace(/\/$/u, '')}/auth/authorize?${params.toString()}`;
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

export function createPkceVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function derivePkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

export async function exchangeAuthorizationCode(params: {
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

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
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

export async function postAccount(
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
