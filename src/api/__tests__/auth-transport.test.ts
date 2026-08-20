import { describe, expect, it } from 'vitest';

import {
  createReplayableRequestInitFactory,
  isRequestInitReplayable,
} from '@/server/api-proxy.ts';
import { selectHospitalSessionData } from '@/server/auth.ts';

describe('authenticated BFF regressions', () => {
  it('preserves the refresh token rotated during automatic hospital selection', () => {
    const selected = selectHospitalSessionData(
      {
        refreshToken: 'rotated-refresh-token',
        hospitalCode: null,
        expiresAt: 123,
      },
      'hospital-a',
    );

    expect(selected).toStrictEqual({
      refreshToken: 'rotated-refresh-token',
      hospitalCode: 'hospital-a',
      expiresAt: 123,
    });
  });

  it('gives each mutation retry a distinct replayable body', async () => {
    const request = new Request('http://localhost/api/forms', {
      method: 'POST',
      body: JSON.stringify({ name: 'replay me' }),
    });
    const factory = createReplayableRequestInitFactory(
      request,
      new Headers({ 'Content-Type': 'application/json' }),
    );

    const first = factory();
    const retry = factory();

    expect(first.body).not.toBe(retry.body);
    await expect(new Response(first.body).text()).resolves.toBe(
      '{"name":"replay me"}',
    );
    await expect(new Response(retry.body).text()).resolves.toBe(
      '{"name":"replay me"}',
    );
  });

  it('rejects a one-shot stream when no replay factory is available', () => {
    const body = new ReadableStream<Uint8Array>();
    expect(isRequestInitReplayable({ method: 'POST', body })).toBeFalsy();
    expect(
      isRequestInitReplayable({ method: 'POST', body: 'replayable' }),
    ).toBeTruthy();
  });
});
