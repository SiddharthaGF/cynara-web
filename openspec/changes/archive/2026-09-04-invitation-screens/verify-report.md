```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:a83e9fc30dccdea0b5a70e1911a73139158b3f458ad2f8ae677b07d7f3cb0911
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 20/20
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:fa1476266c8523f09a92e9734a36c78a84c8f377e4bf638cd56eb5a6560ead24
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:6908c8bb7b936de912c6720e291ca4b1fad7e7f22848d77c155542a23497e171
```

# Verify Report — invitation-screens (CYN-109)

artifact: gentle-ai.sdd-verify-report/v1
date: 2026-09-04
change: invitation-screens
tracker: CYN-109

## Verdict

**PASS WITH WARNINGS** — all 20 spec scenarios now have passing covering tests (12/12 requirements, 20/20 scenarios). The 19 unit/static scenarios pass via vitest (37 files, 217 tests, commit `2b3813a` + `5c9db3f`); the 20th (Acc Req 4 Scen 2, Double submit prevented) passes via Playwright e2e (`e2e/invitations-accept.spec.ts`, 4/4 public tests green, including the double-click single-request proof). Warnings below (backend-dependent e2e not yet run live; doc follow-ups) do not block `archive`.

## Gates (re-run 2026-09-04 — all pass)

| Gate | Tool | Result |
| --- | --- | --- |
| typecheck | `pnpm typecheck` (tsc -b --noEmit, TS 7.0.2) | PASS — no errors |
| lint | `pnpm lint:check` (oxlint 1.74.0) | PASS — clean |
| format | `pnpm fmt:check` (oxfmt 0.59.0, 553 files) | PASS — all formatted |
| build | `pnpm build` (vite) | PASS — built in ~2.6s (exit 0; output hash above) |
| unit tests | `pnpm test` (vitest 4.1.10) | PASS — 37 files, 217 tests, 0 failures (exit 0; output hash above) |
| e2e (public accept) | Playwright `e2e/invitations-accept.spec.ts` (no-auth project) | PASS — 4/4 (form render, missing/invalid, expired-used invalid, double-submit single-request). |
| e2e (admin + full accept) | Playwright `e2e/invitations.spec.ts` (auth fixture) | NOT RUN — needs live `cynara-api` for auth + backend outcomes (see WARNING). |

## Spec coverage (20/20 scenarios with passing tests — commits `2b3813a` + `5c9db3f`)

### invitation-management (7 requirements, 11 scenarios — 7 req / 11 scen COMPLETED)

| Requirement | Covering test | Status |
| --- | --- | --- |
| Capability-gated access (2 scen) | `invitationsCapabilities.test.ts` (8 its). | ✅ COMPLETED |
| Listing/status render (2 scen) | `invitationAdminScreens.test.tsx` (status matrix + terminal rows, static markup). | ✅ COMPLETED |
| Create (2 scen) | `invitationAdminScreens.test.tsx` (`validateInvitationCreate` valid + rejected) + `buildAcceptLink` (copy-link). | ✅ COMPLETED |
| Cancel (2 scen) | `invitationAdminScreens.test.tsx` (`isRenewableStatus` + button presence/absence). | ✅ COMPLETED |
| Resend (1 scen) | `invitationAdminScreens.test.tsx` (renewable gating + fresh-token link). | ✅ COMPLETED |
| Token hygiene (1 scen) | `invitationAdminScreens.test.tsx` (token absent from list markup + DTO shape). | ✅ COMPLETED |
| Localized admin copy (1 scen) | `invitationAdminScreens.test.tsx` (Spanish render, no missing keys). | ✅ COMPLETED |

### invitation-acceptance (5 requirements, 9 scenarios — 5 req / 9 scen COMPLETED)

| Requirement | Covering test | Status |
| --- | --- | --- |
| Public route/token param (2 scen) | `invitationAcceptanceFlow.test.ts` (`parseAcceptSearch` valid/missing/trimmed; `parseAcceptSearch` exported from the route for testability). | ✅ COMPLETED |
| Password-only accept (2 scen) | `invitationAcceptanceFlow.test.ts` (`validateAcceptInput` + `toAcceptResult` member mapping; both exported pure from the server fn). | ✅ COMPLETED |
| Uniform invalid state (2 scen) | `invitationAcceptanceFlow.test.ts` (`toAcceptResult` accepted:false for expired + used, identical shape). | ✅ COMPLETED |
| Rate-limit and error handling (2 scen) | Rate limited ✅ (`mapApiResponseError` 429 + `describeApiError` message incl. serialized-record shape, `invitationAcceptanceFlow.test.ts`). Double submit ✅ (`e2e/invitations-accept.spec.ts`: delayed stub + request counter, `dblclick` → single POST + disabled; PASS). | ✅ COMPLETED (2/2) |
| Localized accept copy (1 scen) | `invitationAcceptanceFlow.test.ts` (Spanish keys, no missing keys). | ✅ COMPLETED |

### e2e (Playwright — closes the last gap; public subset green without backend)

