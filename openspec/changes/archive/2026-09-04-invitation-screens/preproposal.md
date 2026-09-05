# SDD Pre-Proposal State — invitation-screens (CYN-109)

artifact: gentle-ai.sdd-preproposal/v1
revision: 3
date: 2026-09-04

change: invitation-screens
tracker: CYN-109

## Exploration

- outcome: done
- references:
  - openspec: `openspec/changes/invitation-screens/explore.md`
  - engram: topic `sdd/invitation-screens/explore` (observation #62, project `cynara-web`)

## Research

- requested: true
- requested source classes: `documentation`, `open-web`
- retry admission (revision 3): **GRANTED** — exact grants re-verified at launch;
  `documentation` = [context7], `open-web` = [webfetch, websearch]
- outcome: done
- evidence references:
  - openspec: `openspec/changes/invitation-screens/research.md` (revision 3, outcome done)
  - engram: topic `sdd/invitation-screens/research` (project `cynara-web`)

## Product decisions

- status: `confirmed` (by user)

1. Follow the implemented backend design: admin captures email + actorId + capabilities at
   invite time; acceptance is password-only (update CYN-109/CYN-99 wording to match).
2. One generic invalid-link state (uniform `{"accepted":false}` envelope, anti-enumeration).
3. Client regeneration (`src/api/generated`) + `user-invitations.read/write` capability codes
   are required in-scope tasks.
4. Research lane selected: retry after runtime fix (this launch) — executed.

## proposal_ready

**true** — research done with source-backed claims (17 sources, all three questions
answered); product decisions confirmed by the user.