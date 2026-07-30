import { ApiError, isConcurrencyConflict } from '@/api/client.ts';

export type ConflictAction<T> = (rowVersion: number) => Promise<T>;

export interface WithConcurrencyRetryOptions<T> {
  /** The latest known `rowVersion` to send on retry. */
  refreshRowVersion: () => number;
  /** Action that performs the mutated request using the supplied rowVersion. */
  perform: ConflictAction<T>;
  /** Maximum number of retries after the first attempt. */
  maxRetries?: number;
  /**
   * Optional hook executed once per retry to allow the caller to merge pending
   * local edits with the refreshed resource. Throw to abort the retry and
   * surface the conflict to the editor.
   */
  onRetry?: (refreshedRowVersion: number) => void;
}

/**
 * Runs a mutating request, automatically refreshing the row version after a
 * `409 Conflict` / `412 Precondition Failed` response and retrying once.
 *
 * The retry intentionally runs at most once because autosave + editor state
 * need an explicit conflict surfacing beyond that. The caller is responsible
 * for any user-facing UI (e.g. the concurrency banner).
 */
export async function withConcurrencyRetry<T>(
  options: WithConcurrencyRetryOptions<T>,
): Promise<T> {
  const maxRetries = options.maxRetries ?? 1;
  let attempt = 0;
  let rowVersion = options.refreshRowVersion();

  /**
   * Sequential retries: each attempt depends on the previous one's conflict
   * outcome, so we cannot run them in parallel.
   */
  while (true) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      return await options.perform(rowVersion);
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        !isConcurrencyConflict(error.status) ||
        attempt >= maxRetries
      ) {
        throw error;
      }

      attempt += 1;
      options.onRetry?.(rowVersion);
      /* Caller is expected to have refreshed the resource as part of `onRetry`
       * (typically through React Query) so the rowVersion token reflects the
       * latest server snapshot before we retry. */
      rowVersion = options.refreshRowVersion();
    }
  }
}
