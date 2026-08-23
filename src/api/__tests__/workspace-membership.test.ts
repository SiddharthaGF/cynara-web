import { describe, expect, it } from 'vitest';

import { getSelectedMembership } from '@/lib/workspace-membership.ts';

describe('getSelectedMembership', () => {
  const memberships = [
    { code: 'alpha', name: 'Alpha Workspace' },
    { code: 'beta', name: 'Beta Workspace' },
  ];

  it('returns the membership matching the selected code', () => {
    expect(getSelectedMembership(memberships, 'beta')).toStrictEqual(
      memberships[1],
    );
  });

  it('returns null when there is no selected membership', () => {
    expect(getSelectedMembership(memberships, null)).toBeNull();
    expect(getSelectedMembership(memberships, 'missing')).toBeNull();
  });
});
