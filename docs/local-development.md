# Local development workflow

Reproducible setup for `cynara-web` on a clean checkout. Targets React 19 +
TanStack Start (file-based routing, SSR-ready), Vite 8 with the Cloudflare Vite
plugin, pnpm 11, and a `cynara-api` instance on `http://localhost:5000`.

For backend setup, see
[`cynara-api/docs/local-development.md`](https://github.com/ailuracode/cynara-api/blob/develop/docs/local-development.md).
The frontend and backend share a single port: the API listens on `:5000`, the
web app proxies `/api` to it.

## Prerequisites

| Tool                | Version  | Notes                                                                                                                                 |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js             | 22+      | Tested on Node 22 and 24. Use `nvm` or `fnm` if your system Node is older.                                                            |
| pnpm                | 11.x     | Pinned via `packageManager` in `package.json` to `pnpm@11.8.0`. Corepack enables the right version automatically (`corepack enable`). |
| cynara-api          | running  | Required for any page that calls the API (most of them). See the API's local-development doc for setup.                               |
| Bash                | POSIX    | Used by Husky pre-commit and the deployment dry-run script.                                                                           |
| Playwright browsers | optional | Only required for `pnpm test:e2e` (`npx playwright install` once).                                                                    |

### Verify the toolchain

```bash
node --version       # v22 or newer
pnpm --version       # 11.x (matches packageManager)
corepack enable      # makes pnpm respect the pinned version
```

If `pnpm` is not on `PATH`, `corepack enable` (run once) installs the version
pinned in `package.json`.

### Platform notes

- **WSL** — run everything from the WSL shell. `pnpm install` from Windows
  native into a WSL checkout can produce a broken `node_modules` because of path
  / symlink differences.
- **macOS / Linux** — works as written. On Apple Silicon, install the `arm64`
  Node 22 build; pnpm and Vite both ship native arm64 binaries.
- **Windows native** — works, but the Cloudflare preview deployment targets
  Linux. Run `pnpm build` here, then test the worker locally with
  `npx wrangler dev` before pushing.

## First-time setup

```bash
git clone https://github.com/ailuracode/cynara-web.git
cd cynara-web
pnpm install                       # also triggers Husky pre-commit install
cp .env.example .env               # only if you want to override the default
```

`pnpm install` runs the `prepare` script (`husky`) which installs the pre-commit
hook at `.husky/pre-commit`. The hook runs `pnpm precommit` (`lint:check` +
`typecheck`) on staged files. Disable with `HUSKY=0 git commit` if you need a
one-off bypass.

### Configure the API origin

The web app talks to `cynara-api` through `VITE_API_ORIGIN`. The **client
bundle** resolves it in this order:

1. `process.env.VITE_API_ORIGIN` (shell / CI)
2. The `.env` file in the repo root (gitignored)
3. Empty — the client surfaces `ApiOriginUnavailableError` with remediation

The **SSR runtime** is different. It runs inside workerd through the Cloudflare
Vite plugin, whose environment comes from `.dev.vars` / `.env` /
`wrangler.jsonc [vars]` — `process.env` is **not** consulted there. The SSR
resolution order is:

1. `.dev.vars` in the repo root (highest precedence)
2. The `.env` file in the repo root
3. The `[vars] VITE_API_ORIGIN` block in `wrangler.jsonc` (production fallback)

That asymmetry matters for CI: the E2E workflow sets `VITE_API_ORIGIN` as a step
env var, which reaches only the browser bundle. Without a `.dev.vars` file the
SSR falls back to the production origin, so the locally created E2E forms are
never found. The workflow therefore writes a `.dev.vars` that points the SSR
runtime at the locally booted API before running Playwright.

`.env.example` ships `VITE_API_ORIGIN=http://127.0.0.1:5000` for the local API.
To use another explicit origin, copy it to `.env` and edit:

```bash
cp .env.example .env
$EDITOR .env
```

### Start the API

`cynara-api` must be reachable at the origin you set above. The quickest path on
a developer machine:

```bash
# in a second terminal, from the cynara-api checkout
dotnet run --project src/Cynara.Api
# listens on http://localhost:5000
curl -s http://localhost:5000/health
# → {"service":"cynara-api","status":"ok","probes":[...]}
```

See `cynara-api/docs/local-development.md` for the full API setup, including the
database, seed, and migration behavior.

## Development commands

| Task                           | Command                                                   |
| ------------------------------ | --------------------------------------------------------- |
| Install dependencies           | `pnpm install`                                            |
| Start the dev server           | `pnpm dev` (Vite + TanStack Start, listens on `:5173`)    |
| Type check                     | `pnpm typecheck`                                          |
| Lint (read-only)               | `pnpm lint:check`                                         |
| Lint with autofix              | `pnpm lint:fix`                                           |
| Format check                   | `pnpm fmt:check`                                          |
| Format write                   | `pnpm fmt`                                                |
| Static analysis (React Doctor) | `pnpm doctor`                                             |
| Production build               | `pnpm build` (writes `dist/server/` + `dist/client/`)     |
| Preview the production build   | `pnpm preview` (Vite preview, no Worker runtime)          |
| Local Worker preview           | `pnpm build && npx wrangler dev` (runs `workerd` locally) |
| E2E tests (Playwright)         | `pnpm test:e2e` (requires API on `:5000`)                 |
| E2E tests with UI runner       | `pnpm test:e2e:ui`                                        |
| Unit tests (Vitest)            | `pnpm test` (transport + SDK façade tests in `src/api/`)  |

### E2E preconditions

`pnpm test:e2e` runs every spec in `e2e/`, including the AI-chat specs
(`ai-chat-draft-sync.spec.ts`, `formai-stream.spec.ts`). They mock the chat
stream but still read the real AI provider settings from the API. If the
provider is unconfigured, the chat panel renders its "Configure AI" empty state
and those specs wait until the test timeout — they do not fail fast.

Seed the database with `Cynara.Seed` (it upserts AI settings) or configure the
provider through the API first, e.g.:

```bash
curl -s -X PATCH http://localhost:5000/api/aiProviderSettings/default \
  -H 'X-Hospital-Code: default' \
  -H 'X-Actor-Id: designer-user' \
  -H 'Accept: application/vnd.api+json; ext="https://www.jsonapi.net/ext/openapi"' \
  -H 'Content-Type: application/vnd.api+json; ext="https://www.jsonapi.net/ext/openapi"' \
  -d '{"data":{"id":"default","type":"aiProviderSettings","attributes":{"baseUrl":"https://api.openai.com/v1","model":"gpt-4o-mini","apiKey":"dev-only-key"}}}'
```

`GET /api/ai/status` should then report `"configured": true`. The CI E2E
workflow seeds with `Cynara.Seed`, which already upserts AI settings. |
Regenerate Cloudflare types | `pnpm cf-typegen` (writes
`worker-configuration.d.ts`) | | Regenerate the API client | `pnpm api:generate`
(writes `src/api/generated/`) | | Check API client drift | `pnpm api:check`
(regenerates, fails on stale output) | | Deploy to Cloudflare | `pnpm deploy` |
| Deploy preserving vars | `pnpm deploy:keep-vars` |

### What `pnpm dev` actually does

`vite dev` boots a Vite server that:

1. Loads `vite.config.ts`, which uses `@cloudflare/vite-plugin` to wire the SSR
   environment.
2. Resolves `VITE_API_ORIGIN` and uses it as the proxy target for any `/api/...`
   request from the browser.
3. Mounts the TanStack Start dev pipeline (`tanstackStart()` plugin), which
   serves the routes under `src/routes/` with HMR.

The browser at <http://localhost:5173> proxies JSON:API requests to the API
origin you configured. Server-side route loaders run inside Vite's SSR
environment and use the same `VITE_API_ORIGIN` directly (relative `/api` paths
are not valid fetch targets on the server — see `resolveApiUrl.server` in
`src/api/client.ts`).

### Common dev-server failures

| Symptom                                                             | Likely cause                                 | Fix                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_ORIGIN is not set` thrown at startup                      | No env var, no `.env`, no `[vars]` block     | Copy `.env.example` to `.env` or set `VITE_API_ORIGIN` in your shell.                                                                                                                                          |
| `CORS` errors in the browser console                                | API does not allow `http://localhost:5173`   | Add `http://localhost:5173` to `Cors:AllowedOrigins` in `cynara-api`'s `appsettings.Local.json` or `appsettings.Development.json`, or pass `Cors__AllowedOrigins__0=http://localhost:5173`.                    |
| `Cannot connect` / `NetworkError when attempting to fetch resource` | API not running, or wrong port               | Start `cynara-api` on `:5000` (or update `VITE_API_ORIGIN`).                                                                                                                                                   |
| `/api` returns 502 from the dev proxy                               | API crashes on the request                   | Check `cynara-api` logs (the proxy logs the upstream status, not the body).                                                                                                                                    |
| Streams (`text/event-stream`) hang mid-chat                         | Proxy buffering SSE chunks                   | Already handled in `vite.config.ts` — `proxy.on('proxyRes', …)` strips `cache-control` and sets `x-accel-buffering: no`. If you bypass the dev server (e.g. direct fetch from SSR), do the same on your proxy. |
| Pre-commit hook fails on every commit                               | `pnpm lint:check` or `pnpm typecheck` errors | Run them locally first; auto-format with `pnpm fmt` and `pnpm lint:fix`.                                                                                                                                       |

### Run against a remote / non-default API

Useful when the API runs in a container, a coworker shares their box, or you
want to hit a Cloudflare preview deploy:

```bash
# shell override
VITE_API_ORIGIN=https://api-staging.example.com pnpm dev

# or .env override
echo 'VITE_API_ORIGIN=https://api-staging.example.com' > .env
pnpm dev
```

Browser requests will be proxied to the remote origin. CORS still has to allow
the dev origin (`:5173`) — coordinate with whoever owns the remote API.

## Authentication

The client uses authorization-code + PKCE against the Cynara API. TanStack Start
exchanges the callback code and stores access and refresh tokens only in a
sealed httpOnly cookie. Browser API calls use the same-origin BFF, which
refreshes and rotates tokens server-side.

After sign-in, `GET /api/me/hospitals` lets the server select the configured
local workspace when available, or the first membership otherwise. The verified
selection is stored server-side before tenant-scoped routes load. Use the
workspace switcher to change workspace.

```bash
pnpm dev
open http://localhost:5173/en/forms
```

## Generated API client

The typed client in `src/api/generated/` is produced by `@hey-api/openapi-ts`
from `cynara-api`'s committed OpenAPI contract. It is checked in and **never
edited by hand**; the formatter, linter, and typecheck all ignore it.

To regenerate:

```bash
pnpm api:generate
```

By default the generator reads `cynara-api`'s `contracts/openapi.json` from the
sibling checkout `../cynara-api` (that repository must be present next to
`cynara-web`). Override the source with environment variables:

```bash
# path to a local contract copy
OPENAPI_SPEC=../somewhere/openapi.json pnpm api:generate

# remote URL (what CI uses)
OPENAPI_SPEC_URL=https://raw.githubusercontent.com/SiddharthaGF/cynara-api/develop/contracts/openapi.json \
  pnpm api:generate
```

`pnpm api:check` regenerates and exits non-zero if the committed output differs
— the drift gate the `API client drift` workflow runs. See
[`api-client.md`](api-client.md) for the full regeneration and upgrade
procedure, including how CI pins the contract ref.

## Build and preview

### Production build

```bash
pnpm build
```

Output:

```
dist/
├── server/
│   ├── index.js           # SSR worker bundle
│   ├── wrangler.json      # generated worker config (Cloudflare consumes this)
│   └── …
└── client/                # static assets served by Workers Assets
```

`vite.config.ts` adds a `closeBundle` hook that strips `dist/server/.vite` from
the output so local dev artifacts never leak into the deploy bundle.

### Local preview (Vite)

```bash
pnpm preview
```

Vite's static preview server. Use it to validate client routing and asset paths.
Does **not** run the SSR worker — for that, use Wrangler below.

### Local preview (workerd)

```bash
pnpm build
npx wrangler dev
```

Boots the actual `workerd` runtime locally with the same bundle that GitHub
Actions ships. Use this before opening a PR so reviewers see a green Cloudflare
preview URL.

### Dry-run a deploy

```bash
pnpm build
npx wrangler whoami                  # sanity-check the token
npx wrangler deploy --dry-run --outdir /tmp/wrangler-dryrun
```

`wrangler deploy --dry-run` reads `dist/server/wrangler.json` and the matching
`dist/server/index.js` + `dist/client/` assets, lists what would be uploaded,
and exits without contacting Cloudflare. The bundle under `dist/server/` is
exactly what GitHub Actions ships.

## Environment variables

| Variable                  | Required    | Where it comes from                       | Purpose                                                                                                                                                              |
| ------------------------- | ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_ORIGIN`         | yes         | `.env`, shell, or `wrangler.jsonc [vars]` | Public origin of `cynara-api`. Compiled into the client bundle and propagated to the SSR worker by the Cloudflare Vite plugin. Must be present at `vite build` time. |
| `OPENAPI_SPEC`            | optional    | shell                                     | Path to an OpenAPI contract used by `pnpm api:generate` (overrides the sibling-checkout default).                                                                    |
| `OPENAPI_SPEC_URL`        | optional    | shell / CI                                | URL of an OpenAPI contract used by `pnpm api:generate` (overrides `OPENAPI_SPEC`). The `API client drift` workflow sets this to the pinned contract ref.             |
| `APP_ENV`                 | optional    | shell                                     | `development` / `production` / `testing`. Drives `environment.ts`. Falls back to `import.meta.env.DEV`.                                                              |
| `APP_ORIGIN`              | yes         | `.dev.vars`, deployment config            | Public web origin registered for the authorization callback. Server-only.                                                                                            |
| `IDENTITY_ORIGIN`         | yes         | `.dev.vars`, deployment config            | Cynara API origin serving `/connect/*` and `/api/*`. Server-only.                                                                                                    |
| `AUTH_SESSION_SECRET`     | yes         | secret store                              | Password sealing the session cookie (32+ chars). Server-only; keep out of committed vars.                                                                            |
| `AUTH_CLIENT_ID`          | yes         | `.dev.vars`, deployment config            | Confidential `cynara-web` client id.                                                                                                                                 |
| `AUTH_CLIENT_SECRET`      | yes         | secret store                              | Client secret for token and revocation endpoints. Server-only.                                                                                                       |
| `AUTH_SCOPES`             | optional    | `.dev.vars`, deployment config            | Space-separated scopes requested at authorize (default `openid offline_access profile`).                                                                             |
| `CLOUDFLARE_API_TOKEN`    | deploy only | CI secret                                 | Wrangler deploy token with the **Edit Cloudflare Workers** template.                                                                                                 |
| `CLOUDFLARE_ACCOUNT_ID`   | deploy only | CI secret                                 | Shown on the Workers project overview page.                                                                                                                          |
| `CLOUDFLARE_PROJECT_NAME` | optional    | CI variable                               | Defaults to `cynara-web` if unset.                                                                                                                                   |

> Secrets never belong in `.env.example`. The committed file documents only safe
> defaults. Production secrets belong in the Cloudflare dashboard (encrypted) or
> the GitHub Actions secrets store.

## CORS

CORS is enforced by `cynara-api`, not the web app. The dev origin
`http://localhost:5173` is whatever `vite.config.ts` reports as `server.port`;
if you change it, add the new origin to the API's `Cors:AllowedOrigins`.

Quick CORS override for local dev (in the API checkout):

```jsonc
// src/Cynara.Api/appsettings.Local.json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://cynara-web.livesanty.workers.dev",
    ],
  },
}
```

Or via env var when starting the API:

```bash
Cors__AllowedOrigins__0=http://localhost:5173 \
  dotnet run --project /path/to/cynara-api/src/Cynara.Api
```

## Quick reference

| Task                                  | Command                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Install + start dev server            | `pnpm install && pnpm dev`                                                                |
| Run typecheck + lint + format         | `pnpm typecheck && pnpm lint:check && pnpm fmt:check`                                     |
| Run everything CI runs                | `pnpm install && pnpm typecheck && pnpm lint:check && pnpm fmt:check && pnpm build`       |
| Open the app in a browser             | <http://localhost:5173/> (redirects to `/en/forms`)                                       |
| Verify the API is reachable           | `curl -s http://localhost:5000/health`                                                    |
| Smoke-test JSON:API through the proxy | `curl -s -H 'Accept: application/vnd.api+json' http://localhost:5173/api/formDefinitions` |
| Regenerate Cloudflare bindings types  | `pnpm cf-typegen`                                                                         |
| Regenerate the API client             | `pnpm api:generate` (see [`api-client.md`](api-client.md))                                |

## Related docs

- [`README.md`](../README.md) — high-level overview, scripts, deployment.
- [`AGENTS.md`](../AGENTS.md) — implementation rules, source layout, validation
  expectations.
- [`api-client.md`](api-client.md) — generated client regeneration and upgrade
  procedure, contract editing, and CI pinning.
- [cynara-api docs](https://github.com/ailuracode/cynara-api/blob/develop/docs/local-development.md)
  — backend setup, database, and CORS.
- [TanStack Start docs](https://tanstack.com/start) — file-based routing and
  SSR.
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
  — worker build, bindings, and deploy.
