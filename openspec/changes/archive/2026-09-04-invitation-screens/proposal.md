# Proposal: Invitation Screens (CYN-109)

## Intent

Cynara-web has no invitation surface: the backend invitation lifecycle API (CYN-104, PRs #56–#65) is live but `src/api/generated/` predates it — `pnpm api:check` is red. Ship the admin invitation management UI and the public password-only acceptance flow per the implemented backend.

## Scope

### In Scope
- Admin `/$locale/admin/invitations/`: list, create (email + actorId + capabilities), cancel, resend, copy-link
- Public `/$locale/invitations/accept`: password-only, one generic invalid-link state
- Required tasks: `src/api/generated` regen (`pnpm api:generate`) + `user-invitations.read/write` capability codes
- i18n en/es (voseo register), unit + e2e tests, hub/nav entries

### Out of Scope
- Email transport (copy-link; dev notifier only); profile-field capture at acceptance (backend accepts `{ password }` only); per-state invalid/expired/used screens (anti-enumeration); hospital picker (single workspace, display-only); self-registration

## Capabilities

### New Capabilities
- `invitation-management`: admin lifecycle UI — list, create, cancel, resend, copy-link; view gated by `user-invitations.read`, mutations by `.write`
- `invitation-acceptance`: public password-only accept — token search param, success member summary, single generic failure state, 429 handling

### Modified Capabilities
None — `openspec/specs/` is empty; no existing spec-level behavior changes.

## Approach

Follow the `users` feature shape (explore recommendation): regen client first; new `src/features/invitations/` with composite hooks, TanStack Form create dialog, AlertDialog confirmations, capability plumbing (`CAPABILITY_CODES`, `CAPABILITY_RULE_MAP` + `Invitation` CASL subject, `ROUTE_CAPABILITY_REQUIREMENTS`); admit the accept route in `isAuthRoutePath()`; AuthScreen-styled form.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/api/generated/` | Modified | Regen adds invitation endpoints |
| `src/api/invitations.ts`, `src/api/query-keys.ts` | New/Modified | Facade + `queryKeys.invitations.*` |
| `src/lib/capabilities.ts`, `src/server/auth.ts` | Modified | Cap codes + `Invitation` subject; accept route admitted |
| `src/features/invitations/`, `src/routes/$locale/admin/invitations/`, `src/routes/$locale/invitations/accept.tsx` | New | Screens, hooks, tests |
| `AdminHubPage.tsx`, `app-shell.tsx`, `src/i18n/locales/{en,es}/invitations.json` | Modified/New | Gated entries; copy |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| C1: anonymous password-only accept vs authenticated-session threat model | Med | Admin-side staff identity verification at create (S13, S15); acknowledged, not blocker |
| C2: generic invalid-link state forced by uniform `{"accepted":false}` | High (by design) | Single generic screen; no state-revealing API; recovery-route copy |
| Token leakage (listings/logs/query keys) | Low | Token only in create/resend responses; copy-link dialog |
| es register drift | Low | Follow existing es locale conventions |
| Seed/e2e grants lack new capability | Low | Update seeded admin grants in e2e setup |

## Rollback Plan

All changes are additive and capability-gated: revert the PR. Regen → revert `src/api/generated`. Cap codes/guard → removal hides the admin section (guard denies by default). Accept route → removal from `isAuthRoutePath()` re-protects it. No schema or data migration; invitations live server-side.

## Dependencies

- cynara-api invitation endpoints live (CYN-104); local OpenAPI spec current
- `pnpm api:generate` (openapi-ts toolchain)

## Success Criteria

- [ ] `pnpm api:check` green in the regen commit
- [ ] Admin lifecycle works with `.read`/`.write`; mutations denied without `.write`; resend invalidates prior link
- [ ] Accept route public; password-only POST → member summary or one generic failure state
- [ ] 429/errors surfaced via `describeApiError`; no token in listings/logs/query keys
- [ ] typecheck/lint/fmt/build pass; unit + e2e cover both surfaces