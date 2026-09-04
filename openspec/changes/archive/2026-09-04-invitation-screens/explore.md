## Exploration: invitation-screens (CYN-109)

### Current State

The web app has no invitation surface today: `grep -i invitation` across `src/` returns
nothing. The backend invitation lifecycle API (CYN-104, merged PRs #56–#65 in
`SiddharthaGF/cynara-api`) is live and its OpenAPI contract now exposes
`/api/user-invitations`, but the frontend's generated client
(`src/api/generated/`) was last regenerated before those PRs and contains **no
invitation types — `pnpm api:check` would fail on drift today**.

**Auth/public-route pattern** (`src/routes/$locale/`): login/recovery/reset/logout are
public pages rendered with the shared `AuthScreen` layout component (centered Card,
brand link, title/description, footer), `useTranslation('auth')`, plain controlled
`useState` forms (no TanStack Form on auth pages), `Button` + `LoaderCircle`
`data-icon='inline-start'` spinner, `role="alert"` error blocks, and
anti-enumeration copy (recovery: *"If the account exists, a password reset message
has been sent."*). The `$locale` layout (`src/routes/$locale.tsx`) guards every
non-auth path via `beforeLoad` + `isAuthRoutePath()` (a hardcoded regex
`^\/(?:en|es)\/(?:login|logout|recovery|reset)` in `src/server/auth.ts`) and wraps the
Outlet in `CapabilityRouteGuard`. Anonymous server functions (no session) follow the
`src/server/account-recovery.ts` pattern (`createServerFn({ method: 'POST' })` with a
validator).

**i18n** (`src/i18n/locales/{en,es}`): one JSON namespace per feature (`auth`,
`users`, `hospital`, `api`, `common`, …). `api.json` holds `errors.*` consumed by
`describeApiError()`. es locale uses a consistent rioplatense voseo register — new
`invitations.json` keys must extend that register.

**API client** (`src/api/`): hey-api generated SDK in `generated/`; thin facades per
resource (`users.ts`, `encounters.ts`) wrap SDK calls with `contractHeaders()`
(`X-Hospital-Code`), `requireDto` promotion, and `ApiError` mapping; query keys via
`queryKeys.<resource>.all|list|detail` factories; composite hooks
(`useUsersDirectory.ts`, `useEncountersCatalog.ts`) pair `useQuery`/`useMutation`
with `describeApiError` + `isForbidden` (401/403) + `retry` + cache invalidation.

**UI primitives** (shadcn base-nova, `@shadcn/react`): alert, alert-dialog, badge,
button, card, checkbox, combobox, dialog, dropdown-menu, empty, field
(FieldGroup/Field/FieldLabel/FieldDescription), input, input-group, label,
native-select, radio-group, select, skeleton, sonner, spinner, switch, table, tabs,
textarea, toggle-group, tooltip, pagination. **Feature-standard forms use TanStack
Form** (`@tanstack/react-form`; see `EncounterCreateDialog.tsx`, `PatientEditForm.tsx`,
`WorkspaceSettingsPage.tsx`) with per-feature validation modules (e.g.
`encounterForm.ts`) and the shared `fieldErrorText` helper.

**Feature layout**: `src/features/<domain>/` with `__tests__/`. The `users` feature is
the direct analog for the admin invitation list: `UserListPage` (AppShell +
PageHeader + breadcrumbs), `UserDirectoryWorkspace` (search + results + full
states matrix), composite hooks, not-found/forbidden states. Admin sections are
surfaced through `AdminHubPage` (`HUB_SECTIONS` filtered by capability) and the
sidebar `nav.administration` group in `app-shell.tsx`.

**Routing/capabilities** (`src/lib/capabilities.ts`): `CAPABILITY_CODES` +
`CAPABILITY_RULE_MAP` (CASL action/subject) + `ROUTE_CAPABILITY_REQUIREMENTS`
(routeId → requirement) drive `CapabilityRouteGuard`. The invitation capability
codes `user-invitations.read` / `user-invitations.write` **do not exist in the
frontend** — they must be added with a new CASL subject (e.g. `Invitation`).

**Tests**: vitest in node env with static markup rendering
(`renderToStaticMarkup` harness, no jsdom/testing-library), mocking
`@tanstack/react-router` and feature hooks, i18n missing-key assertions, query-key
and facade tests; Playwright e2e (`e2e/`, chromium + auth setup via real UI login,
real Vite dev server + API).

### Backend contract (authoritative — read from local cynara-api, PRs #56–#65)

- `GET /api/user-invitations` (cap `user-invitations.read`) → `InvitationView[]`
- `POST /api/user-invitations` (cap `user-invitations.write`) body
  `{ email, profileSnapshot }` → 201 `{ invitation, token }`
- `POST /api/user-invitations/{id}/cancel` (cap write) → `InvitationView` (400/403/404/409)
- `POST /api/user-invitations/{id}/resend` (cap write) → `{ invitation, token }`
  (bumps `linkVersion`, regenerates token, restarts 72h window; previous link dies)
- `POST /api/user-invitations/{token}/accept` (**anonymous**) body `{ password }` →
  `{ accepted: true, member?: { user, hospital, actor, capabilities } }` or the
  byte-identical uniform failure `{"accepted":false}`; 429 rate limit; concurrency
  losers and unique-violation races fold into the envelope or a 400, never a 5xx.

`InvitationView`: `id, email, hospitalId, status, linkVersion, createdAt, issuedAt,
expiresAt` — **no token material in listings**. Statuses: `pending, accepted,
expired, revoked, already-used, cancelled`; lifecycle allows cancel/resend from
pending and expired; resend resets to pending; accepted re-attempts flip to
already-used.

**Create has no hospital field** — the backend binds `HospitalId` from the actor's
hospital context (`X-Hospital-Code`). The CYN-109 "single hospital" form field is
therefore display-only (current workspace), never a picker, and the server enforces
the one-hospital constraint. **Profile snapshot schema (canonical v1):**
`{ actorId: string 1..128 (professional identifier), capabilities: [code...],
profile?: { name, surname, phone, language } }`, `additionalProperties: false`,
capabilities gated by the closed `CapabilityCodes.All` catalog. **Acceptance is
password-only** — the schema explicitly states profile fields are "never captured at
acceptance". Existing active users get the direct-membership path (email proven by
link possession). **No GET exists to resolve a token** before POSTing; the token
appears only in create/resend responses, and the dev notifier logs expiry notices
only — so the admin UI must surface a copy-link affordance for the raw token.

