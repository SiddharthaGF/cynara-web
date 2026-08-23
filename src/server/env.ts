/**
 * Server-only environment resolution. The SSR
 * runtime is workerd: it ignores process.env and reads Cloudflare bindings
 * first (matching src/lib/api-origin.ts). These values must never be
 * referenced from client-rendered code — the identity origin, session
 * secret, and client secret stay server-side.
 */

interface EnvLike {
  IDENTITY_ORIGIN?: string;
  AUTH_SESSION_SECRET?: string;
  AUTH_CLIENT_ID?: string;
  AUTH_CLIENT_SECRET?: string;
  AUTH_SCOPES?: string;
  APP_ORIGIN?: string;
  VITE_HOSPITAL_CODE?: string;
}

function readServerEnv(): EnvLike {
  const cloudflareEnv = (globalThis as { Cloudflare?: { env?: EnvLike } })
    .Cloudflare?.env;
  if (cloudflareEnv !== undefined) {
    return cloudflareEnv;
  }
  const nodeEnv = (globalThis as { process?: { env?: EnvLike } }).process?.env;
  return nodeEnv ?? {};
}

function normalize(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Origin of the Cynara API and identity endpoints. */
export function getIdentityOrigin(): string {
  const origin = normalize(readServerEnv().IDENTITY_ORIGIN);
  if (!origin) {
    throw new Error(
      'Cannot resolve the identity origin: IDENTITY_ORIGIN is not set. ' +
        'Add it to .dev.vars (local dev) or the wrangler vars / Cloudflare ' +
        'dashboard for the application.',
    );
  }
  return origin.replace(/\/$/u, '');
}

/** Sealed-session password. Must be 32+ characters. */
export function getSessionSecret(): string {
  return normalize(readServerEnv().AUTH_SESSION_SECRET) ?? '';
}

export function getAuthClientId(): string {
  return normalize(readServerEnv().AUTH_CLIENT_ID) ?? 'cynara-web';
}

export function getAuthClientSecret(): string {
  return normalize(readServerEnv().AUTH_CLIENT_SECRET) ?? '';
}

/** Space-separated OpenIddict scopes requested during authorize. */
export function getAuthScopes(): string {
  return (
    normalize(readServerEnv().AUTH_SCOPES) ?? 'openid offline_access profile'
  );
}

/**
 * Public origin the identity provider must redirect back to. Derived from
 * the incoming request so localhost and deployed origins both work without
 * extra configuration.
 */
export function getAppOrigin(): string {
  const origin = normalize(readServerEnv().APP_ORIGIN);
  if (!origin) {
    throw new Error('APP_ORIGIN is required for the authorization callback.');
  }
  return origin.replace(/\/$/u, '');
}

/** Configuration preference only; callers must validate membership server-side. */
export function getConfiguredHospitalCode(): string {
  return normalize(readServerEnv().VITE_HOSPITAL_CODE) ?? 'default';
}
