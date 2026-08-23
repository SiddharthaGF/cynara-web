/**
 * Neutral injection point for server-only request authentication.
 *
 * `cynaraFetch` (src/api/client-runtime.ts) runs in both environments, but
 * attaching the sealed session's bearer token is a server-side concern; a
 * static import of `@/server/api-proxy` from there would drag server modules
 * into the client bundle. The server entry registers the real implementation
 * at boot (see src/server.ts); on the client nothing registers, so requests
 * pass through untouched and reach the same-origin BFF instead.
 */
type AttachSessionAuth = (
  init: RequestInit | undefined,
) => Promise<RequestInit>;

let implementation: AttachSessionAuth | null = null;

/** Called once by the server entry to install the real implementation. */
export function registerAttachSessionAuth(impl: AttachSessionAuth): void {
  implementation = impl;
}

/** Resolves request init with session auth when running on the server. */
export async function attachSessionAuth(
  init: RequestInit | undefined,
): Promise<RequestInit> {
  if (!implementation) {
    return init ?? {};
  }
  return implementation(init);
}
