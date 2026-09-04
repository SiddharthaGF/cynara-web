/**
 * Neutral injection point for server-only request auth: `cynaraFetch` runs in
 * both environments, but attaching the sealed session's bearer is server-side;
 * a static import from there would drag server modules into the client bundle.
 * The server entry registers the implementation at boot; clients pass through.
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
