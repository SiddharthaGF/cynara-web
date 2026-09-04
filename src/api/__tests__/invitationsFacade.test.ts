import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/client.ts';
import { isForbiddenInvitationError } from '@/api/invitations.ts';

/** Facade error classification (supports Mgmt create/cancel/resend forbidden handling). */
describe('invitation facade error classification', () => {
  it('treats 401/403 as forbidden', () => {
    expect(
      isForbiddenInvitationError(new ApiError(401, 'x', 'y')),
    ).toBeTruthy();
    expect(
      isForbiddenInvitationError(new ApiError(403, 'x', 'y')),
    ).toBeTruthy();
  });

  it('does not treat other statuses as forbidden', () => {
    expect(isForbiddenInvitationError(new ApiError(400, 'x', 'y'))).toBeFalsy();
    expect(isForbiddenInvitationError(new ApiError(404, 'x', 'y'))).toBeFalsy();
    expect(isForbiddenInvitationError(new ApiError(429, 'x', 'y'))).toBeFalsy();
    expect(isForbiddenInvitationError(new Error('boom'))).toBeFalsy();
  });
});
