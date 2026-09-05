# SDD Research — invitation-screens (CYN-109)

artifact: gentle-ai.sdd-research/v1
revision: 3
outcome: done
date: 2026-09-04

## Retry context

- Revision 1 and revision 2 (same date) were blocked: the runtime granted empty tool sets
  for both requested source classes (`documentation`, `open-web`). No sources were accessed
  and no claims were produced in those revisions.
- This launch (revision 3) re-verifies admission per-execution before any source access;
  both classes carry live tools. Research completed with source-backed claims.

## Research questions

1. **Admin invitation management UX**: established patterns for invitation management
   surfaces (create with email + role/profile + initial capabilities, cancel, resend
   invalidating previous link, copy-link affordance when no email transport, state rendering
   pending/accepted/expired/revoked/cancelled/already-used)?
2. **Public acceptance flow UX**: established patterns for one-time email-invitation
   acceptance (single-step vs multi-step, password-only setup vs collecting profile fields at
   acceptance, credential policy UX, generic invalid/expired/used link state that avoids
   leaking link validity)?
3. **Clinical/health onboarding**: in clinical/health platforms, where is mandatory
   profile/identifier data captured in onboarding — at invitation/administrative creation time
   or at self-acceptance — and what are the UX/validation consequences of each choice?

## Admission (re-verified at this launch)

- requested source classes: `documentation`, `open-web`
- observed exact runtime grants (`gentle-ai.sdd-research-capability/v1`):
  - `documentation`: `[context7]` (tools: context7_resolve-library-id, context7_query-docs)
  - `open-web`: `[webfetch, websearch]`
- admission result: **GRANTED** — both requested classes carry live tools. Evidence
  capability was exercised (context7 + websearch + webfetch), not inferred from Bash, generic
  MCP, persistence access, or filenames.

## Sources

| ID | Source | Type | Freshness |
|---|---|---|---|
| S1 | UX Patterns Guide — "Invite user UX Pattern" (uxpatternsguide.com/patterns/invite-user/) | open-web | accessed 2026-09-04, undated |
| S2 | JustFigma — "Member Invitations & Pending Invites UI" (justfigma.com/designing-member-invitations-and-pending-invites-ui-in-figma/) | open-web | 2026-07-13 |
| S3 | ShellHub PR #5585 — invitations management UI (github.com/shellhub-io/shellhub/pull/5585) | open-web | 2025-12-02 |
| S4 | AgentPlaybook — "invitation-implementation" (github.com/taehwandev/AgentPlaybook/blob/main/product-patterns/invitation-implementation.md) | open-web | accessed 2026-09-04, undated |
| S5 | Clerk docs — invitations API (clerk.com via context7 /clerk/clerk-docs) | documentation | current, accessed 2026-09-04 |
| S6 | Secure Patterns — "Designing a Safe Team Invitation Flow" (newsletter.securepatterns.dev/p/designing-a-safe-team-invitation-flow) | open-web | 2026-05-14 |
| S7 | SeptemCore docs — Security Flows (docs.septemcore.com/primitives/auth/security-flows) | open-web | accessed 2026-09-04, undated |
| S8 | Every App — accept-invitation.tsx route (github.com/every-app/every-app/blob/32c2bf45/apps/every-app-gateway/src/routes/accept-invitation.tsx) | open-web | accessed 2026-09-04 |
| S9 | OneTimeSecret — PR #2898 atomic signup+accept; issue #2394 magic-link signup (github.com/onetimesecret/onetimesecret) | open-web | 2025-02-01 gap analysis |
| S10 | OWASP Forgot Password Cheat Sheet (cheatsheetseries.owasp.org, Forgot_Password_Cheat_Sheet.md) | open-web | maintained, accessed 2026-09-04 |
| S11 | EncryptCodec — "Secure Password Reset Tokens" (encryptcodec.com/blog/secure-password-reset-flow-tokens-expiry-and-best-practices) | open-web | 2026-03-30 |
| S12 | TheAuth docs — One-Time Tokens (docs.theauth.dev/one-time-tokens) | open-web | accessed 2026-09-04, undated |
| S13 | NHS England — Good Practice Guidance: identity verification for patient online services (england.nhs.uk/wp-content/uploads/2015/03/identity-verification.pdf) | open-web | 2015-03 (standing guidance; note age) |
| S14 | Avon Health docs — Patient Registration (guides.avonhealth.com/docs/patient-registration) | open-web | accessed 2026-09-04, undated |
| S15 | Oracle Health Patient Portal — release notes: Patient Intake and Check-in (docs.oracle.com/en/industries/health/health-patient-portal/pp-release-notes/patient-intake-check.html) | open-web | 2025-06-13 |
| S16 | Cerner/HealtheLife — Patient Portal Self-Enrollment (tclmh.org/images/Patient%20Portal%20Self%20Enrollment.pdf) | open-web | accessed 2026-09-04, undated |
| S17 | NHI Management Group — patient identity proofing (nhimg.org: "patient-access-identity-is-the-first-control-in-care-journeys", glossary/patient-identity-proofing) | open-web | 2026-06 |

