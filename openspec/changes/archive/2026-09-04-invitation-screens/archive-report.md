# Archive Report — invitation-screens (CYN-109)

artifact: gentle-ai.sdd-archive-report/v1
date: 2026-09-04
change: invitation-screens
tracker: CYN-109
store: hybrid (openspec + engram, identical bytes)
verdict: archived — SDD cycle complete

## Final State (AT CLOSE — authoritative over intermediate snapshots)

Shipped on main: admin invitation management UI at `/$locale/admin/invitations/`
(list, create, cancel, resend, copy-link) gated by `user-invitations.read` /
`.write`, and the public password-only acceptance flow at
`/$locale/invitations/accept` with one generic invalid-link state
(anti-enumeration), 429 handling via `describeApiError`, and double-submit
prevention. Verification verdict `pass_with_warnings`: 12/12 requirements,
20/20 scenarios, 0 blockers, 0 critical findings (native
`sdd-verify-validate` returns valid:true).

Work completed AFTER `apply-progress` and `verify-report` were first
persisted (per orchestrator final-state handoff, which outranks those
snapshots):

- Commit `2b3813a test(invitations): cover admin screens, accept flow, and
  facade with unit tests` — passing unit/static-markup tests for 19/20
  scenarios (`invitationAdminScreens.test.tsx`,
  `invitationAcceptanceFlow.test.ts`, `invitationsFacade.test.ts`) plus
  minimal testability refactors with NO behavior change (exported
  `parseAcceptSearch` from the accept route, `validateAcceptInput` +
  `toAcceptResult` as pure from the server fn, `buildAcceptLink` from the
  copy-link dialog).
- Commit `5c9db3f test(e2e): add invitation management and acceptance
  Playwright specs` — added `e2e/fixtures/invitations.ts` (route stubs),
  `FULL_CAPABILITIES` + `user-invitations.read/write`,
  `e2e/invitations.spec.ts` (admin; needs live cynara-api for auth),
  `e2e/invitations-accept.spec.ts` (public; 4/4 PASS including the
  double-submit single-request proof), AND fixed a real bug:
  `describeApiError` now maps plain `{status}` records (TanStack server-fn
  serialization drops the ApiError prototype, so backend 429s surfaced as
  generic unknown — now they map to the rate-limit message; unit-proven).
- Final verification evidence (re-run): `pnpm typecheck` PASS,
  `pnpm lint:check` PASS, `pnpm fmt:check` PASS (556 files), `pnpm build`
  PASS, `pnpm test` PASS (37 files, 217 tests, 0 failures), Playwright public
  accept PASS (4/4).

Full commit list on main since CYN-108 base (`c2cc963`): `98869d5` regen,
`8d54322` capability plumbing, `25d6dd8` oxfmt scope, `83ae3e3` admin
screens, `fbe6035` accept flow, `5516650` capability tests + harness,
`adaeb47` tasks.md edit-roots fix, `2b3813a` unit tests, `5c9db3f` e2e +
describeApiError fix. Plus 3 supporting refactors (`bb02741`, `8892917`,
`e5a33ee`). Diff ~100 files.

Cumulative changed lines (~2,686+) sit under the maintainer-approved
`size:exception` (single PR, pre-authorized). RDD was enabled globally
(user-approved) to unblock the runtime ledger; apply + verify attempts
settled `complete` / `passed`.

## Task Completion Gate: PASS

`openspec/changes/invitation-screens/tasks.md` (now archived) shows all 22
implementation tasks checked (`- [x]`, zero `- [ ]`; verified by grep before
the move). No stale-checkbox reconciliation was needed and none was
performed.

Recorded discrepancy: the Engram tasks observation #88
(`sdd/invitation-screens/tasks`, written 2026-09-04 01:41:14) still shows
`- [ ]` boxes — it is a stale intermediate snapshot predating the
`adaeb47` close-out flip to `[x]`. Per Final-State Authority the persisted
file artifact (rank 1) plus the orchestrator final-state facts (rank 2)
outrank it. Final state: all tasks complete.

