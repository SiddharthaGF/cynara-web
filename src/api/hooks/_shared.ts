/**
 * Shared types for the typed React Query hooks under `@/api/hooks`.
 *
 * The TanStack Query v5 `onSuccess`/`onError`/`onSettled` callbacks are typed
 * with a 4-argument internal signature `(data, variables, onMutateResult,
 * context)`. Most call sites only care about `(data, variables)`. These
 * narrowed shapes keep the public hook options clean while still letting the
 * hook wrappers fan out to React Query.
 */
export type HookOnSuccess<TData, TVariables> = (
  data: TData,
  variables: TVariables,
) => void;

export type HookOnError<TError, TVariables> = (
  error: TError,
  variables: TVariables,
) => void;

export interface HookMutationOptions<TData, TError, TVariables> {
  onSuccess?: HookOnSuccess<TData, TVariables>;
  onError?: HookOnError<TError, TVariables>;
}

/**
 * Stable, serializable `staleTime` durations used across the resource hooks.
 */
export const STALE_TIMES = {
  fiveMinutes: 5 * 60_000,
  twoMinutes: 2 * 60_000,
  thirtySeconds: 30_000,
  fifteenSeconds: 15_000,
} as const;