## Validated claims

### Q1 — Admin invitation management UX

- **Q1-C1** — The invitation surface is an access-granting workflow, not an account-creation
  form: it must preview recipient identity, role/scope, and consequences before send, and
  produce a trackable pending record rather than implying immediate membership. Keep the
  lifecycle separate from account creation and profile setup. (S1)
- **Q1-C2** — A pending-invitations list is table-shaped and required: email, role, status
  badge, sent date, inviter, expiry; with status filters (All/Pending/Expired) and per-row
  actions resend/revoke/copy link; expired rows remain visible for audit instead of being
  deleted. (S2, S3)
- **Q1-C3** — Status sets across established products are pending/accepted/expired/revoked/
  cancelled (plus rejected/already-used variants); Cynara's set (pending, accepted, expired,
  revoked, cancelled, already-used) is within this family — already-used is the "second
  attempt after accept" terminal state that S6/S12 also recognize. (S2, S3, S4, S5, S12)
- **Q1-C4** — Actions are status-conditional: edit/cancel only while pending, resend only for
  pending/expired/cancelled, with disabled-state tooltips explaining why; revoke invalidates
  the link immediately and renders Revoked (never deletes the row). (S2, S3)
- **Q1-C5** — Resend invalidating the previous link is an established, safer choice: reissue
  supersedes the prior pending row (old token dies, new token + expiry), and products
  explicitly document "resend with new token is safer; document whether old links die on
  resend." Cynara's resend (bumps linkVersion, regenerates token, restarts 72h window)
  matches the supersede pattern. (S4, S6, S2)
- **Q1-C6** — Copy-link affordance is a standard row action for invite delivery (toast "Link
  copied"; same token until expiry) — the required pattern when there is no email transport.
  (S2)
- **Q1-C7** — Create/resend/revoke each need their own authorization; rate limiting on create
  and resend; raw token never stored or listed — only its hash — and listings expose no token
  material. Cynara's capability split (user-invitations.read on list, .write on mutations)
  matches. (S4, S6, S12)
- **Q1-C8** — Anti-enumeration extends to the admin surface: duplicate/revoked/expired are
  shown as invitation states, membership existence is not leaked across boundaries, and
  duplicate-send is prevented by surfacing the existing pending row. (S1, S4)

### Q2 — Public acceptance flow UX

- **Q2-C1** — A single generic failure response for any failed accept (unknown/expired/
  revoked/used) is the established secure pattern: "Return the same response (identical
  status, body shape, and response time within normal jitter) for any failed accept … so the
  endpoint does not become an oracle for invitation state." The uniform `{"accepted":false}`
  envelope is exactly this. (S6)
