import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getMyCapabilities,
  type MeCapabilitiesResponse as MeCapabilitiesResponseContract,
} from '@/api/generated';

/**
 * Effective capability set for the current actor within the resolved hospital.
 * Derived from the generated contract type with fields promoted to required.
 *
 * The generated transport targets the same-origin BFF in the browser. The BFF
 * strips browser-supplied authorization headers and injects the sealed session.
 */
export type EffectiveCapabilitiesDto = Required<MeCapabilitiesResponseContract>;

export async function getEffectiveCapabilities(): Promise<EffectiveCapabilitiesDto> {
  const { data } = await getMyCapabilities({ headers: contractHeaders() });
  return requireDto(data);
}

export function isCapabilitiesForbiddenError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}
