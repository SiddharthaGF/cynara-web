import { describe, expect, it } from 'vitest';

import { parseLoginInput } from '@/server/auth.ts';
import {
  choosePreferredHospital,
  resolveSelectedHospital,
  type HospitalMembership,
} from '@/server/hospital-workspace.ts';

describe('automatic hospital selection', () => {
  const memberships: HospitalMembership[] = [
    { code: 'alpha', name: 'Alpha Hospital' },
    { code: 'beta', name: 'Beta Hospital' },
  ];

  it('prefers the configured server-side code when it is a membership', () => {
    expect(choosePreferredHospital(memberships, 'beta')).toBe('beta');
  });

  it('falls back to the first authenticated membership', () => {
    expect(choosePreferredHospital(memberships, 'missing')).toBe('alpha');
  });

  it('returns no workspace when the authenticated user has no memberships', () => {
    expect(choosePreferredHospital([], 'default')).toBeNull();
  });

  it('replaces a stale selected workspace with a valid preferred membership', () => {
    expect(resolveSelectedHospital('removed', memberships, 'beta')).toBe(
      'beta',
    );
  });

  it('keeps an empty membership list unselected', () => {
    expect(resolveSelectedHospital('removed', [], 'default')).toBeNull();
  });

  it('ignores browser-provided hospital selection during login start', () => {
    expect(
      parseLoginInput({
        kind: 'start',
        locale: 'en',
        redirectTo: '/en/forms',
        hospitalCode: 'attacker-controlled',
      }),
    ).toStrictEqual({
      kind: 'start',
      locale: 'en',
      redirectTo: '/en/forms',
    });
  });
});