### Affected Areas

- `src/api/generated/` — regenerated via `pnpm api:generate` (spec now has
  invitation endpoints; current client lacks them; `api:check` drifts)
- `src/api/invitations.ts` (new) — facade over generated SDK (list/create/cancel/
  resend/accept) following `users.ts`
- `src/api/query-keys.ts` — add `queryKeys.invitations.{all,list,detail}`
- `src/lib/capabilities.ts` — add `user-invitations.read/write` to
  `CAPABILITY_CODES` + `CAPABILITY_RULE_MAP` (new `Invitation` subject) +
  `ROUTE_CAPABILITY_REQUIREMENTS` for `/ $locale/admin/invitations/`
- `src/server/auth.ts` — extend `isAuthRoutePath()` regex to admit the public
  acceptance route (`invitations/accept`) so the auth guard does not bounce it
- `src/features/invitations/` (new) — admin list page, create dialog, cancel/resend
  confirmations, copy-link result, composite hooks, acceptance flow components
- `src/routes/$locale/admin/invitations/index.tsx` (new) — protected admin route
- `src/routes/$locale/invitations/accept.tsx` (new) — public acceptance route with
  `validateSearch` for `token`
- `src/features/hospital/AdminHubPage.tsx` + `src/components/app-shell.tsx` — add
  invitations section/nav entry gated by the new capability
- `src/i18n/locales/en/invitations.json` + `src/i18n/locales/es/invitations.json`
  (new) — es in the established voseo register
- `src/features/invitations/__tests__/` + `e2e/` — state/component tests (static
  markup harness) + Playwright specs

### Approaches

