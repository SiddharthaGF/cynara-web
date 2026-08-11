import { describe, expect, it } from 'vitest';

import {
  jsonApiResponse,
  stubFetchWithCapture,
} from '@/api/__tests__/api-facade-test-utils.ts';
import { getWorkflowVersion, listWorkflows } from '@/api/workflows.ts';

describe('workflows façade', () => {
  it('navigates the JSON:API envelope and maps summaries', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        links: { self: 'http://api.test/api/workflowDefinitions' },
        data: [
          {
            id: 'w-1',
            type: 'workflowDefinitions',
            attributes: {
              code: 'triage',
              name: 'Triage',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
            relationships: {
              versions: {
                data: [{ type: 'workflowVersions', id: 'wv-1' }],
              },
            },
          },
        ],
        included: [
          {
            id: 'wv-1',
            type: 'workflowVersions',
            attributes: {
              status: 'draft',
              version: null,
              workflowSchemaJson:
                '{"schemaVersion":"1.0.0","nodes":[],"edges":[]}',
              contentHash: null,
              rowVersion: 3,
              createdAt: '2026-01-01T00:00:00Z',
              publishedAt: null,
              retiredAt: null,
            },
          },
        ],
      }),
    );

    const summaries = await listWorkflows();

    expect(captured.url).toContain('/api/workflowDefinitions');
    expect(captured.url).toContain('include=versions');
    expect(captured.url).toContain('page[size]=100');
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      code: 'triage',
      name: 'Triage',
      editableVersionId: 'wv-1',
      editableStatus: 'draft',
      editableRowVersion: 3,
      publishedVersions: [],
    });
  });

  it('maps a workflow version document with its owning definition code', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        links: { self: 'http://api.test/api/workflowVersions/wv-1' },
        data: {
          id: 'wv-1',
          type: 'workflowVersions',
          attributes: {
            status: 'review',
            version: null,
            workflowSchemaJson:
              '{"schemaVersion":"1.0.0","nodes":[],"edges":[]}',
            contentHash: null,
            rowVersion: 3,
            createdAt: '2026-01-01T00:00:00Z',
            submittedForReviewAt: '2026-01-02T00:00:00Z',
            publishedAt: null,
            retiredAt: null,
          },
          relationships: {
            workflowDefinition: {
              data: { type: 'workflowDefinitions', id: 'w-1' },
            },
          },
        },
        included: [
          {
            id: 'w-1',
            type: 'workflowDefinitions',
            attributes: {
              code: 'triage',
              name: 'Triage',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
          },
        ],
      }),
    );

    const version = await getWorkflowVersion('wv-1');

    expect(captured.url).toContain('/api/workflowVersions/wv-1');
    expect(captured.url).toContain('include=workflowDefinition');
    expect(version).toMatchObject({
      id: 'wv-1',
      code: 'triage',
      status: 'review',
      rowVersion: 3,
      submittedForReviewAt: '2026-01-02T00:00:00Z',
    });
  });
});
