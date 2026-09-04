/**
 * Error-pattern matching for transient AI chat failures: `cynara-api` may
 * return a malformed/truncated LLM payload that succeeds on retry, so the
 * client retries once before surfacing the error.
 */
const TRANSIENT_AI_ERROR_PATTERNS: readonly RegExp[] = [
  /unexpected end of json/i,
  /is not valid json/i,
  /node must be of type/i,
  /json value could not be converted/i,
  /invalid json/i,
];

export function isTransientAiErrorMessage(message: string): boolean {
  return TRANSIENT_AI_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/** Sentinel when the upstream SSE closes without a schema-carrying `done`. */
export const EMPTY_AI_SCHEMA_MESSAGE = 'Empty AI schema payload.';

/**
 * Sentinel when the client safety timeout fires before a terminal SSE event —
 * aborting mid-schema used to leave a confident reply with no apply and no error.
 */
export const AI_STREAM_TIMEOUT_MESSAGE =
  'AI stream timed out before schema changes arrived.';

/**
 * Per-attempt cap; keep aligned with the backend `NetworkTimeout`
 * (`OPENAI_NETWORK_TIMEOUT_SECONDS`, default 10 min) so the client doesn't
 * give up while the server is still working.
 */
export const AI_STREAM_TIMEOUT_MS = 600_000;

/** When the assistant has been stuck in the `schema` phase for more than this,
 *  show a long-running progress hint so users know work is still happening. */
export const AI_SCHEMA_PHASE_LONG_MS = 60_000;

export function isRetryableAiErrorMessage(message: string): boolean {
  return (
    isTransientAiErrorMessage(message) ||
    message === EMPTY_AI_SCHEMA_MESSAGE ||
    message === AI_STREAM_TIMEOUT_MESSAGE
  );
}