- **Q2-C2** — Generic user-facing copy for the invalid/expired/used link is standard
  ("Invalid Invitation — this invitation link is invalid or missing a token. Please request a
  new invitation from the administrator"; "link is invalid or expired" prevents enumeration),
  usually paired with a recovery-route prompt to contact the inviter/admin. (S8, S10, S11)
- **Q2-C3** — Single-step password-only acceptance is an established accept shape: the accept
  page renders a password (+ confirm) form directly ("Complete your account setup by creating
  a password", minLength 8), a success state, then sign-in. This matches Cynara's
  password-only accept. (S8, S7)
- **Q2-C4** — Where the API can discriminate states, products render per-state accept pages
  (valid → form; expired → "request new invite"; revoked → same as expired; already member →
  redirect) — but that requires a state-revealing endpoint. With a uniform envelope,
  per-state screens are not derivable and would leak link validity; the generic state is the
  correct, safe rendering. (S2, S9, S6)
- **Q2-C5** — Credential policy UX: password rules must be consistent with the rest of the
  app; confirm-by-typing-twice is recommended; OWASP: apply the same password policy used
  elsewhere in the application. (S10, S8)
- **Q2-C6** — Rate limiting on anonymous token endpoints is standard (e.g., 10 req/10 min per
  IP on invite endpoints; 5 req/15 min reset analog); Cynara's 429 on accept matches. (S9,
  S10, S11)
- **Q2-C7** — Token hygiene is universal: 256-bit CSPRNG token, hash at rest, single-use
  atomic consume, invalidation of prior tokens on reissue. Cynara's raw token appearing only
  in create/resend responses aligns. (S6, S7, S11, S12)
- **Q2-C8** — Link-as-email-proof is a documented controversy: S6 requires an authenticated
  session with independently verified identity at accept and classifies click-to-provision
  (link click auto-creates account) as a high-risk "identity binding" failure; S7/S8/S14
  accept the link + password setup as sufficient proof for org invitations. Cynara sits in
  the second group, with a mitigating factor: in the clinical model (Q3), identity is
  verified by the admin at create time before the invitation exists. Flag for the proposal as
  acknowledged risk, not a blocker.

### Q3 — Clinical/health onboarding

- **Q3-C1** — In clinical platforms, identity/identifier verification precedes the
  invitation: NHS guidance requires practice staff to verify identity (vouching or document
  presentation) and states the account "may be activated and credentials issued only when the
  identity verification process has been completed" — identity is established by the
  organization, not by the self-accepting user. (S13)
- **Q3-C2** — The admin-create + invite-email model is a first-class clinical onboarding
  path: EMR staff create the account capturing profile/identifier fields (name, MRN, email,
  DOB, medical centers) and optionally send an invite email that prompts only password setup
  (+ intake). Self-registration exists as the alternative but collects its own profile fields
  at signup — it does not move identifier capture into a password-only accept. (S14)
- **Q3-C3** — Portal invitations are gated on prior identity proofing: invitation to create a
  portal account "can be performed only on established patients that have been seen in office
  (patients who have met the threshold of identity proofing)"; demographic data is passed
  from the registration record into enrollment rather than re-collected. (S15)
- **Q3-C4** — Self-service acceptance in clinical settings carries a heavy identity-
  verification burden (name/DOB plus email-or-SSN match against the EHR), is restricted to
  existing patients, and falls back to "contact the organization for an invitation" when no
  match exists — evidence that self-acceptance is the awkward path for identity-bearing
  records. (S16)
- **Q3-C5** — Industry guidance frames patient identity proofing as a pre-trust control: weak
  self-reported first match cascades into duplicate records and safety errors; high-assurance
  verification at first touchpoint is preferred over repeated self-reporting at the front
  door. Capturing the professional identifier (actorId) and capabilities at admin-create time
  — staff-verified — matches this model; collecting them from the self-accepting user would be
  the lower-assurance path. (S17)
- **Q3-C6** — Consequence summary: capturing identifiers at invitation/administrative
  creation time keeps acceptance minimal (password-only), preserves a single verified identity
  source, and avoids self-reported authoritative data; the cost is that admin entry must be
  complete and accurate at create (no post-acceptance correction loop in the flow), which the
  create-form design (required actorId + capabilities, optional profile metadata) already
  reflects. (S13, S14, S17)

## Contradictions, uncertainty, freshness

- **C1 (accept identity binding)** — S6 (securepatterns) treats anonymous accept + auto-
  account as a high-risk "click-to-provision" pattern and mandates an authenticated session
  with independently verified email at accept; S7/S8/S14 accept link possession + password
  setup as sufficient for org invites. Cynara follows the latter, mitigated by admin-side
  identity verification at create (S13, S15). Not a blocker; document in the proposal.
- **C2 (state discrimination)** — Products with state-revealing endpoints (S2, S9) render
  per-state failure screens; Cynara's uniform envelope deliberately forbids this (anti-
  enumeration). The generic state is the correct choice given the backend contract (S6, S10,
  S11).
- **C3 (status modeling)** — Expired is derived-at-read-time in some models and stored in
  others (Cynara stores it as a status); accepted re-attempts flip to already-used, which S6/
  S12 describe as "second attempt returns the same generic error" / TOKEN_ALREADY_USED.
  Cosmetic divergence, no UX consequence.
- **Freshness** — S13 (NHS, 2015-03) is the standing published guidance; treat as a stable
  baseline, not current-state evidence. All other sources accessed 2026-09-04; dated sources
  range 2025-02 to 2026-07. No source contradicts the backend contract verified from
  cynara-api source.

## Product choices

Confirmed by the user (recorded as confirmed in preproposal state; evidence cross-references
noted):

1. **Follow the implemented backend design**: admin captures email + actorId + capabilities
   at invite time; acceptance is password-only (update CYN-109/CYN-99 wording to match). —
   supported by Q3-C2/C3/C5, Q2-C3.
2. **One generic invalid-link state** (uniform `{"accepted":false}` envelope, anti-
   enumeration). — supported by Q2-C1/C2/C4.
3. **Client regeneration** (`src/api/generated`) + `user-invitations.read/write` capability
   codes are required in-scope tasks. — contract requirement, orthogonal to evidence.
4. **Research lane selected**: retry after runtime fix (this launch) — executed; admission
   granted.

## Persistence

- store: hybrid (openspec + engram), identical bytes
- openspec: `openspec/changes/invitation-screens/research.md` (revision 3, outcome done)
- engram: topic `sdd/invitation-screens/research` (project `cynara-web`, capture_prompt false)
- preproposal state updated in both stores (`openspec/changes/invitation-screens/preproposal.md`,
  engram topic `sdd/invitation-screens/preproposal`): decisions confirmed, proposal_ready true.

## Next step

Proposal readiness: **ready**. Research questions answered with source-backed claims (17
sources); product decisions confirmed by the user. Next: orchestrator proceeds to proposal
(sdd-propose), carrying the confirmed decisions and the C1/C2 nuances.