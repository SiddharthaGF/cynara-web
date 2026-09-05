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
 * Gating suite for the invitation screens. If a `user-invitations.*` code
 * disappears from either registration map these assertions fail the build,
 * preventing the screens from shipping unregistered (which would cause
 * permanent AccessDenied despite valid grants).
 */
function canFor(
  ability: AppAbility,
): (action: CapabilityAction, subject: CapabilitySubject) => boolean {
  return (action, subject) => ability.can(action, subject);
}

describe('user-invitations capability registration', () => {
  it('registers both codes in CAPABILITY_CODES', () => {
    expect(CAPABILITY_CODES).toContain('user-invitations.read');
    expect(CAPABILITY_CODES).toContain('user-invitations.write');
    expect(isCapabilityCode('user-invitations.read')).toBeTruthy();
    expect(isCapabilityCode('user-invitations.write')).toBeTruthy();
  });

  it('maps read to read/Invitation and write to write/Invitation', () => {
    expect(CAPABILITY_RULE_MAP['user-invitations.read']).toStrictEqual({
      action: 'read',
      subject: 'Invitation',
    });
    expect(CAPABILITY_RULE_MAP['user-invitations.write']).toStrictEqual({
      action: 'write',
      subject: 'Invitation',
    });
  });

  it('grants read/Invitation only to holders of user-invitations.read', () => {
    const grantee = canFor(buildCapabilityAbility(['user-invitations.read']));
    const outsider = canFor(buildCapabilityAbility(['users.read']));
    expect(grantee('read', 'Invitation')).toBeTruthy();
    expect(grantee('write', 'Invitation')).toBeFalsy();
    expect(outsider('read', 'Invitation')).toBeFalsy();
  });

  it('gates mutations on user-invitations.write', () => {
    const writer = canFor(
      buildCapabilityAbility([
        'user-invitations.read',
        'user-invitations.write',
      ]),
    );
    const readerOnly = canFor(
      buildCapabilityAbility(['user-invitations.read']),
    );
    expect(writer('write', 'Invitation')).toBeTruthy();
    expect(readerOnly('write', 'Invitation')).toBeFalsy();
  });
});

describe('invitation route capability requirements', () => {
  it('requires read/Invitation on the admin invitations route', () => {
    expect(
      capabilityRequirementForRoute('/$locale/admin/invitations/'),
    ).toStrictEqual([{ action: 'read', subject: 'Invitation' }]);
  });

  it('OR-ins Invitation read into the admin hub requirement', () => {
    const requirement = capabilityRequirementForRoute('/$locale/admin/');
    expect(requirement).toContainEqual({
      action: 'read',
      subject: 'Invitation',
    });
    const invitationReader = canFor(
      buildCapabilityAbility(['user-invitations.read']),
    );
    expect(
      canSatisfyRouteRequirement(requirement, invitationReader),
    ).toBeTruthy();
  });

  it('keeps the hub closed without any admin read capability', () => {
    const requirement = capabilityRequirementForRoute('/$locale/admin/');
    const outsider = canFor(buildCapabilityAbility(['patients.read']));
    expect(canSatisfyRouteRequirement(requirement, outsider)).toBeFalsy();
  });

  it('leaves the accept route unregistered (public by guard default)', () => {
    expect(
      capabilityRequirementForRoute('/$locale/invitations/accept'),
    ).toBeNull();
  });
});
