# Tasks: Invitation Screens (CYN-109)

## Review Workload Forecast

Estimated changed lines: ~2,000 authored

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Work Units

| Unit | Goal | Likely PR | Focused test | Runtime harness | Rollback |
|------|------|-----------|--------------|-----------------|---------|
| 1 | Regen + caps + facade + keys | PR 1 | `pnpm api:check && pnpm typecheck && pnpm test` | N/A (no UI) | Revert regen + `src/lib/capabilities.ts` + facade + keys |
| 2 | Admin list + hub/nav + i18n | PR 2 | `pnpm test` + e2e spec | `pnpm dev` + stubs | Remove admin route + list; hub/nav revert hides entry |
| 3 | Create/cancel/resend dialogs | PR 3 | `pnpm test` + e2e mutations | `pnpm dev` + stubs | Remove dialogs + hooks; `.write` gate denies |
| 4 | Acceptance flow + server fn | PR 4 | `pnpm test` + e2e accept | `pnpm dev` + stub | Remove accept route/page + server fn; revert `auth.ts` |

## Task 0: Client Regen

- [x] 0.1 Run `pnpm api:generate`; `src/api/generated/` invitation endpoints
- [x] 0.2 Commit regen alone; `pnpm api:check` green

## Phase 1: Foundation

- [x] 1.1 `src/lib/capabilities.ts`: `user-invitations.*` codes, `Invitation` subject, rule-map, admin/invitations route requirement, OR-in `Invitation` to admin hub
- [x] 1.2 `src/api/invitations.ts`: facade + list/create/cancel/resend
- [x] 1.3 `src/api/query-keys.ts`: `queryKeys.invitations.{all,list}`

## Phase 2: Admin Management UI

- [x] 2.1 `src/features/invitations/`: list page/workspace + `InvitationView` — 6-status badge, timestamps, no token, `revoked` display-only
- [x] 2.2 Create dialog (TanStack Form): email + actorId + catalog-gated caps, hospital display-only; 201 token → `CopyLinkDialog`; errors via `describeApiError`
- [x] 2.3 Cancel AlertDialog (pending/expired) → `cancelled` badge; row persists
- [x] 2.4 Resend AlertDialog (pending/expired) → new token via `CopyLinkDialog`; `linkVersion`+1
- [x] 2.5 Hooks `useInvitationsList` and `useInvitationMutations`; invalidate on mutations
- [x] 2.6 `src/routes/$locale/admin/invitations/index.tsx` + `AdminHubPage.tsx` + `app-shell.tsx`: `Invitation` OR-in hub + `nav.administration`
- [x] 2.7 `src/i18n/locales/{en,es}/invitations.json` (admin, voseo) + `src/i18n/index.ts` ns

## Phase 3: Acceptance Flow

- [x] 3.1 `src/routes/$locale/invitations/accept.tsx`: `validateSearch` token; missing → generic state, no API call
- [x] 3.2 AuthScreen form: `{ password }` only, policy hints, required
- [x] 3.3 Success: member summary (email, hospital, actorId, caps)
- [x] 3.4 ONE generic invalid state for every `accepted:false` (anti-enumeration)
- [x] 3.5 429 via `describeApiError`; submit disabled in flight
- [x] 3.6 `src/server/invitation-acceptance.ts`: anonymous `createServerFn`, `{token,password}`, NO `contractHeaders()`; admit in `src/server/auth.ts`
- [x] 3.7 Accept copy in `{en,es}/invitations.json` (voseo)

## Phase 4: Tests

- [x] 4.1 `src/features/invitations/__tests__/` harness: badge matrix, capability gates, missing-token no-call, uniform failure, double-submit, i18n missing-key en/es
- [x] 4.2 Unit: facade mapping, invalidation, token absent from keys/list
- [x] 4.3 Unit: accept server fn validator (missing token/password)
- [x] 4.4 `e2e/fixtures/capabilities.ts`: add `user-invitations.*`; create `e2e/fixtures/invitations.ts` stubs (seed resolved: API fixtures)
- [x] 4.5 `e2e/invitations.spec.ts`: admin list/create/cancel/resend, accept success/failure/429, denied nav without `.read`

## Phase 5: Verification

- [x] 5.1 `pnpm typecheck` + `pnpm lint:check` + `pnpm fmt:check` + `pnpm build`
- [x] 5.2 Smoke: catalog/designer, locale/theme, narrow viewport