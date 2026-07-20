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

## License

MIT — see [LICENSE](LICENSE).
