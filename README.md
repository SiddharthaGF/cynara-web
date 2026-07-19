# Cynara Web

Primary frontend for [Cynara](https://github.com/ailuracode/cynara): a
configurable clinical platform for hospitals.

Built with **React**, **TypeScript**, and **[Vite+](https://viteplus.dev/)**
(Vite, Oxlint, Oxfmt). Renders forms defined by the technology-neutral
[clinical form schema contract](https://github.com/ailuracode/cynara/blob/main/docs/clinical-form-schema.md).

## Related repositories

| Repository                                             | Role                            |
| ------------------------------------------------------ | ------------------------------- |
| [cynara](https://github.com/ailuracode/cynara)         | Schema contract, docs, fixtures |
| [cynara-api](https://github.com/ailuracode/cynara-api) | ASP.NET backend (primary)       |

## Contract conformance

Client-side validation should use a JSON Schema Draft 2020-12 validator (e.g.
[Ajv](https://ajv.js.org/)) against the meta-schemas in `cynara/schemas/v1/`.

Semantic rules are documented in
[`semantic-rules.md`](https://github.com/ailuracode/cynara/blob/main/docs/semantic-rules.md).

## Getting started

Prerequisites: [Node.js](https://nodejs.org/) 20+, [pnpm](https://pnpm.io/) 9+

```bash
pnpm install
pnpm dev
```

The dev server listens on `http://localhost:5173` by default.

### Schema submodule

```bash
git submodule add https://github.com/ailuracode/cynara.git schemas
git submodule update --init --recursive
```

## Scripts

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `pnpm dev`        | Start Vite+ dev server        |
| `pnpm build`      | Production build              |
| `pnpm preview`    | Preview production build      |
| `pnpm lint:check` | Oxlint via Vite+              |
| `pnpm lint:fix`   | Oxlint with autofix           |
| `pnpm fmt`        | Oxfmt                         |
| `pnpm fmt:check`  | Check formatting              |
| `pnpm check`      | Format, lint, and type checks |

## License

MIT — see [LICENSE](LICENSE).
