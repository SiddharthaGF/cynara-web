import { createServerFn } from '@tanstack/react-start';

import { ApiError } from '@/api/client.ts';
import { postAccount } from '@/server/identity-provider.ts';

/**
 * Account server functions: password recovery and reset. They talk to the
 * identity provider without touching session state.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const requestPasswordRecovery = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ApiError(400, 'Invalid account', 'Account is required');
    }
    return value.trim();
  })
  .handler(async ({ data }): Promise<void> => {
    await postAccount('/connect/account/recovery', { account: data });
  });

export const resetPassword = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    if (typeof value !== 'object' || value === null) {
      throw new ApiError(400, 'Invalid reset request', 'Invalid reset request');
    }
    if (!isRecord(value)) {
      throw new ApiError(400, 'Invalid reset request', 'Invalid reset request');
    }
    const input = value;
    if (
      typeof input.account !== 'string' ||
      typeof input.token !== 'string' ||
      typeof input.newPassword !== 'string'
    ) {
      throw new ApiError(400, 'Invalid reset request', 'Invalid reset request');
    }
    return {
      account: input.account,
      token: input.token,
      newPassword: input.newPassword,
    };
  })
  .handler(async ({ data }): Promise<void> => {
    await postAccount('/connect/account/reset', data);
  });