| Suite | Status | Evidence |
| --- | --- | --- |
| `e2e/invitations-accept.spec.ts` (public, no auth) | ✅ 4/4 PASS | Valid form render; missing token → generic invalid; expired/used → generic invalid; **double-submit → single POST + disabled (Acc R4 Scen 2)**. Run via a no-auth project (the standard `chromium` project needs `cynara-api` for its auth setup). |
| `e2e/invitations.spec.ts` (admin, auth fixture) | ➖ NOT RUN (needs live `cynara-api`) | List/create/cancel/resend/denied + FULL_CAPABILITIES; written for CI/with-backend. The covered spec scenarios already pass at the unit level. |

## Design adherence (D1–D10 — D1,D4,D5,D7,D8 fully TESTED; D2,D3,D6,D9,D10 TESTED for pure logic + code-confirmed for wiring)

| # | Decision | Status | Evidence |
| --- | --- | --- | --- |
| D1 | Regen `src/api/generated` as task 0 | ✅ code-confirmed | Commit `98869d5`. |
| D2 | Admin CRUD via `src/api/invitations.ts` + composite hooks | ✅ TESTED (error classification) + code-confirmed (mapping/hooks) | `invitationsFacade.test.ts` (`isForbiddenInvitationError`); `src/api/invitations.ts`, `useInvitationsList`, `useInvitationMutations` code-confirmed. |
| D3 | Anonymous `createServerFn`; NO `contractHeaders()` | ✅ TESTED (validator + mapper) + code-confirmed (fetch wiring) | `validateAcceptInput` + `toAcceptResult` pure unit tests; `src/server/invitation-acceptance.ts` direct fetch, only `Content-Type`/`Accept`. |
| D4 | `Invitation` subject; admin route `.read`; OR-in hub/nav | ✅ TESTED | `invitationsCapabilities.test.ts` (route requirement + hub OR-in its). |
| D5 | `isAuthRoutePath()` admits accept; no requirement | ✅ TESTED (route registration aspect) | `isAuthRoutePath` regex includes `invitations\/accept`; accept route unregistered in requirements map (`leaves the accept route unregistered` it). (No route-render test.) |
| D6 | ONE generic invalid state; 429 via `describeApiError`; double-submit | ⚠️ PARTIAL (generic + 429 TESTED; double-submit code-confirmed) | `toAcceptResult` (generic), `mapApiResponseError` + `describeApiError` (429); `AcceptInvitationPage` `if (pending) return` + `disabled` code-confirmed. |
| D7 | Token only in dialog-local; never keys/list/logs | ✅ TESTED | `CopyLinkDialog` (R5) + `InvitationView` ("never token material") static-markup + DTO-shape tests. |
| D8 | `cancel`→`cancelled`; `revoked` display-only; no revoke action | ✅ TESTED | `invitationStatus.ts` + `InvitationView` gating (renewable matrix + terminal display-only static tests). |
| D9 | ASP.NET Identity hints; server 400 authoritative | ✅ code-confirmed | `minLength={6}` + `describeApiError`. (No policy test.) |
| D10 | `profileSnapshot` JSON v1 at create; hospital display-only | ✅ code-confirmed | `invitationForm.ts` snapshot build. (No serialization test.) |

## Findings

### CRITICAL

None. (The former single gap — double-submit — now has a passing e2e; see the e2e table and Acc R4 row.)

### WARNING

- **W1 (live-backend e2e)** — `e2e/invitations.spec.ts` (admin list/create/cancel/resend/denied) and the full-stack accept outcomes (success member summary, 429 render) need a live `cynara-api` (auth session + backend responses). The `_serverFn` transport drops nested `member` on raw stubs and breaks on raw 429, so those outcomes cannot be stubbed reliably; they are written for CI/with-backend. The covered spec scenarios already pass at the unit level (`toAcceptResult`, `describeApiError`, `mapApiResponseError`) and the public invalid/double-submit pass e2e without a backend. Follow-up: run the full e2e against `cynara-api` at `http://localhost:3000` per AGENTS.md.

### SUGGESTION

- **S1** — Update CYN-109 / CYN-99 wording to match implemented password-only acceptance.
- **S2** — `AGENTS.md` validation note claims "no test script" — stale (vitest + Playwright present).

## Risks carried forward

- C1 (anonymous password-only accept) — mitigated by admin-side staff verification at create. Documented; not blocking.
- C2 (generic invalid-link state forced by uniform envelope) — by design; implementation matches.

## Remediation path (done — retained for the record)

The former single gap (double-submit) is now covered by a passing e2e (`e2e/invitations-accept.spec.ts`, delayed stub + counter, `dblclick` → single POST + disabled). No remediation remains for PASS. Outstanding follow-ups (non-blocking): run the admin + full-accept e2e against live `cynara-api`; fix `describeApiError` serialized-`{status}` handling is already committed (`src/api/error-message.ts` + unit test) so server-fn 429s surface the rate-limit message once a backend returns them.

## Artifacts

- openspec: `openspec/changes/invitation-screens/verify-report.md`
- engram: topic `sdd/invitation-screens/verify-report` (project `cynara-web`, capture_prompt false)
