# Invitation Acceptance Specification

## Purpose

Public, anonymous password-only acceptance flow at `/$locale/invitations/accept` for one-time invitation links. The route consumes the uniform `{"accepted":false}` envelope from `POST /api/user-invitations/{token}/accept` and renders ONE generic invalid-link state by design (anti-enumeration). NEW capability — `openspec/specs/` held no prior spec.

## Requirements

### Requirement: Public route with token search param

The accept route MUST be reachable anonymously (admitted in `isAuthRoutePath()`), MUST read the token from the URL search param via `validateSearch`, and MUST render an `AuthScreen`-styled form. A missing token MUST render the generic invalid-link state without calling the API.

#### Scenario: Valid link renders the form

- GIVEN an anonymous visitor with an accept URL containing a token
- WHEN the route loads
- THEN the password setup form renders with no authentication required

#### Scenario: Link without token

- GIVEN an anonymous visitor with an accept URL that has no token
- WHEN the route loads
- THEN the generic invalid-link state renders and no API call is made

### Requirement: Password-only acceptance

The form MUST submit `{ password }` only and MUST NOT collect profile fields (actorId, capabilities, metadata) — those were captured at admin create time. The password MUST be required and MUST follow the application's password policy hints. An `accepted: true` response MUST render the member summary from the response payload (email, hospital, actorId, granted capabilities).

#### Scenario: Successful acceptance shows member summary

- GIVEN a valid, unexpired invitation and a visitor entering a policy-compliant password
- WHEN the form submits and the API returns `{ accepted: true, member }`
- THEN the success state renders the member summary from the response

#### Scenario: Acceptance without password

- GIVEN a visitor submitting the form empty
- WHEN validation runs
- THEN the form shows a required-field error and no request is sent

### Requirement: Uniform invalid-link state

Any response with `accepted: false` (unknown, expired, revoked, cancelled, already-used, or concurrency-lost tokens) MUST render ONE generic invalid-link state with recovery-route copy ("request a new invitation from the administrator"). The UI MUST NOT branch on per-state heuristics or reveal link validity.

#### Scenario: Expired link shows the generic state

- GIVEN a visitor with an expired-token link
- WHEN accept returns `{"accepted":false}`
- THEN the generic invalid-link state renders, byte-identical in presentation to any other failure

#### Scenario: Already-used link shows the same state

- GIVEN a visitor with an already-used token
- WHEN accept returns `{"accepted":false}`
- THEN the same generic state renders with no indication the link was previously valid

### Requirement: Rate-limit and error handling

A 429 response MUST surface a rate-limit message via `describeApiError` and MUST NOT reveal token validity. Other HTTP errors MUST surface via `describeApiError`. The submit control MUST remain disabled while the request is in flight to prevent duplicate submissions.

#### Scenario: Rate limited

- GIVEN a visitor whose IP exceeded the accept rate limit
- WHEN the API returns 429
- THEN the rate-limit message renders and no token-state hint is shown

#### Scenario: Double submit prevented

- GIVEN a visitor who submits once
- WHEN the request is in flight
- THEN the submit control stays disabled until the response resolves

### Requirement: Localized acceptance copy

All user-facing acceptance copy MUST live in the `en` and `es` invitation locale files; the `es` locale MUST follow the established voseo register. Components MUST NOT contain hardcoded user-facing strings.

#### Scenario: Spanish acceptance flow

- GIVEN the accept route rendered with the `es` locale
- WHEN the form, success, and invalid-link states are displayed
- THEN every string comes from the es invitation locale in the voseo register