## Specs Synced (source of truth)

`openspec/specs/` held no prior specs (only `.gitkeep`), so both delta specs
were full new specs, copied mechanically (shell `cp`, never Read→Write):

| Domain | Action | Details |
|--------|--------|---------|
| invitation-management | Created `openspec/specs/invitation-management/spec.md` | 7 added, 0 modified, 0 removed requirements (11 scenarios) |
| invitation-acceptance | Created `openspec/specs/invitation-acceptance/spec.md` | 5 added, 0 modified, 0 removed requirements (9 scenarios) |

No MODIFIED/REMOVED/RENAMED delta sections existed; nothing was merged into
an existing spec and no destructive change was possible. `rules.archive`
("Warn before merging destructive deltas") did not trigger.

Mechanical-copy readback (`diff -r` source vs. destination, both domains):
empty — byte-identical. Verbatim output is recorded in the phase return
envelope.

## Archive Contents

Archived to `openspec/changes/archive/2026-09-04-invitation-screens/` via
mechanical shell move (`git mv` fallback `mv`, untracked tree), verified by
`diff -r` of the pre-move recursive snapshot vs. the destination: empty —
byte-identical. Active `openspec/changes/invitation-screens/` no longer
exists.

- proposal.md ✅
- specs/invitation-management/spec.md ✅
- specs/invitation-acceptance/spec.md ✅
- design.md ✅
- tasks.md ✅ (22/22 tasks complete)
- apply-progress.md ✅
- verify-report.md ✅ (`gentle-ai.verify-result/v1`: pass_with_warnings,
  12/12, 20/20, blockers 0, critical 0)
- exploration artifacts retained: explore.md, preproposal.md, research.md ✅
- archive-report.md ✅ (this file; additive after the move, excluded from
  the move readback)

## Source of Truth Updated

- `openspec/specs/invitation-management/spec.md` (new)
- `openspec/specs/invitation-acceptance/spec.md` (new)

## Follow-ups (non-blocking, carried from verify)

- W1: run admin (`e2e/invitations.spec.ts`) + full-accept-outcome e2e against
  live cynara-api at `http://localhost:3000`.
- S1: update CYN-109 / CYN-99 wording to password-only acceptance.
- S2: fix stale `AGENTS.md` "no test script" note (vitest + Playwright exist).

## Risks (carried, acknowledged)

- C1 (anonymous password-only accept): mitigated by admin-side staff
  identity verification at create. Documented; not blocking.
- C2 (generic invalid-link state): by design (anti-enumeration);
  implementation matches.

## Traceability

Engram observations read (project `cynara-web`):

- proposal: #80 (`sdd/invitation-screens/proposal`)
- spec: #83 (`sdd/invitation-screens/spec`, covers both domains)
- design: #84 (`sdd/invitation-screens/design`)
- tasks: #88 (`sdd/invitation-screens/tasks`, stale unchecked — see Gate note)
- apply-progress: #89 (`sdd/invitation-screens/apply-progress`)
- verify-report: #95 (`sdd/invitation-screens/verify-report`,
  `pass_with_warnings`, 12/12, 20/20)

Openspec artifacts read:

- `openspec/changes/invitation-screens/proposal.md`
- `openspec/changes/invitation-screens/specs/invitation-management/spec.md`
- `openspec/changes/invitation-screens/specs/invitation-acceptance/spec.md`
- `openspec/changes/invitation-screens/design.md`
- `openspec/changes/invitation-screens/tasks.md`
- `openspec/changes/invitation-screens/apply-progress.md`
- `openspec/changes/invitation-screens/verify-report.md`

## SDD Cycle Complete

The change was fully planned, implemented, verified, and archived. No
CRITICAL findings ever blocked archive. Change is closed.
