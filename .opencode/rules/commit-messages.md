---
keywords:
  - 'commit'
  - 'commits'
  - 'git commit'
  - 'conventional commits'
  - 'push'
---

# Commit Message Rules

All commits MUST follow Conventional Commits format:

```
<type>(<scope>): <description>
```

## Types

- `feat` — new feature or capability
- `fix` — bug fix
- `refactor` — code restructuring without behavior change
- `chore` — tooling, config, dependencies, formatting
- `docs` — documentation only
- `style` — whitespace, formatting, missing semicolons (no logic change)
- `perf` — performance improvement
- `test` — adding or updating tests
- `ci` — CI/CD configuration
- `build` — build system or external dependencies

## Scopes (project-specific)

- `web` — application shell, routing, general UI
- `forms` — form designer, catalog, schema, validation, draft model
- `api` — API client, query keys, typed fetch logic
- `ui` — shared UI components, shadcn primitives
- `i18n` — locale files, i18next config
- `config` — tooling config (vite, tsconfig, eslint, opencode, etc.)
- `schema` — clinical schema, rules, tipos, condiciones
- `ai` — AI chat, streaming, prompt handling

## Rules

1. Use **lowercase** for the description (except proper nouns).
2. Use **imperative mood** in the description ("add feature", not "added
   feature").
3. Keep the description under **72 characters**.
4. Do NOT end the description with a period.
5. Scope is optional but recommended when the change is feature-localized.
6. A body and footer are allowed but not required. Wrap the body at 72
   characters.
7. Reference issue IDs in the footer: `Closes CYN-123` or `Refs CYN-456`.

## Examples

```
feat(forms): add conditional field rendering
fix(api): handle 429 rate-limit responses gracefully
chore(config): update vite to v8
refactor(ui): extract form preview into separate component
docs: update AGENTS.md with commit conventions
```

## Anti-patterns (DO NOT)

- `Fixed bug` — not imperative, no type
- `update stuff` — vague, no type or scope
- `FEAT: Added new form designer` — wrong case, wrong tense
- `feat(forms): Added new form designer.` — wrong tense, trailing period
