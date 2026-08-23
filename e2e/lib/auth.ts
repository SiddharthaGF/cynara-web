import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Authentication helpers for the Playwright suite against the real
 * cynara-api identity provider (OpenIddict).
 *
 * Two independent needs are covered:
 *
 * 1. Browser session for UI tests: `e2e/auth.setup.ts` signs in through the
 *    real login route once and saves the sealed `cynara-auth` cookie as the
 *    shared storage state.
 * 2. Bearer tokens for direct API fixture calls: the seeded client only
 *    allows authorization-code + PKCE (no password grant), so this module
 *    performs the headless round trip against `/connect/authorize`
 *    (which validates credentials inline, no cookies needed) and renews the
 *    token with the refresh grant when it is about to expire.
 *
 * The dev/preview seeder guarantees these defaults exist whenever the API
 * runs in Development or with IS_PULL_REQUEST=true:
 *   user   doctor@cynara.dev / Cynara!Dev123  (actor doctor-alpha, hospital
 *          "default", every capability)
 *   client cynara-web / cynara-web-secret     (confidential, consent skipped)
 */

const JSON_API_MEDIA = 'application/vnd.api+json';

const DEFAULT_IDENTITY_ORIGIN = 'http://127.0.0.1:5000';
const DEFAULT_APP_ORIGIN = 'http://127.0.0.1:5173';

export const AUTH_STATE_PATH = 'playwright/.auth/user.json';

const CLIENT_ID = process.env.AUTH_CLIENT_ID ?? 'cynara-web';
// Dev-seed secret, public by design; override via env for other environments.
const CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET ?? 'cynara-web-secret';
const SCOPES = process.env.AUTH_SCOPES ?? 'openid offline_access profile';
const USER_EMAIL = process.env.E2E_USER_EMAIL ?? 'doctor@cynara.dev';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Cynara!Dev123';

function stripTrailingSlash(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.replace(/\/$/u, '') : undefined;
}

/** Reads a KEY=VALUE pair from an optional `.dev.vars` file (workerd SSR). */
function devVarsValue(key: string): string | undefined {
  try {
    const devVars = readFileSync(
      path.resolve(process.cwd(), '.dev.vars'),
      'utf8',
    );
    const pattern = new RegExp(`^${key}\\s*=\\s*(.+?)\\s*$`, 'mu');
    return pattern.exec(devVars)?.[1];
  } catch {
    // `.dev.vars` is optional.
    return undefined;
  }
}

/**
 * Resolve the cynara-api origin. Playwright runs outside Vite, so it cannot
 * see the `.dev.vars` that the dev server reads; parse it as a fallback so
 * fixture CRUD goes straight to the API instead of the Vite dev server.
 */
export function apiOrigin(baseURL: string): string {
  return (
    stripTrailingSlash(process.env.VITE_API_ORIGIN) ??
    stripTrailingSlash(devVarsValue('VITE_API_ORIGIN')) ??
    baseURL
  );
}

function identityOrigin(): string {
  return (
    stripTrailingSlash(process.env.IDENTITY_ORIGIN) ??
    stripTrailingSlash(devVarsValue('IDENTITY_ORIGIN')) ??
    DEFAULT_IDENTITY_ORIGIN
  );
}

/** Redirect URI registered on the seeded OpenIddict client. */
function loginRedirectUri(): string {
  const appOrigin =
    stripTrailingSlash(process.env.PLAYWRIGHT_BASE_URL) ?? DEFAULT_APP_ORIGIN;
  return `${appOrigin}/en/login`;
}

function hospitalCode(): string {
  return process.env.VITE_HOSPITAL_CODE?.trim() || 'default';
}

interface TokenEndpointBody {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  error?: unknown;
  error_description?: unknown;
}

interface ApiTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Absolute expiry (ms) with a small safety margin already applied. */
  expiresAt: number;
}

async function postForm(
  url: string,
  form: URLSearchParams,
): Promise<{ status: number; body: unknown; location: string | null }> {
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: form,
  });
  const text = await response.text();
  let body: unknown = undefined;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = text;
  }
  return {
    status: response.status,
    body,
    location: response.headers.get('location'),
  };
}

/**
 * Drives GET /connect/authorize through its self-redirect chain until it
 * surfaces the opaque request_uri handed to the login page.
 */
