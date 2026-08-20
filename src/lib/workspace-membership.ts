import type { HospitalMembership } from '@/server/auth.ts';

export function getSelectedMembership(
  memberships: readonly HospitalMembership[],
  code: string | null,
): HospitalMembership | null {
  if (!code) {
    return null;
  }

  return memberships.find((membership) => membership.code === code) ?? null;
}
