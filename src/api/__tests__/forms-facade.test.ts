import { describe, expect, it } from 'vitest';

import {
  jsonApiResponse,
  stubFetchWithCapture,
} from '@/api/__tests__/api-facade-test-utils.ts';
import { getFormVersion, listForms } from '@/api/forms.ts';

describe('forms façade', () => {
  it('navigates the JSON:API envelope and maps summaries', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        links: {
          self: 'http://api.test/api/formDefinitions?page[size]=20',
        },
        data: [
          {
            id: 'f-1',
            type: 'formDefinitions',
            attributes: {
              code: 'imc',
              name: 'IMC',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
            relationships: {
              versions: {
                data: [{ type: 'formVersions', id: 'v-1' }],
              },
            },
          },
        ],
        included: [
          {
            id: 'v-1',
            type: 'formVersions',
            attributes: {
              status: 'draft',
              version: null,
              clinicalSchemaJson: '{"schemaVersion":"1","fields":[]}',
              uiSchemaJson: null,
              rulesSchemaJson: null,
              rowVersion: 3,
              createdAt: '2026-01-01T00:00:00Z',
              publishedAt: null,
              retiredAt: null,
            },
          },
        ],
        meta: { total: 1 },
      }),
    );

    const result = await listForms({ page: 1, pageSize: 20 });

    expect(captured.url).toContain('/api/formDefinitions');
    expect(captured.url).toContain('page[size]=20');
    expect(captured.url).toContain('page[number]=1');
    expect(result).toMatchObject({
      totalCount: 1,
      page: 1,
      pageSize: 20,
      forms: [
        {
          code: 'imc',
          editableVersionId: 'v-1',
          editableStatus: 'draft',
          editableRowVersion: 3,
          publishedVersions: [],
        },
      ],
    });
  });

  it('maps a version document with its owning definition code', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        links: { self: 'http://api.test/api/formVersions/v-1' },
        data: {
          id: 'v-1',
          type: 'formVersions',
          attributes: {
            status: 'review',
            version: null,
            clinicalSchemaJson: '{"schemaVersion":"1","fields":[]}',
            uiSchemaJson: null,
            rulesSchemaJson: null,
            contentHash: null,
            dependencyMetadataJson: null,
            rowVersion: 3,
            createdAt: '2026-01-01T00:00:00Z',
            submittedForReviewAt: '2026-01-02T00:00:00Z',
            publishedAt: null,
            retiredAt: null,
          },
          relationships: {
            formDefinition: {
              data: { type: 'formDefinitions', id: 'f-1' },
            },
          },
        },
        included: [
          {
            id: 'f-1',
            type: 'formDefinitions',
            attributes: {
              code: 'imc',
              name: 'IMC',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
          },
        ],
      }),
    );

    const version = await getFormVersion('v-1');

    expect(captured.url).toContain('/api/formVersions/v-1');
    expect(captured.url).toContain('include=formDefinition');
    expect(version).toMatchObject({
      id: 'v-1',
      code: 'imc',
      status: 'review',
      rowVersion: 3,
      submittedForReviewAt: '2026-01-02T00:00:00Z',
    });
  });
});
