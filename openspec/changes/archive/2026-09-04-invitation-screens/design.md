# Design: Invitation Screens (CYN-109)

## Technical Approach

Ship the admin invitation lifecycle (`/$locale/admin/invitations/`) and the public password-only acceptance flow (`/$locale/invitations/accept`) following the `users` feature shape (explore Approach 1): regen the API client first, add `user-invitations.read/write` capability plumbing with a new `Invitation` CASL subject, build the admin surface on composite hooks + TanStack Form + AlertDialog confirmations, and render acceptance on `AuthScreen` with ONE generic invalid-link state. Maps to both delta specs.

## Architecture Decisions

| # | Decision | Alternatives | Rationale |
|---|----------|--------------|-----------|
| D1 | Regen `src/api/generated` as task 0; `api:check` green in regen commit | Hand-rolled fetchers | Raw wrappers break the `src/api` convention and keep `api:check` red (R3). |
| D2 | Admin CRUD via `src/api/invitations.ts` facade + `queryKeys.invitations` + composite hooks | Inline SDK calls | Mirrors `users.ts`/`useUsersDirectory`; keeps fetch/error/query-key logic out of components. |
| D3 | Acceptance via anonymous `createServerFn` in `src/server/invitation-acceptance.ts` (account-recovery pattern) | Client SDK call | Accept is anonymous; BFF proxy and `contractHeaders()` assume a session. |
| D4 | Capability plumbing: new `Invitation` subject; admin route requires `.read`; OR-in `Invitation` to hub requirement and `nav.administration` subjects | Separate nav group | Hub's "either read" pattern; mutations gate on `.write`. |
| D5 | Admit accept route in `isAuthRoutePath()`; no capability requirement | Separate bypass | Guard passes when no requirement is registered. |
| D6 | ONE generic invalid-link state for every `accepted:false`; 429 via `describeApiError`; submit disabled in flight | Per-state screens | Anti-enumeration (C2/R2); envelope byte-identical by construction. |
| D7 | Token only in dialog-local state from create/resend; never in query keys, list state, logs | — | R5: `InvitationView` has no token material. |
| D8 | `cancel` → `cancelled` badge; `revoked` display-only; no revoke action | Client revoke | Backend statuses authoritative; only cancel/resend endpoints exist. |
| D9 | Password hints mirror ASP.NET Identity defaults; server 400 authoritative | Full client policy | Policy violations return 400, surfaced, never dropped. |
| D10 | Profile snapshot = canonical v1 JSON string at create; hospital display-only | Capture profile at acceptance | Acceptance is password-only; hospital bound from `X-Hospital-Code`. |

## Data Flow

Acceptance sequence:

```
accept.tsx → validateSearch: no token → generic invalid state (no API call)
accept.tsx ─POST {password}─▶ server fn ─▶ POST /api/user-invitations/{token}/accept
  ◀─ {accepted:true,member} | {"accepted":false} | 429/400
  accepted:true → member summary; false → generic invalid state
  pending → submit disabled (double-submit guard)
```

Admin create/resend:

```
CreateDialog ─serialize profileSnapshot─▶ createInvitation ─▶ POST /api/user-invitations
  ◀─ 201 {invitation, token} ─ token → CopyLinkDialog (dialog-local state); invalidate list
ResendDialog ─▶ POST /{id}/resend ─▶ {invitation, token} (linkVersion+1, 72h reset)
  └─ prior token dies server-side; no duplicate row
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/api/generated/` | Modify | Regen |
| `src/api/invitations.ts` | Create | Facade for list/create/cancel/resend |
| `src/api/query-keys.ts` | Modify | `queryKeys.invitations.{all,list}` |
| `src/lib/capabilities.ts` | Modify | Cap codes + `Invitation` subject + guards |
| `src/server/auth.ts` | Modify | `isAuthRoutePath()` admits `invitations/accept` |
| `src/server/invitation-acceptance.ts` | Create | Anonymous accept server fn |
| `src/features/invitations/` | Create | Pages, workspace, status badge, create/cancel/resend dialogs, `CopyLinkDialog`, hooks, form, accept page |
| `src/routes/$locale/admin/invitations/index.tsx` | Create | Protected admin route |
| `src/routes/$locale/invitations/accept.tsx` | Create | Public route, `validateSearch` for `token` |
| `AdminHubPage.tsx`, `app-shell.tsx` | Modify | Invitations entry gated by `Invitation` read |
| `src/i18n/index.ts`, `locales/{en,es}/invitations.json` | Modify/Create | New namespace; es voseo register |
| `src/features/invitations/__tests__/`, `e2e/invitations.spec.ts` | Create | Unit + Playwright specs |
| `e2e/fixtures/capabilities.ts` | Modify | Add `user-invitations.*` to `FULL_CAPABILITIES` |

## Interfaces / Contracts

```ts
export type InvitationDto = Required<InvitationView>; // lifecycle metadata only — NO token
export type CreateInvitationResult = { invitation: InvitationDto; token: string };
export interface InvitationProfileSnapshot {
  actorId: string; capabilities: CapabilityCode[]; // catalog-gated
  profile?: { name: string; surname: string; phone?: string; language?: string };
}
```

`createInvitation(email, snapshot)` serializes the snapshot to JSON; `acceptInvitationServerFn({ token, password })` returns `{ accepted, member: MemberSummary | null }`. Snapshot follows canonical v1 (`additionalProperties:false`); validation errors surface via `describeApiError`, never dropped.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Facade mapping, query keys, badge matrix (6 statuses), capability gates, missing-token no-call, uniform failure, double-submit disable | vitest static-markup harness, i18n missing-key en/es |
| Integration | Create/cancel/resend invalidations; token absent from list/keys; 429 message | QueryClient hook tests |
| E2E | Admin lifecycle, accept success/failure, denied navigation | Playwright `grantCapabilities` |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary; URL routes only.

## Migration / Rollout

No data migration; additive and capability-gated; revert PR to roll back.

## Open Questions

- [ ] e2e seed path for a real invitation (UI create vs API fixture) at task planning.