async function requestAuthorizationTransaction(): Promise<string> {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: loginRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    state: randomBytes(16).toString('base64url'),
    nonce: randomBytes(16).toString('base64url'),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  let current = `${identityOrigin()}/connect/authorize?${params}`;
  for (let hop = 0; hop < 5; hop += 1) {
    // eslint-disable-next-line no-await-in-loop -- sequential redirects
    const response = await fetch(current, { redirect: 'manual' });
    const location = response.headers.get('location');
    if (!location) {
      throw new Error(
        `authorize endpoint returned ${response.status} without a redirect`,
      );
    }
    const next = new URL(location, current);
    const requestUri = next.searchParams.get('request_uri');
    if (requestUri) {
      pendingVerifiers.set(requestUri, verifier);
      return requestUri;
    }
    current = next.href;
  }
  throw new Error('authorize endpoint never produced a request_uri');
}

/**
 * The verifier must outlive the transaction discovery step, and each dance
 * owns exactly one verifier. Keyed by request_uri so concurrent dances stay
 * correct even though the suite runs single-worker today.
 */
const pendingVerifiers = new Map<string, string>();

/** Posts the demo credentials inline; returns the authorization code. */
async function postCredentialsForCode(requestUri: string): Promise<string> {
  const { status, body, location } = await postForm(
    `${identityOrigin()}/connect/authorize`,
    new URLSearchParams({
      client_id: CLIENT_ID,
      request_uri: requestUri,
      email: USER_EMAIL,
      password: USER_PASSWORD,
    }),
  );
  pendingVerifiers.delete(requestUri);
  if (!location) {
    throw new Error(
      `credential POST returned ${status} without a redirect: ${JSON.stringify(body).slice(0, 300)}`,
    );
  }
  const redirect = new URL(location, `${identityOrigin()}/`);
  const oauthError = redirect.searchParams.get('error');
  if (oauthError) {
    throw new Error(
      `identity provider rejected the credentials: ${oauthError} (${redirect.searchParams.get('error_description') ?? 'no detail'})`,
    );
  }
  const code = redirect.searchParams.get('code');
  if (!code) {
    throw new Error(`authorization redirect carried no code: ${location}`);
  }
  return code;
}

async function tokenRequest(form: URLSearchParams): Promise<ApiTokens> {
  const { status, body } = await postForm(
    `${identityOrigin()}/connect/token`,
    form,
  );
  const parsed = (body ?? {}) as TokenEndpointBody;
  if (status >= 400 || typeof parsed.access_token !== 'string') {
    throw new Error(
      `token endpoint failed (${status}): ${JSON.stringify(body).slice(0, 300)}`,
    );
  }
  const seconds =
    typeof parsed.expires_in === 'number' && parsed.expires_in > 0
      ? parsed.expires_in
      : 900;
  return {
    accessToken: parsed.access_token,
    refreshToken:
      typeof parsed.refresh_token === 'string' ? parsed.refresh_token : null,
    // Renew one minute before actual expiry.
    expiresAt: Date.now() + (seconds - 60) * 1000,
  };
}

/** Full headless authorization-code + PKCE round trip. */
async function mintTokens(): Promise<ApiTokens> {
  const requestUri = await requestAuthorizationTransaction();
  // Read before posting credentials: that step consumes the transaction.
  const verifier = pendingVerifiers.get(requestUri);
  if (verifier === undefined) {
    throw new Error('internal error: PKCE verifier missing for transaction');
  }
  const code = await postCredentialsForCode(requestUri);
  return tokenRequest(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: loginRedirectUri(),
      code_verifier: verifier,
    }),
  );
}

/** Renewal path: cheap, not rate-limited, and keeps the same actor. */
async function refreshTokens(refreshToken: string): Promise<ApiTokens> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  );
}

let tokensPromise: Promise<ApiTokens> | null = null;

async function currentAccessToken(): Promise<string> {
  tokensPromise ??= mintTokens();
  let tokens = await tokensPromise;
  if (Date.now() >= tokens.expiresAt) {
    tokensPromise = (
      tokens.refreshToken ? refreshTokens(tokens.refreshToken) : mintTokens()
    ).catch(async () => mintTokens());
    tokens = await tokensPromise;
  }
  return tokens.accessToken;
}

/**
 * Headers for direct cynara-api calls from fixtures/specs. Replaces the old
 * X-Actor-Id contract: the actor now derives from the bearer principal
 * (doctor-alpha on the seeded "default" hospital, all capabilities).
 */
export async function apiHeaders(): Promise<Record<string, string>> {
  const accessToken = await currentAccessToken();
  return {
    'Accept': JSON_API_MEDIA,
    'Content-Type': JSON_API_MEDIA,
    'Authorization': `Bearer ${accessToken}`,
    'X-Hospital-Code': hospitalCode(),
  };
}
