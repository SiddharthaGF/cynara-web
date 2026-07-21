# Cynara Web Agent Guide

## Project Type

This repository is a private frontend web application for Cynara, a configurable
clinical platform. It is built with React 19, TypeScript, Vite, and TanStack
Start/Router. TanStack Start keeps the application SSR-ready and uses file-based
routes. The browser client talks to `cynara-api` through `/api`.

The main product area is the clinical form designer. Treat form schemas, draft
models, validation, autosave, and API contracts as business-critical behavior.

## Commands

Use pnpm 11 (Node.js 22+ is expected):

```bash
pnpm dev
pnpm typecheck
pnpm lint:check
pnpm fmt:check
pnpm build
pnpm doctor
```

Run the narrowest relevant checks first, then run `pnpm typecheck` and
`pnpm build` for changes that affect routes, providers, APIs, or bundling. There
is currently no test script or test dependency in `package.json`; do not claim
tests were run when only static checks were executed.

## Source Layout

- `src/routes/`: TanStack file-based routes and route loaders/components.
- `src/features/forms/`: form catalog, designer UI, previews, draft model, and
  validation.
- `src/api/`: typed client functions for `cynara-api` and query keys.
- `src/components/`: application shell and reusable UI components.
- `src/components/ui/`: generated or library-style primitives; avoid changing
  these unless required.
- `src/lib/` and `src/hooks/`: shared utilities, theme, locale, query, and
  browser hooks.
- `src/i18n/`: i18next setup and locale resources.
- `src/routeTree.gen.ts`: generated TanStack route tree; do not edit manually.

Use the `@/*` alias for imports from `src`. Keep feature-specific behavior in
the owning feature directory instead of growing global utilities.

## Implementation Rules

- Keep TypeScript strictness intact. Do not introduce `any`, unchecked casts, or
  broad suppressions to make a change compile.
- Preserve TanStack Router route conventions and regenerate generated route
  files through the normal toolchain when needed.
- Keep API access in `src/api/`; components should not duplicate fetch, error,
  or query-key logic.
- Use React Query for server state and keep draft/editor state separate from
  cached server data.
- Preserve i18n. User-facing text belongs in the appropriate English and Spanish
  locale files, not inline in components.
- Follow the existing Tailwind/shadcn styling language and existing import
  conventions. Prefer small, focused components over new abstraction layers.
- Keep clinical schema validation aligned with the Cynara schema and rules
  contracts. Do not silently drop unknown fields or validation errors.
- Treat autosave, concurrency handling, AI streaming, and draft mutations as
  asynchronous workflows: handle cancellation, stale responses, errors, and
  cleanup explicitly.
- Do not overwrite or revert unrelated work already present in the working tree.

## Performance Work

Measure before changing code. Distinguish JavaScript bundle size, live heap,
DOM/layout cost, and network resources; a browser's reported memory number is
not automatically a bundle-size problem.

For client optimizations:

- Compare a production build before and after. Inspect chunk sizes and identify
  the importing route before removing or replacing a dependency.
- Prefer route-level or feature-level lazy loading for designer-only UI,
  previews, and AI chat rather than loading them on the catalog route.
- Keep the initial provider tree small. Do not add global context,
  subscriptions, or effects for state that belongs to one route or feature.
- Avoid retaining large form snapshots, chat transcripts, parsed schemas, or
  duplicated derived arrays longer than necessary.
- Do not add `useMemo`, `useCallback`, or memoized components mechanically. Use
  them when profiling or a clear render boundary shows they prevent meaningful
  work.
- Virtualize or limit rendering only when the actual form/chat data size
  justifies it; preserve keyboard navigation, focus, and accessibility.
- Keep streaming listeners, timers, event handlers, object URLs, and
  subscriptions cancellable and cleaned up on unmount.
- Verify behavior in both the catalog and designer routes, including
  locale/theme changes and narrow viewports.

## Validation Expectations

For UI or behavior changes, validate the affected route manually with the API
available at `http://localhost:3000`. For API, routing, providers, or build
changes, run:

```bash
pnpm typecheck
pnpm lint:check
pnpm fmt:check
pnpm build
```

For performance changes, record the measurement method, route, browser state,
and before/after result. Do not use development-mode memory or hot-reload
behavior as the only production performance conclusion.