1. **Follow the `users` feature shape end-to-end (recommended)** — new
   `features/invitations/` with composite hooks, TanStack Form create dialog,
   AlertDialog confirmations, capability-gated admin route + hub section, public
   acceptance route styled on `AuthScreen`.
   - Pros: matches every established convention (facades, query keys, hooks,
     i18n, tests); smallest review surprise; reuses `users` harness patterns
   - Cons: larger change surface; requires client regen + capability plumbing
   - Effort: High (multi-screen change), but each piece is small and patterned

2. **Minimal admin-only slice first, acceptance later** — ship list/create/cancel/
   resend behind the new capability; defer the public acceptance route to a second
   PR.
   - Pros: smaller review; acceptance has a real scope tension (see Risks) that
     benefits from its own proposal
   - Cons: CYN-109 AC explicitly includes acceptance states; split change churn
   - Effort: Medium per slice

3. **Hand-rolled client calls instead of regenerating the SDK** — write raw fetch
   wrappers for the five invitation endpoints.
   - Pros: no generated-client diff
   - Cons: breaks the `src/api` convention, duplicates error mapping, and leaves
     `api:check` red — wrong tradeoff
   - Effort: Low initially, High to keep honest; rejected

### Recommendation

Approach 1, with the acceptance profile-fields scope resolved per the implemented
backend (see Risks/R1). Key design decisions to carry into proposal/spec/design:

- **Admin surface**: `/$locale/admin/invitations/` — table of `InvitationView` with
  status badges, issued/expires timestamps (date-fns), actions cancel (AlertDialog
  with consequence copy) and resend (AlertDialog + copy-link result dialog showing
  the new raw token; previous link invalidated). Create dialog: email, current
  workspace hospital (display-only), professional identifier (actorId, required),
  initial capabilities (multi-select gated to the same catalog), optional
  name/surname/phone/language. Capability gate: `user-invitations.read` on the
  route, `user-invitations.write` on mutations; add `Invitation` CASL subject and
  hub/nav entries.
- **Acceptance surface**: `/$locale/invitations/accept` (public; add to
  `isAuthRoutePath`), token via `validateSearch`. `AuthScreen`-styled single form:
  password (required, mirror ASP.NET Identity policy hints) → `POST accept` →
  success state (member summary: email, hospital, actorId, capabilities) or ONE
  generic failure state (uniform envelope). No per-state heuristics — the API
  cannot distinguish invalid/expired/already-used and CYN-109's own constraint
  forbids leaking link state.
- **Integration**: regenerate the client first (task 0); `api:check` must be green
  in the same commit as the regen.

### Risks

- **R1 (scope tension, needs user confirmation):** CYN-109/CYN-104 describe the
  acceptance flow as capturing "mandatory profile fields per profile incl.
  professional identifier when required", but the implemented backend accepts only
  `{ password }`; profile fields (actorId, capabilities, optional metadata) are
  captured at **admin create time** in the profile snapshot. The proposal should
  state this explicitly or the acceptance form would ask for fields the API
  ignores.
- **R2 (link-state screens):** expired/already-used/invalid links all return the
  identical `{"accepted":false}` envelope; distinct per-state screens are not
  derivable and would violate the anti-enumeration constraint. One safe generic
  failure state (with the recovery-route pattern of copy) is the correct
  interpretation of "safe generic states".
- **R3 (generated-client drift):** the checked-in `src/api/generated` lacks the
  invitation contract while the local spec has it — `pnpm api:check` is red until
  the client is regenerated. Regen must land with the change.
- **R4 (new capability codes):** `user-invitations.read/write` are absent from the
  frontend catalog; until added, no admin can see the section. E2E/seed grants may
  need updating so seeded admins hold the capability.
- **R5 (token handling):** the raw token exists only in create/resend responses —
  the admin copy-link flow is a required UX; tokens must never reach listings,
  logs, or query keys.
- **R6 (es register):** new `invitations.json` es keys must match the established
  voseo register used across existing es locale files.

### Ready for Proposal

Yes — exploration is complete and the backend contract is verified against the
local cynara-api source. Tell the user: (1) acceptance is password-only per the
implemented backend — profile fields belong to the admin create form; (2) the
acceptance route will render one generic invalid-link state (uniform failure
envelope, anti-enumeration), not per-state screens; (3) the change must include
regenerating the API client (`pnpm api:generate`) and adding the
`user-invitations.*` capability codes frontend-side.