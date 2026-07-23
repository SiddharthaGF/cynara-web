/**
 * Error-pattern matching for transient AI chat failures.
 *
 * `cynara-api` occasionally returns a malformed or truncated LLM payload
 * for short prompts on the streaming endpoint. The provider usually lands
 * a clean response on the next invocation, so the client retries once and
 * surfaces the error only if the second attempt also fails.
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

/** Sentinel error used when the upstream SSE closes without a `done` payload
 *  carrying schema content. Mirrors the original parseDraft failure mode. */
export const EMPTY_AI_SCHEMA_MESSAGE = 'Empty AI schema payload.';

/**
 * Sentinel when the client safety timeout fires before a terminal SSE event.
 * Large authoring turns often finish the assistant text first and then spend
 * a long time emitting the schema patch — aborting that mid-flight used to
 * leave a confident reply with no draft apply and no error.
 */
export const AI_STREAM_TIMEOUT_MESSAGE =
  'AI stream timed out before schema changes arrived.';

/** Per-attempt cap. Schema generation for large forms routinely exceeds 60s. */
export const AI_STREAM_TIMEOUT_MS = 180_000;

export function isRetryableAiErrorMessage(message: string): boolean {
  return (
    isTransientAiErrorMessage(message) ||
    message === EMPTY_AI_SCHEMA_MESSAGE ||
    message === AI_STREAM_TIMEOUT_MESSAGE
  );
}
