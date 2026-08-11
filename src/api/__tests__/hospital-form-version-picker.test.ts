import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  jsonApiResponse,
  stubFetchWithCapture,
} from '@/api/__tests__/hospital-test-utils.ts';
import { listFormVersionPickerOptions } from '@/api/formVersionPicker.ts';

describe('form version picker façade', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns only published versions, sorted by version', async () => {
    stubFetchWithCapture(() =>
      jsonApiResponse({
        links: { self: 'http://api.test/api/formDefinitions' },
        data: [
          {
            id: 'f-1',
            type: 'formDefinitions',
            attributes: { code: 'imc', name: 'IMC' },
            relationships: {
              versions: {
                data: [
                  { type: 'formVersions', id: 'v-1' },
                  { type: 'formVersions', id: 'v-2' },
                  { type: 'formVersions', id: 'v-3' },
                ],
              },
            },
          },
        ],
        included: [
          {
            id: 'v-1',
            type: 'formVersions',
            attributes: { status: 'draft', version: null },
          },
          {
            id: 'v-2',
            type: 'formVersions',
            attributes: { status: 'published', version: '2.0.0' },
          },
          {
            id: 'v-3',
            type: 'formVersions',
            attributes: { status: 'published', version: '1.0.0' },
          },
        ],
      }),
    );

    const options = await listFormVersionPickerOptions();

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      formDefinitionId: 'f-1',
      code: 'imc',
      name: 'IMC',
    });
    expect(
      options[0].publishedVersions.map((item) => item.version),
    ).toStrictEqual(['1.0.0', '2.0.0']);
  });
});
