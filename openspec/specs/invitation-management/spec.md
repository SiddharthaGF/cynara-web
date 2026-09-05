# Invitation Management Specification

## Purpose

Admin lifecycle surface at `/$locale/admin/invitations/`: list, create, cancel, resend, copy-link. View gated by `user-invitations.read`; mutations by `user-invitations.write`. Backed by `/api/user-invitations` (CYN-104). NEW capability — no prior spec.

Prerequisite: regenerate `src/api/generated` (`pnpm api:generate`) — `api:check` must be green in the regen commit; add `user-invitations.read/write` to the frontend catalog.

## Requirements

### Requirement: Capability-gated access

Route MUST require `user-invitations.read`; create/cancel/resend MUST require `user-invitations.write`. Without `.read`, forbidden state renders and hub/nav entries are absent. Without `.write`, mutation controls disable/hide and send no requests.

#### Scenario: Read-only admin blocked from mutations

- GIVEN user holding `.read` but not `.write`
- WHEN user opens route and attempts a mutation
- THEN controls are disabled and no request is sent

#### Scenario: Admin without read capability

- GIVEN user without `user-invitations.read`
- WHEN user navigates to `/$locale/admin/invitations/`
- THEN forbidden state renders and hub/nav entries are absent

### Requirement: Invitation listing with status rendering

List MUST fetch `GET /api/user-invitations` (newest-first) and render `InvitationView` rows: email, status badge, issued/expires timestamps. Every status (pending, accepted, expired, revoked, cancelled, already-used) MUST render a distinct badge; `revoked`/`cancelled` rows MUST stay visible — never deleted. Listing MUST NOT show token material.

#### Scenario: Full status matrix renders

- GIVEN invitations in every backend status
- WHEN the list loads
- THEN each row shows matching badge and timestamps, no token data

#### Scenario: Terminal rows persist

- GIVEN an invitation with status `revoked` or `cancelled`
- WHEN the list renders
- THEN the row remains with its badge and no delete affordance

### Requirement: Create invitation

Dialog MUST collect email (required), `actorId` (required, 1–128 chars), capabilities (required, catalog-gated), optional profile metadata. Hospital field MUST be display-only. Submit MUST POST create and surface the raw token via copy-link. Failures (taken actorId, existing membership, forbidden) MUST surface via `describeApiError` without dropping validation errors.

#### Scenario: Successful creation with copy-link

- GIVEN admin with `.write` submits valid email, actorId, capabilities
- WHEN API returns 201 `{ invitation, token }`
- THEN list refreshes with pending row and copy-link result shows the token

#### Scenario: Creation rejected

- GIVEN taken actorId or existing membership
- WHEN create returns 400
- THEN dialog stays open showing the API error, no token retained

### Requirement: Cancel invitation

Cancel MUST require AlertDialog confirmation, apply to pending/expired only, POST cancel, and render the row as `cancelled` without deleting it.

#### Scenario: Pending invitation cancelled

- GIVEN a pending invitation and admin with `.write`
- WHEN admin confirms cancel
- THEN row updates to `cancelled` and remains listed

#### Scenario: No cancel on terminal states

- GIVEN status `accepted`, `already-used`, `revoked`, or `cancelled`
- WHEN the list renders
- THEN no cancel affordance is offered

### Requirement: Resend invitation

Resend MUST require confirmation, MUST be offered for pending/expired, MUST POST resend, and MUST surface the new token via copy-link. Resend MUST supersede the previous link (bumps `linkVersion`, restarts 72-hour window); prior link MUST become unusable; no duplicate row MUST be created.

#### Scenario: Resend invalidates previous link

- GIVEN a pending invitation whose link was shared
- WHEN admin confirms resend and copies the new token
- THEN row shows new `linkVersion` and `expiresAt`; prior token invalid

### Requirement: Token hygiene

Raw token MUST appear only in create/resend responses and copy-link results — never in list state, query keys, or logs.

#### Scenario: Token absent from listings and cache

- GIVEN a list of invitations with issued tokens
- WHEN the list renders and query keys are inspected
- THEN no token string appears in table, query keys, or logs

### Requirement: Localized admin copy

User-facing copy MUST live in `en`/`es` invitation locale files; `es` MUST follow the voseo register. Components MUST NOT hardcode user-facing strings.

#### Scenario: Spanish rendering complete

- GIVEN the invitations feature rendered in Spanish
- WHEN locale keys are asserted
- THEN no missing-key or untranslated string is reported