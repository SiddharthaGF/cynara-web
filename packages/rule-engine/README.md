# @cynara/rule-engine (vendored)

Local vendored copy of the rule evaluation engine. Originally published from
[`cynara/packages/rule-engine`](https://github.com/ailuracode/cynara) in the
shared monorepo.

This copy exists so that `cynara-web` can be deployed as a standalone project
(e.g. Cloudflare) without depending on a `file:` path that points outside the
repo.

## Updating

When the upstream package changes:

1. Bump the `version` in this `package.json`.
2. Replace `dist/index.js` and `dist/index.d.ts` with the newly built outputs.
3. Run `pnpm install` and `pnpm typecheck`.

## Version

Current vendored version: `1.0.0`.
