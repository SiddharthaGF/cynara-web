import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_AUTHORIZE_PATH } from '@/lib/auth-authorize.ts';
import {
  createAuthorizeProxyRequest,
  proxyAuthorizeRequest,
} from '@/server/auth-authorize-proxy.ts';
import { buildAuthorizeUrl } from '@/server/identity-provider.ts';

describe('frontend authorization navigation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts login at the frontend authorize path and preserves the OAuth query', () => {
    const url = buildAuthorizeUrl(
      'http://127.0.0.1:5173',
      new URLSearchParams({
        client_id: 'cynara-web',
        redirect_uri: 'http://127.0.0.1:5173/en/login',
        response_type: 'code',
        state: 'abc',
      }),
    );

    expect(url).toContain('http://127.0.0.1:5173/auth/authorize?');
    expect(url).not.toContain('127.0.0.1:5000');
    expect(url).toContain('client_id=cynara-web');
    expect(AUTH_AUTHORIZE_PATH).toBe('/auth/authorize');
  });

  it('proxies GET with the fixed backend path and manual redirects', async () => {
    const request = new Request(
      'http://127.0.0.1:5173/auth/authorize?client_id=cynara-web&state=abc',
      { headers: { Cookie: 'backend-secret', Host: 'evil.example' } },
    );
    const upstream = await createAuthorizeProxyRequest(
      request,
      'http://127.0.0.1:5000/api/../',
    );

    expect(upstream.url).toBe(
      'http://127.0.0.1:5000/connect/authorize?client_id=cynara-web&state=abc',
    );
    expect(upstream.init.redirect).toBe('manual');
    expect({
      cookie: (upstream.init.headers as Headers).has('cookie'),
      host: (upstream.init.headers as Headers).has('host'),
    }).toStrictEqual({ cookie: false, host: false });
  });

  it('forwards only the authorization POST fields and returns redirects', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('backend body', {
        status: 302,
        headers: { Location: 'http://127.0.0.1:5173/en/login?code=abc' },
      }),
    );
    const request = new Request('http://127.0.0.1:5173/auth/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': 'backend-secret',
        'Host': 'evil.example',
      },
      body: new URLSearchParams({
        client_id: 'cynara-web',
        request_uri: 'urn:opaque:request',
        email: 'doctor@cynara.dev',
        password: 'secret',
      }),
    });

    const response = await proxyAuthorizeRequest(
      request,
      'http://127.0.0.1:5000',
    );

    expect({
      status: response.status,
      location: response.headers.get('location'),
    }).toStrictEqual({
      status: 302,
      location: 'http://127.0.0.1:5173/en/login?code=abc',
    });
    await expect(response.text()).resolves.toBe('backend body');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:5000/connect/authorize',
      expect.objectContaining({ redirect: 'manual', method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URLSearchParams(init.body as string)).toStrictEqual(
      new URLSearchParams({
        client_id: 'cynara-web',
        request_uri: 'urn:opaque:request',
        email: 'doctor@cynara.dev',
        password: 'secret',
      }),
    );
    expect({
      cookie: (init.headers as Headers).has('cookie'),
      host: (init.headers as Headers).has('host'),
    }).toStrictEqual({ cookie: false, host: false });
  });

  it('rejects arbitrary POST fields before reaching the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const request = new Request('http://127.0.0.1:5173/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'cynara-web',
        request_uri: 'urn:opaque:request',
        host: 'evil.example',
      }),
    });

    const response = await proxyAuthorizeRequest(
      request,
      'http://127.0.0.1:5000',
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
