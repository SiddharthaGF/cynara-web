import { describe, expect, it } from 'vitest';

import {
  buildCapabilityAbility,
  capabilityRequirementForRoute,
  CAPABILITY_CODES,
  CAPABILITY_RULE_MAP,
  canSatisfyRouteRequirement,
  isCapabilityCode,
  type AppAbility,
  type CapabilityAction,
  type CapabilitySubject,
} from '@/lib/capabilities.ts';

/**
 * Gating suite for the admin user directory access change. If `users.read`
 * disappears from either registration map these assertions fail the build,
 * preventing the screens from shipping unregistered (which would cause
 * permanent AccessDenied despite valid grants).
 */
function canFor(
  ability: AppAbility,
): (action: CapabilityAction, subject: CapabilitySubject) => boolean {
  return (action, subject) => ability.can(action, subject);
}

const USER_ROUTES = ['/$locale/admin/users/', '/$locale/admin/users/$userId'];

describe('users.read capability registration', () => {
  it('registers users.read in CAPABILITY_CODES', () => {
    expect(CAPABILITY_CODES).toContain('users.read');
    expect(isCapabilityCode('users.read')).toBeTruthy();
  });

  it('maps users.read to read/User in CAPABILITY_RULE_MAP', () => {
    const rule = CAPABILITY_RULE_MAP['users.read'];
    expect(rule).toStrictEqual({ action: 'read', subject: 'User' });
  });

  it('grants can(read, User) for holders of users.read', () => {
    const ability = buildCapabilityAbility(['users.read']);
    expect(ability.can('read', 'User')).toBeTruthy();
    // Unrelated actions stay denied.
    expect(ability.can('write', 'User')).toBeFalsy();
  });

  it('denies read/User when the grant is absent', () => {
    const ability = buildCapabilityAbility(['patients.read']);
    expect(ability.can('read', 'User')).toBeFalsy();
  });

  it('skips unknown codes instead of granting them', () => {
    const ability = buildCapabilityAbility(['users.write']);
    expect(ability.can('read', 'User')).toBeFalsy();
    expect(ability.can('write', 'User')).toBeFalsy();
  });
});

describe('user directory route capability requirements', () => {
  it('requires read/User on both route ids', () => {
    expect(
      capabilityRequirementForRoute('/$locale/admin/users/'),
    ).toStrictEqual([{ action: 'read', subject: 'User' }]);
    expect(
      capabilityRequirementForRoute('/$locale/admin/users/$userId'),
    ).toStrictEqual([{ action: 'read', subject: 'User' }]);
  });

  it('admits grantees and denies others on both routes', () => {
    const grantee = canFor(buildCapabilityAbility(['users.read']));
    const outsider = canFor(buildCapabilityAbility(['catalog.read']));

    for (const routeId of USER_ROUTES) {
      const requirement = capabilityRequirementForRoute(routeId);
      expect(requirement).not.toBeNull();
      expect(canSatisfyRouteRequirement(requirement, grantee)).toBeTruthy();
      expect(canSatisfyRouteRequirement(requirement, outsider)).toBeFalsy();
      // No requirement resolves to open access.
      expect(canSatisfyRouteRequirement(null, outsider)).toBeTruthy();
    }
  });
});
