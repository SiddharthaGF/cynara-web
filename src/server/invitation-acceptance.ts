import { createServerFn } from '@tanstack/react-start';

import { ApiError } from '@/api/client.ts';
import { mapApiResponseError } from '@/server/api-proxy.ts';
import { getIdentityOrigin } from '@/server/env.ts';

/**
 * Anonymous invitation acceptance. The visitor has no session, so this talks
 * to the API directly (account-recovery pattern) without contract headers or
 * session auth; the endpoint resolves its tenant from the token.
 */

export interface AcceptInvitationMemberSummary {
  user: { id: string; email: string };
  hospital: { id: string; code: string; name: string };
  actor: { id: string };
  capabilities: string[];
}

export interface AcceptInvitationResult {
  accepted: boolean;
  member: AcceptInvitationMemberSummary | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const acceptInvitation = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    if (!isRecord(value)) {
      throw new ApiError(
        400,
        'Invalid accept request',
        'Expected an object payload',
      );
    }
    const { token, password } = value;
    if (typeof token !== 'string' || token.length === 0) {
      throw new ApiError(
        400,
        'Invalid accept request',
        'Missing invitation token',
      );
    }
    if (typeof password !== 'string' || password.length === 0) {
      throw new ApiError(400, 'Invalid accept request', 'Password is required');
    }
    return { token, password };
  })
  .handler(async ({ data }): Promise<AcceptInvitationResult> => {
    const response = await fetch(
      `${getIdentityOrigin()}/api/user-invitations/${encodeURIComponent(data.token)}/accept`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ password: data.password }),
      },
    );
    if (!response.ok) {
      throw await mapApiResponseError(response);
    }
    const body = (await response.json()) as {
      accepted?: boolean;
      member?: AcceptInvitationMemberSummary | null;
    };
    return {
      accepted: body.accepted === true,
      member: body.member ?? null,
    };
  });
