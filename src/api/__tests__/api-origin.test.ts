import { describe, expect, it } from 'vitest';

import {
  buildConfiguredApiUrl,
  getConfiguredApiOrigin,
} from '@/lib/api-origin.ts';

describe('configured API origin', () => {
  it('builds the credential action from public VITE_API_ORIGIN', () => {
    const configuredOrigin = getConfiguredApiOrigin();

    expect(configuredOrigin).toBe(
      import.meta.env.VITE_API_ORIGIN?.replace(/\/$/u, ''),
    );
    expect(buildConfiguredApiUrl('/connect/authorize')).toBe(
      `${configuredOrigin}/connect/authorize`,
    );
    expect(buildConfiguredApiUrl('/connect/authorize')).not.toContain('5173');
  });
});
