import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { contractHeaders, createClientConfig } from '@/api/client-runtime.ts';
import {
  ApiError,
  buildErrorFromJsonApi,
  buildErrorFromProblem,
  describeNetworkError,
} from '@/api/client.ts';
import { listEncounters } from '@/api/encounters.ts';
import { describeApiError } from '@/api/error-message.ts';
import { patchFormVersion as sdkPatchFormVersion } from '@/api/generated';

function stubFetch(
  impl: (request: Request) => Response | Promise<Response>,
): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        const response = await impl(request);
        return response;
      },
    ),
  );
}

function jsonApiResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Content-Type': 'application/vnd.api+json' },
  });
}

describe('transport adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createClientConfig', () => {
    it('injects only JSON:API media headers by default', () => {
      const config = createClientConfig();
      expect(config.headers).toMatchObject({
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      });
      expect(config.throwOnError).toBeTruthy();
      expect(config.fetch).toBeTypeOf('function');
    });
  });

  describe('error mapping', () => {
    it('maps a JSON:API error document to ApiError with status/title/errors', () => {
      const error = buildErrorFromJsonApi(
        422,
        JSON.stringify({
          errors: [
            {
              status: '422',
              title: 'Validation failed',
              detail: 'birthDate is invalid',
            },
          ],
        }),
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(422);
      expect(error.title).toBe('Validation failed');
      expect(error.message).toBe('birthDate is invalid');
      expect(error.errors).toHaveLength(1);
    });

    it('maps a Problem Details document to ApiError with problem attached', () => {
      const error = buildErrorFromProblem(
        409,
        JSON.stringify({
          type: 'https://example.com/problems/conflict',
          title: 'Conflict',
          status: 409,
          detail: 'Encounter is already complete.',
        }),
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(409);
      expect(error.title).toBe('Conflict');
      expect(error.message).toBe('Encounter is already complete.');
      expect(error.problem?.type).toBe('https://example.com/problems/conflict');
    });
  });

  describe('status mapping used by describeApiError', () => {
    const translate = ((key: string): string =>
      key.replace(/^api:/, '')) as TFunction;

    it('maps each status to its message key', () => {
      const cases: [number, string][] = [
        [0, 'errors.network'],
        [401, 'errors.unauthorized'],
        [403, 'errors.forbidden'],
        [404, 'errors.notFound'],
        [409, 'errors.conflict'],
        [412, 'errors.preconditionFailed'],
        [422, 'errors.validation'],
        [503, 'errors.network'],
      ];
      for (const [status, expected] of cases) {
        expect(
          describeApiError(new ApiError(status, 't', 'd'), translate),
        ).toBe(expected);
      }
    });

    it('falls back to the API detail when no rule matches', () => {
      const error = new ApiError(418, 'Teapot', 'Custom detail');
      expect(describeApiError(error, translate)).toBe('Custom detail');
    });
  });

  describe('network classification', () => {
    it('classifies fetch failures', () => {
      expect(
        describeNetworkError(new TypeError('Failed to fetch')),
      ).toStrictEqual({
        status: 0,
        title: 'Network error (CORS or offline)',
      });
    });

    it('classifies aborted requests', () => {
      const abort = new DOMException('The operation was aborted', 'AbortError');
      expect(describeNetworkError(abort)).toStrictEqual({
        status: 0,
        title: 'Request aborted',
      });
    });
  });

  describe('SDK error propagation', () => {
    it('throws the mapped ApiError with tenant headers on the request', async () => {
      stubFetch((request) => {
        expect(request.headers.get('X-Hospital-Code')).toBe('test-hospital');
        expect(request.headers.get('X-Actor-Id')).toBeNull();
        return jsonApiResponse(
          {
            errors: [
              {
                status: '422',
                title: 'Validation failed',
                detail: 'filter[sex] is invalid',
              },
            ],
          },
          422,
        );
      });

      await expect(listEncounters({})).rejects.toBeInstanceOf(ApiError);
      await expect(listEncounters({})).rejects.toMatchObject({
        status: 422,
        title: 'Validation failed',
      });
    });
  });

  describe('JSON:API content-type normalization', () => {
    it('sends the base JSON:API media type instead of the extension type', async () => {
      const captured = {
        method: '',
        url: '',
        contentType: null as string | null,
      };
      stubFetch((request) => {
        captured.method = request.method;
        captured.url = request.url;
        captured.contentType = request.headers.get('Content-Type');
        return jsonApiResponse({
          data: { id: 'v-1', type: 'formVersions' },
        });
      });

      // CYN-55: request bodies are untyped in the contract. The transport
      // Guarantees the wire format, which is what this test covers.
      await sdkPatchFormVersion({
        path: { id: 'v-1' },
        headers: contractHeaders(),
        body: {
          data: {
            id: 'v-1',
            type: 'formVersions',
            attributes: { rowVersion: 0 },
          },
        },
      } as never);

      expect(captured.method).toBe('PATCH');
      expect(captured.url).toContain('/api/formVersions/v-1');
      expect(captured.contentType).toBe('application/vnd.api+json');
    });
  });
});
