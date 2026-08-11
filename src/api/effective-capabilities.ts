import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getMyCapabilities,
  type MeCapabilitiesResponse as MeCapabilitiesResponseContract,
} from '@/api/generated';
import { isAuthSpikeMode } from '@/lib/auth-mode.ts';
import { getMe } from '@/server/auth.ts';

/**
 * Effective capability set for the current actor within the resolved hospital.
 * Derived from the generated contract type with fields promoted to required.
 *
 * CYN-96 spike mode routes the query through the BFF getMe server function so
 * capabilities come from the authenticated identity (/api/me through the
 * sealed session) instead of the static headers. AUTH_MODE=off keeps the
 * generated-client path exactly as before.
 */
export type EffectiveCapabilitiesDto = Required<MeCapabilitiesResponseContract>;

export async function getEffectiveCapabilities(): Promise<EffectiveCapabilitiesDto> {
  if (isAuthSpikeMode()) {
    const me = await getMe();
    return { actorId: me.actorId, capabilities: me.capabilities };
  }
  const { data } = await getMyCapabilities({
    headers: contractHeaders(),
  });
  return requireDto(data);
}

export function isCapabilitiesForbiddenError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}
