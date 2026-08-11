# CYN-96 — TanStack Start auth flow spike: structured findings

Status: **implemented, statically verified, live validation pending** on the
backend prerequisite (extended `Cynara.IdentitySpike`). Input to the CYN-94 ADR
on how the web app authenticates against Cynara Identity.

## 1. What the spike does

An opt-in `AUTH_MODE=spike` path (default `off`) wires a disposable
authorization-code + PKCE login against the CYN-95 OpenIddict PoC and routes
authenticated API calls through a BFF:

- `src/start.ts` registers global request middleware: CSRF (server functions
  only) + a session middleware that threads
  `{ auth: { session, hospitalCode } }` into server-function context.
- `src/server/auth-session.ts` keeps the refresh token + hospital context in a
  sealed, httpOnly, SameSite=Lax cookie (`cynara-auth`, 7-day `maxAge`,
  aes-256-cbc + sha256 HMAC via h3's session seal). A second short-lived sealed
  cookie (`cynara-pkce`, 10 min) carries the PKCE verifier/state transaction.
- `src/server/auth.ts` exposes `loginStart`, `loginCallback`, `logout`, `getMe`.
- `src/server/api-proxy.ts` mints an access token per API call with the
  refresh-token grant, rotates the session cookie, injects
  `Authorization: Bearer` + `X-Hospital-Code` from the session, retries exactly
  once on 401, clears the session on a second 401 or refresh failure, and maps
  non-2xx responses to the existing `ApiError` contract.
- Routes: `/$locale/login`, `/$locale/logout`, `/$locale/auth-spike`; the
  `$locale.tsx` `beforeLoad` guard calls `getMe()` in spike mode and redirects
  unauthenticated users to login, preserving the requested path.
- `useCapabilities` keeps working: in spike mode `effective-capabilities.ts`
  selects the BFF `getMe` adapter; in `off` mode it is byte-for-byte the old
  generated-client path.
- Env: `IDENTITY_ORIGIN`, `AUTH_MODE`, `AUTH_SESSION_SECRET`, `AUTH_CLIENT_ID`,
  `AUTH_CLIENT_SECRET`, `AUTH_SCOPES` (server, `.dev.vars`/wrangler dev vars);
  `VITE_AUTH_MODE` mirrors the toggle for the client bundle.

The browser never touches a token: the access token lives only inside server
functions, and the refresh token only inside the sealed cookie.

## 2. What works (statically verified; live run pending backend)

Verified against the installed TanStack Start version (react-start 1.168.32,
react-start-server 1.167.22, start-server-core 1.169.17, start-client-core
1.170.14 — internal skew is expected):

- `createStart(() => ({ requestMiddleware }))` with `startInstance` export is
  the supported wiring; `createStartHandler` applies it, and the generated route
  tree picks up the config types (confirmed in `createStartHandler.js`).
- `createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })`
  protects only RPC endpoints; top-level GET navigations (including the IDP
  redirect back) are exempt. Sec-Fetch-Site → Origin → Referer fallback chain
  confirmed in the installed implementation.
- h3 session seal/unseal
  (`useSession`/`getSession`/`updateSession`/`clearSession` re-exported from
  `@tanstack/react-start/server`) is cookie-only and stateless — fits workerd's
  no-shared-memory model. Cookies default to `secure; httpOnly`, overridden per
  protocol so `http://localhost` works with `Secure` disabled.
- `ApiError` thrown inside server functions survives the RPC boundary as a real
  `instanceof ApiError` with `status`/`title`/`errors`/`problem` intact (seroval
  serializes error subclasses by constructor + own properties) — client-side
  `isCapabilitiesForbiddenError` and route-guard `status` checks keep working.
- Same-origin redirect-back after login reuses the existing `/$locale` chain:
  `/` → preferred locale → guard → `/$locale/login?redirectTo=...`.

## 3. What breaks or is fragile

- **Backend prerequisite is not in place.** The CYN-95 spike only enables
  password/refresh/client_credentials grants — no
  `SetAuthorizationEndpointUris`, no `AllowAuthorizationCodeFlow`, no redirect
  URIs. Until Phase 1 lands in `cynara-api/spikes/Cynara.IdentitySpike`,
  `loginStart`'s authorize redirect and the token exchange cannot be exercised
  live.
- **Live E2E was not run** (see limitations). Everything above is static +
  typecheck/lint/build evidence; the cookie-flag, redirect, and revocation
  behaviors still need the live PoC run.
- **Sealed sessions have an absolute lifetime.** h3's seal stores `createdAt`
  and rejects when `now - createdAt > maxAge`. Rolling refresh re-seals the
  cookie but does NOT extend the deadline — a long-lived session dies 7 days
  after first login, not 7 days after last activity. The app-level `expiresAt`
  mirrors this deliberately.
- **Silent cookie replacement on tamper/expiry.** `getSession` swallows seal
  errors and creates a fresh anonymous session (new cookie). Forged/expired
  cookies never yield attacker-controlled data, but the failure is silent: the
  app discovers it only when `getMe` 401s and bounces to login.
- **`getMe` runs twice per navigation** in spike mode: once in the `$locale`
  `beforeLoad` guard and once via `useCapabilities`. Each is an RPC (server fn)
  that also mints/rotates a token through the BFF. Fine for the spike; a
  production design should dedupe (single session check, cached actor).
- **CSRF middleware rejects header-less clients.** Server-function RPCs without
  Sec-Fetch-Site/Origin/Referer get 403. Browsers send those headers; raw `curl`
  testing must add them.
- **Transaction cookie is sealed, not signed-keyed separately.** It uses the
  same session seal as the auth cookie, which is tamper-evident; but the PKCE
  verifier lives client-side in a cookie, so a cookie-writing attacker could
  still inject their own verifier/state for a login CSRF-style attack. SID
  rotation at login and SameSite=Lax mitigate; production should hold the
  verifier server-side (KV/DB) or bind it with an HMAC.
- **Scope/redirect assumptions.** The authorize request sends
  `scope=openid offline_access profile` (tunable via `AUTH_SCOPES`) and
  `redirect_uri = <app origin>/<locale>/login`. Both must match what the spike
  registers in `SeedData.cs`; mismatches fail the authorize step.

## 4. Security notes (validated by construction, not yet live-tested)

- Browser JS never receives access or refresh tokens; the access token is minted
  per request inside server functions.
- `X-Hospital-Code` comes from the sealed session (set at login), never from
  browser input; `X-Actor-Id` is not sent in spike mode — the actor is resolved
  from `/api/me`.
- SID rotation on login: `loginCallback` clears any pre-auth session before
  creating the fresh one (fixation defense).
- Refresh rotation: each BFF call replaces the session's refresh token when the
  provider rotates it; failed refresh clears the session.
- Logout revokes the refresh token at `/connect/revocation` (best-effort) before
  clearing the cookie.
- The 401 path is bounded: exactly one retry, then session clear.

## 5. Options for CYN-94 (from what the spike demonstrated)

1. **Sealed-cookie refresh token (what this spike builds)** — stateless, no KV
   needed, simple; weaknesses: absolute lifetime, silent replacement, token
   replay window until next rotation, no server-side revocation list.
2. **Server-side session (KV/D1) holding the refresh token** — real revocation,
   activity-based expiry, per-session audit; costs a KV read/write per request
   and a session table.
3. **Short-lived access token cached server-side per session** — fewer refresh
   grants; needs concurrency care on rotation races.
4. **OpenID Connect code flow + httpOnly ID-token-only session** (no refresh
   token in the browser app) — moves minting/refresh entirely to the BFF and
   drops the refresh token from the web session; the API then trusts a
   per-request token minted by the BFF.

All options keep the browser token-free and the actor boundary at `/api/me`.

## 6. Reproducible run (once Phase 1 lands)

```bash
# backend (cynara-api checkout)
dotnet run --project spikes/Cynara.IdentitySpike        # :5295

# frontend
pnpm dev                                                 # :5173
# .dev.vars already points IDENTITY_ORIGIN=http://localhost:5295,
# AUTH_MODE=spike; .env has VITE_AUTH_MODE=spike.

open http://localhost:5173/en/forms                      # → /en/login
# hospital code: default → authorize → callback → /en/forms
open http://localhost:5173/en/auth-spike                 # protected evidence page
open http://localhost:5173/en/logout                     # revoke + clear
```

## 7. Limitations

- Live E2E, cookie-attribute inspection, expiry/tamper runs, refresh rotation,
  revocation, and hospital-switch checks are **pending the backend
  prerequisite** and the verify phase (tasks 7.2–7.3 of the task plan).
- The exact `/api/me` response shape of the spike monolith is assumed to expose
  `actorId` (+ `capabilities`, `email`, `hospital`); the adapter unwraps a
  JSON:API `data` envelope defensively.
- `AUTH_SESSION_SECRET` / `AUTH_CLIENT_SECRET` are dev placeholders in
  `.dev.vars`; for any non-disposable use they belong in encrypted storage, not
  committed vars (see `wrangler.jsonc` comments).

## 8. Recommendation

Proceed with the sealed-cookie BFF as the spike baseline and have CYN-94 weigh
option 2 (server-side session) only if revocation/absolute-expiry becomes a hard
requirement. Keep `AUTH_MODE=off` as the production default; delete the spike
files after the ADR decision.
