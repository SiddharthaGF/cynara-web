import { ApiError } from '@/api/client.ts';

/**
 * Hospital-membership domain: pure parsing and selection rules shared by the
 * auth server functions. No server-only imports live here so the module stays
 * safe for any bundling environment.
 */

export interface HospitalMembership {
  code: string;
  name: string;
}

export const HOSPITAL_CODE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseHospitals(body: unknown): HospitalMembership[] {
  if (!Array.isArray(body)) {
    throw new ApiError(
      502,
      'Invalid hospital response',
      'Invalid membership list',
    );
  }
  return body.flatMap((item): HospitalMembership[] => {
    if (!isRecord(item)) {
      return [];
    }
    const record = item;
    return typeof record.code === 'string' && typeof record.name === 'string'
      ? [{ code: record.code, name: record.name }]
      : [];
  });
}

export function choosePreferredHospital(
  memberships: readonly HospitalMembership[],
  configuredCode: string,
): string | null {
  return (
    memberships.find((membership) => membership.code === configuredCode)
      ?.code ??
    memberships[0]?.code ??
    null
  );
}

export function resolveSelectedHospital(
  selectedCode: string | null,
  memberships: readonly HospitalMembership[],
  configuredCode: string,
): string | null {
  return selectedCode && memberships.some((item) => item.code === selectedCode)
    ? selectedCode
    : choosePreferredHospital(memberships, configuredCode);
}

export function selectHospitalSessionData(
  session: Readonly<{
    refreshToken: string;
    hospitalCode: string | null;
    expiresAt: number;
  }>,
  hospitalCode: string,
): {
  refreshToken: string;
  hospitalCode: string;
  expiresAt: number;
} {
  return {
    refreshToken: session.refreshToken,
    hospitalCode,
    expiresAt: session.expiresAt,
  };
}
