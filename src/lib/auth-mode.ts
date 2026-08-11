import { createIsomorphicFn } from '@tanstack/react-start';

export type AuthMode = 'spike' | 'off';

/**
 * Normalizes the raw AUTH_MODE value. Anything that is not exactly "spike"
 * is treated as "off" so production behavior is the default.
 */
export function normalizeAuthMode(value: string | undefined): AuthMode {
  return value?.trim() === 'spike' ? 'spike' : 'off';
}

function resolveAuthModeServer(): AuthMode {
  const cloudflareEnv = (
    globalThis as { Cloudflare?: { env?: { AUTH_MODE?: string } } }
  ).Cloudflare?.env?.AUTH_MODE;
  if (cloudflareEnv !== undefined) {
    return normalizeAuthMode(cloudflareEnv);
  }
  const nodeEnv = (globalThis as { process?: { env?: { AUTH_MODE?: string } } })
    .process?.env?.AUTH_MODE;
  return normalizeAuthMode(nodeEnv);
}

function resolveAuthModeClient(): AuthMode {
  const raw: string | undefined = import.meta.env.VITE_AUTH_MODE;
  return normalizeAuthMode(raw);
}

const resolveAuthMode = createIsomorphicFn()
  .server(resolveAuthModeServer)
  .client(resolveAuthModeClient);

/**
 * True when the disposable CYN-96 auth spike is enabled. The server runtime
 * reads AUTH_MODE from Cloudflare env / process env; the client bundle reads
 * the mirrored VITE_AUTH_MODE. Both default to "off".
 */
export function isAuthSpikeMode(): boolean {
  return resolveAuthMode() === 'spike';
}
