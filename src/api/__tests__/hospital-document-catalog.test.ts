import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  jsonApiResponse,
  stubFetchWithCapture,
} from '@/api/__tests__/hospital-test-utils.ts';
import { ApiError } from '@/api/client.ts';
import {
  createDocumentDefinition,
  isDuplicateDocumentCodeError,
  isForbiddenDocumentCatalogError,
  isStaleDocumentCatalogError,
  listDocumentDefinitions,
  patchDocumentDefinition,
  retireDocumentDefinition,
} from '@/api/document-catalog.ts';

describe('document catalog façade', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists definitions with includeRetired and maps relationship ids', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        links: { self: 'http://api.test/api/documentDefinitions' },
        data: [
          {
            id: 'doc-1',
            type: 'documentDefinitions',
            attributes: {
              code: 'ADM-NOTE',
              name: 'Admission Note',
              status: 'active',
              allowsMultipleInstancesPerEncounter: false,
              requiresActorForCreation: true,
              requiresActorForCompletion: false,
              rowVersion: 4,
              createdAt: '2026-08-01T09:00:00Z',
              updatedAt: '2026-08-02T09:00:00Z',
              retiredAt: null,
            },
            relationships: {
              formDefinition: {
                data: { type: 'formDefinitions', id: 'f-1' },
              },
              formVersion: { data: { type: 'formVersions', id: 'v-1' } },
              facility: { data: { type: 'facilities', id: 'fac-1' } },
              clinicalArea: {
                data: { type: 'clinicalAreas', id: 'ca-1' },
              },
              discipline: {
                data: { type: 'disciplines', id: 'disc-1' },
              },
            },
          },
        ],
      }),
    );

    const definitions = await listDocumentDefinitions({
      includeRetired: true,
    });

    expect(captured.url).toContain('/api/documentDefinitions');
    expect(captured.url).toContain('includeRetired=true');
    expect(captured.url).toContain('sort=code');
    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatchObject({
      id: 'doc-1',
      code: 'ADM-NOTE',
      formDefinitionId: 'f-1',
      formVersionId: 'v-1',
      facilityId: 'fac-1',
      clinicalAreaId: 'ca-1',
      disciplineId: 'disc-1',
      requiresActorForCreation: true,
    });
  });

  it('creates a definition as a JSON:API envelope with relationships', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({ data: { id: 'doc-2' } }, 201),
    );

    const definition = await createDocumentDefinition({
      code: 'DISCHARGE',
      name: 'Discharge Summary',
      formDefinitionId: 'f-2',
      formVersionId: 'v-3',
      facilityId: 'fac-1',
      clinicalAreaId: 'ca-1',
      disciplineId: 'disc-1',
      allowsMultipleInstancesPerEncounter: true,
      requiresActorForCreation: false,
      requiresActorForCompletion: true,
    });

    expect(captured.method).toBe('POST');
    expect(captured.url).toContain('/api/documentDefinitions');
    const body = JSON.parse(captured.bodyText);
    expect(body.data).toMatchObject({
      type: 'documentDefinitions',
      attributes: {
        code: 'DISCHARGE',
        allowsMultipleInstancesPerEncounter: true,
      },
      relationships: {
        formDefinition: {
          data: { type: 'formDefinitions', id: 'f-2' },
        },
      },
    });
    expect(definition).toMatchObject({ id: 'doc-2', code: 'DISCHARGE' });
  });

  it('patches a definition with name, policies, and rowVersion', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        data: {
          id: 'doc-1',
          type: 'documentDefinitions',
          attributes: {
            code: 'ADM-NOTE',
            name: 'Admission Note v2',
            status: 'active',
            allowsMultipleInstancesPerEncounter: true,
            requiresActorForCreation: true,
            requiresActorForCompletion: true,
            rowVersion: 5,
            createdAt: '2026-08-01T09:00:00Z',
            updatedAt: '2026-08-03T09:00:00Z',
            retiredAt: null,
          },
          relationships: {
            formDefinition: {
              data: { type: 'formDefinitions', id: 'f-1' },
            },
            formVersion: { data: { type: 'formVersions', id: 'v-1' } },
            facility: { data: { type: 'facilities', id: 'fac-1' } },
            clinicalArea: {
              data: { type: 'clinicalAreas', id: 'ca-1' },
            },
            discipline: {
              data: { type: 'disciplines', id: 'disc-1' },
            },
          },
        },
      }),
    );

    const definition = await patchDocumentDefinition('doc-1', {
      name: 'Admission Note v2',
      allowsMultipleInstancesPerEncounter: true,
      requiresActorForCreation: true,
      requiresActorForCompletion: true,
      rowVersion: 4,
    });

    expect(captured.method).toBe('PATCH');
    expect(captured.url).toContain('/api/documentDefinitions/doc-1');
    const body = JSON.parse(captured.bodyText);
    expect(body.data.attributes).toMatchObject({
      name: 'Admission Note v2',
      rowVersion: 4,
      allowsMultipleInstancesPerEncounter: true,
    });
    expect(definition).toMatchObject({
      name: 'Admission Note v2',
      rowVersion: 5,
    });
  });

  it('retires a definition with the rowVersion query', async () => {
    const captured = stubFetchWithCapture(() => jsonApiResponse({}));

    await retireDocumentDefinition('doc-1', 5);

    expect(captured.method).toBe('POST');
    expect(captured.url).toContain('/api/documentDefinitions/doc-1/retire');
    expect(captured.url).toContain('rowVersion=5');
  });

  it('classifies document catalog errors', () => {
    expect(
      isForbiddenDocumentCatalogError(new ApiError(403, 'Forbidden', 'no')),
    ).toBeTruthy();
    expect(
      isStaleDocumentCatalogError(new ApiError(409, 'Conflict', 'stale')),
    ).toBeTruthy();
    expect(
      isDuplicateDocumentCodeError(
        new ApiError(422, 'Unprocessable', 'Document code is not unique'),
      ),
    ).toBeTruthy();
    expect(
      isDuplicateDocumentCodeError(new ApiError(500, 'Server Error', 'no')),
    ).toBeFalsy();
  });
});
