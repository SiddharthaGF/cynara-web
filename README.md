# Cynara Web

Primary frontend for [Cynara](https://github.com/ailuracode/cynara): a
configurable clinical platform for hospitals.

Built with **React 19**, **TypeScript**, and
**[TanStack Start](https://tanstack.com/start)** (file-based routing,
SSR-ready). The form designer lives here and talks to `cynara-api` over `/api`.

## Related repositories

| Repository                                             | Role                            |
| ------------------------------------------------------ | ------------------------------- |
| [cynara](https://github.com/ailuracode/cynara)         | Schema contract, docs, fixtures |
| [cynara-api](https://github.com/ailuracode/cynara-api) | ASP.NET backend (primary)       |

## Routes

| Path                    | Purpose                       |
| ----------------------- | ----------------------------- |
| `/forms`                | Form catalog and create draft |
| `/forms/:code/designer` | Visual form designer (CYN-11) |

## Getting started

Prerequisites: [Node.js](https://nodejs.org/) 22+, [pnpm](https://pnpm.io/) 9+

Start the API (`cynara-api` on port 3000), then:

```bash
pnpm install
pnpm dev
```

The dev server proxies `/api` to `http://localhost:3000`.

## Scripts

| Command          | Description                   |
| ---------------- | ----------------------------- |
| `pnpm dev`       | TanStack Start dev server     |
| `pnpm build`     | Client + SSR production build |
| `pnpm preview`   | Preview production build      |
| `pnpm typecheck` | TypeScript check              |

## Project structure

```
src/
├── routes/              # TanStack Start file routes
│   ├── __root.tsx
│   ├── index.tsx        # → /forms redirect
│   └── forms/
│       ├── index.tsx    # form list
│       └── $code/designer.tsx
├── features/forms/      # designer UI + draft model
├── api/                 # cynara-api client
└── router.tsx
```

## Contract conformance

Client-side validation uses draft-model checks before autosave. Full JSON
Schema + semantic validation runs on the API when saving drafts.

See the
[clinical form schema contract](https://github.com/ailuracode/cynara/blob/main/docs/clinical-form-schema.md)
and
[rules schema](https://github.com/ailuracode/cynara/blob/main/docs/rules-schema.md).

## Deploying to Cloudflare

`cynara-web` is configured for full SSR on Cloudflare via the
[`@cloudflare/vite-plugin`](https://developers.cloudflare.com/workers/vite-plugin/)
and `wrangler`. The config is checked in (`wrangler.toml`) and the dev
dependencies are already listed in `package.json`.

### Prerequisites

- A Cloudflare account with Workers paid plan (the SSR worker runs on Workers
  runtime; client assets are served by Workers Assets, the same model Pages uses
  internally).
- `cynara-api` reachable from the public internet, with CORS allowed for the
  Cloudflare Workers origin(s) where this app is deployed
  (`https://<project-name>.<account-subdomain>.workers.dev` for preview, and
  your custom domain for production).

### Environment variables

Set in the Cloudflare dashboard for the project, under **Settings → Build →
Build variables & secrets**:

| Variable          | Kind   | Example                          |
| ----------------- | ------ | -------------------------------- |
| `VITE_API_ORIGIN` | Public | `https://api.cynara.example.com` |

`VITE_API_ORIGIN` is a build-time constant compiled into the client bundle by
Vite (and read by the SSR worker too). It must be present during `vite build`,
so it must be set on **both** the production and preview environments — preview
URLs may otherwise fail when the API rejects cross-origin requests.

Do **not** commit secrets. Any runtime-only secrets should be set under
**Settings → Variables → Environment variables** (encrypted) and consumed via
`context.env` / Nitro bindings if/when a server function needs them.

### Deployment model

- **Production branch:** `main`. Every push to `main` is deployed by Cloudflare
  Pages to the production URL.
- **Preview branches:** every open pull request targeting `main` automatically
  receives its own preview URL — useful for design review and stakeholder
  feedback before a PR is merged.
- This is configured once in the Cloudflare dashboard under **Workers → Pages →
  Settings → Builds**:
  1. Connect the repo to `ailuracode/cynara-web` via Git integration.
  2. Set **Production branch** to `main`.
  3. Leave **Preview branches** as the default (every non-production branch
     receives a preview).
  4. Set **Build command** to `pnpm build` and **Build output directory** to
     `dist`.

### One-time setup

```bash
pnpm install
npx wrangler login
```

### Build

```bash
pnpm build
```

This invokes `vite build`, which now runs the Cloudflare Vite plugin. The
artifact is a `dist/` directory containing the SSR worker bundle and the client
assets.

### Local preview before opening a PR

```bash
pnpm build
npx wrangler dev
```

This boots the actual `workerd` runtime locally — closer to production than
`vite preview`. Reproduce this before opening a PR so reviewers see a green
preview URL.

### Manual production deploy (optional)

Cloudflare Pages handles production deploys automatically on push to `main`. To
publish a manual production build bypassing the Git integration:

```bash
pnpm deploy
```

This runs `pnpm build` followed by `wrangler deploy`. Use sparingly — the Git
integration is the default path.

### Generated types

```bash
pnpm cf-typegen
```

Produces `worker-configuration.d.ts` (gitignored) so the SSR worker can refer to
typed Cloudflare bindings. Add the file's path to `tsconfig.app.json`
`compilerOptions.types` only if the app starts reading `Env`-typed bindings.

## License

MIT — see [LICENSE](LICENSE).
