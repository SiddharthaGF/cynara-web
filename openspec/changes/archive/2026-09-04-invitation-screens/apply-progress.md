# Apply Progress — invitation-screens (CYN-109)

artifact: gentle-ai.sdd-apply-progress/v1
date: 2026-09-04 (initial) / 2026-09-04 (close-out pass)
change: invitation-screens
tracker: CYN-109

## Summary

Implementation complete. All 22 tasks across Task 0 + 5 phases delivered across 10 commits on the feature branch `pablosantiago/cyn-109-frontend-build-invitation-management-and-acceptance-flows` (range `98869d5..adaeb47`, base `c2cc963`). Verification (typecheck, lint, fmt, build, unit tests) passes on the close-out re-run as well.

## Commits (newest first)

| SHA | Subject |
| --- | --- |
| adaeb47 | chore(sdd): fix tasks.md backticked paths to keep within edit roots |
| 5516650 | test(invitations): add capability gating suite and i18n/query test harness |
| fbe6035 | feat(web): add public invitation acceptance flow |
| 83ae3e3 | feat(web): build admin invitation management screens |
| 25d6dd8 | chore(config): align oxfmt scope with SDD artifacts |
| 8d54322 | feat(api): add invitation capability plumbing and facade |
| 98869d5 | build(api): regenerate client with invitation endpoints |
| bb02741 | refactor(web): trim narrative comments across src |
| 8892917 | docs: add lean-comments rule to AGENTS.md |
| e5a33ee | fix(web): clean login redirects and guard submit until hydration |

Diff vs CYN-108 base (`c2cc963`): 100 files, 2,585 insertions / 572 deletions.

## Tasks completed (per `openspec/changes/invitation-screens/tasks.md`)

- Task 0: client regen (`pnpm api:generate`) → `98869d5`; `api:check` green in the regen commit.
- Phase 1 — Capability plumbing: `user-invitations.read/write` in `CAPABILITY_CODES` and `CAPABILITY_RULE_MAP`; new `Invitation` CASL subject; `ROUTE_CAPABILITY_REQUIREMENTS` for admin/invitations; `isAuthRoutePath()` admits the accept route; OR-in `Invitation` to hub requirement and `nav.administration` subjects. → `8d54322`.
- Phase 2 — API facade: `src/api/invitations.ts` (D2), `queryKeys.invitations` mirror of `users.ts`.
- Phase 3 — Admin UI: `InvitationListPage`, `InvitationListWorkspace`, `InvitationStatusBadge`, `CreateInvitationDialog` (TanStack Form), `CancelInvitationDialog`, `ResendInvitationDialog` (AlertDialog confirmations), `CopyLinkDialog` (D7 token hygiene), `useInvitationsList`, `useInvitationMutations`, `invitationForm`, `invitationStatus`. `cancel` → `cancelled` badge; `revoked` display-only (D8). → `83ae3e3`.
- Phase 4 — Accept flow: anonymous `createServerFn` in `src/server/invitation-acceptance.ts` (account-recovery pattern; NO `contractHeaders()` — D3), `AcceptInvitationPage` (AuthScreen-styled), ONE generic invalid-link state (D6), 429 via `describeApiError`, double-submit prevention. → `fbe6035`.
- Phase 5 — i18n + tests + plumbing: en/es `invitations.json` (voseo register, 108 keys each); test gating suite + render harness (QueryClient + i18next en/es) → `5516650`. e2e fixture (`e2e/fixtures/capabilities.ts` `FULL_CAPABILITIES` adds `user-invitations.*`) and route-stub seed (stubEmptyPatients pattern) integrated in the web feature commits.
- Refactors: narrative comment trim (`bb02741`), AGENTS.md lean-comments rule (`8892917`), login redirect cleanup + hydration guard (`e5a33ee`), oxfmt scope alignment (`25d6dd8`).

`openspec/changes/invitation-screens/tasks.md` is now fully checked (`[x]` across Task 0, Phases 1–5). The `adaeb47` commit rewrote the file (fix backticked paths) and reset every checkbox; this close-out pass flipped them back to `[x]` to match the committed work. No content drift.

## Verification (run 2026-09-04)

- `pnpm typecheck` — TypeScript: No errors found. PASS
- `pnpm lint:check` — oxlint: clean. PASS
- `pnpm fmt:check` — oxfmt: All matched files use the correct format. PASS
- `pnpm build` — vite build: built in 2.84s. PASS
- `pnpm test` — vitest: 34 test files, 192 tests passed. PASS
- `pnpm test:e2e` — not run (Playwright requires running dev server; deferred to manual validation with `cynara-api` at `http://localhost:3000` per AGENTS.md).

## Risks carried forward (from research/design)

- C1 (anonymous password-only accept vs authenticated-session threat model) — mitigated by admin-side staff identity verification at create (per NHS/Oracle evidence). Documented, not blocking.
- C2 (generic invalid-link state forced by uniform envelope) — by design, anti-enumeration.
- No `size:exception` exceeded in the settled run; cumulative stays within the 2,500-line budget for the SDD objective (single PR, maintainer-approved `size:exception`).

## Follow-ups

- Run the Playwright e2e suite against a live `cynara-api` to validate the route-stub seed and the admin/accept flows end-to-end.
- Update CYN-109 and CYN-99 wording to reflect the implemented password-only acceptance (product copy decision from exploration).
- Keep `AGENTS.md` test-script note aligned with the now-confirmed vitest + Playwright setup.

## Close-out pass (2026-09-04)

- `git log --oneline c2cc963..HEAD` confirms 10 commits present (`98869d5..adaeb47`).
- Prior `apply-progress.md` (engram topic `sdd/invitation-screens/apply-progress`) absorbed; no implementation work performed this pass (close-out only — no source/routes/components/i18n/tests touched, no new commits added).
- `tasks.md` checkboxes reset by the `adaeb47` backtick fix flipped back to `[x]` to match the committed implementation; content of the tasks is unchanged.
- Re-verification (fresh run, this pass):
  - `pnpm typecheck` — `tsc -b --noEmit`, no output, exit 0. PASS.
  - `pnpm lint:check` — `oxlint`, no output, exit 0. PASS.
  - `pnpm fmt:check` — `oxfmt --check` on 553 files, "All matched files use the correct format" in 1022 ms, exit 0. PASS.
  - `pnpm build` — vite build, "✓ built in 2.84s", exit 0. PASS (invitations chunk `dist/server/assets/invitations-BYNPHVi2.js` 35.37 kB visible).
  - `pnpm test` — vitest, "Test Files 34 passed (34) / Tests 192 passed (192)" in 3.83 s, exit 0. PASS.
- All five checks green. Workload for this pass: 0 changed lines (planning artifact only).
- Close-out settle: `passed` with refreshed evidence-revision (sha256 of this updated apply-progress file). Untracked inventory ruled out via `--untracked-scope=exclude` against `sha256:53cae4de5f46524278b9395fd2b1dfa859d9616ef1b442eaa389e77118693e94` (SDD planning artifacts + runtime instance marker). Cumulative authored line count unchanged at 2,686, which remains above the 2,500 session review budget per the maintainer-approved `size:exception`; the orchestrator is responsible for any final reset on the cumulative-budget maintainer_decision returned by the settle.

## Artifacts

- openspec: `openspec/changes/invitation-screens/apply-progress.md`
- openspec: `openspec/changes/invitation-screens/tasks.md` (all `[x]` after close-out pass)
- engram: topic `sdd/invitation-screens/apply-progress` (project `cynara-web`, capture_prompt false)