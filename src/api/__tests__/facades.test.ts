import { afterEach, describe, expect, it, vi } from 'vitest';

import { getFormAiStatus } from '@/api/ai.ts';
import { listComponents } from '@/api/components.ts';
import { getEffectiveCapabilities } from '@/api/effective-capabilities.ts';
import { listEncounters } from '@/api/encounters.ts';
import { getFormVersion, listForms } from '@/api/forms.ts';
import { createPatient, listPatients } from '@/api/patients.ts';
import { listClinicalAreas, listFacilities } from '@/api/taxonomy.ts';
import { getWorkflowVersion, listWorkflows } from '@/api/workflows.ts';

interface CapturedRequest {
  url: string;
  method: string;
  headers: Headers;
  bodyText: string;
}

function stubFetchWithCapture(
  impl: (
    request: Request,
    captured: CapturedRequest,
  ) => Response | Promise<Response>,
): CapturedRequest {
  const captured: CapturedRequest = {
    url: '',
    method: '',
    headers: new Headers(),
    bodyText: '',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        captured.url = request.url;
        captured.method = request.method;
        captured.headers = new Headers(request.headers);
        captured.bodyText = await request.text();
        const response = await impl(request, captured);
        return response;
      },
    ),
  );
  return captured;
}

function jsonApiResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Content-Type': 'application/vnd.api+json' },
  });
}

describe('generated SDK façades', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('encounters façade', () => {
    it('builds the query string and maps the list response', async () => {
      const captured = stubFetchWithCapture(() =>
        jsonApiResponse({
          encounters: [
            {
              id: 'enc-1',
              patientId: 'p-1',
              facilityId: 'f-1',
              clinicalAreaId: 'ca-1',
              type: 'ambulatory',
              responsibleProfessionalId: 'clin-1',
              status: 'open',
              startedAt: '2026-08-01T09:00:00Z',
              endedAt: null,
              rowVersion: 1,
              createdAt: '2026-08-01T09:00:00Z',
              updatedAt: '2026-08-01T09:00:00Z',
            },
          ],
        }),
      );

      const result = await listEncounters({
        patientId: 'p-1',
        status: 'open',
      });

      expect(captured.url).toContain('/api/encounters');
      expect(captured.url).toContain('patientId=p-1');
      expect(captured.url).toContain('status=open');
      expect(captured.headers.get('X-Hospital-Code')).toBe('test-hospital');
      expect(result.encounters[0]).toMatchObject({
        id: 'enc-1',
        status: 'open',
      });
    });
  });

  describe('patients façade', () => {
    it('sends the search params and maps the paginated response', async () => {
      const captured = stubFetchWithCapture(() =>
        jsonApiResponse({
          page: 1,
          pageSize: 25,
          totalCount: 1,
          patients: [
            {
              id: 'pat-1',
              mrn: 'M-001',
              nationalId: null,
              givenName: 'Ada',
              familyName: 'Lovelace',
              birthDate: '1815-12-10',
              sex: 'female',
              status: 'active',
              rowVersion: 4,
              deletedAt: null,
              createdAt: '2026-08-01T09:00:00Z',
              updatedAt: '2026-08-01T09:00:00Z',
            },
          ],
        }),
      );

      const result = await listPatients({
        mrn: 'M-001',
        page: 1,
        pageSize: 25,
      });

      expect(captured.url).toContain('/api/patients');
      expect(captured.url).toContain('mrn=M-001');
      expect(captured.url).toContain('pageSize=25');
      expect(result.patients[0]).toMatchObject({ givenName: 'Ada' });
      expect(result.totalCount).toBe(1);
    });

    it('sends the flat create body as JSON:API media', async () => {
      const captured = stubFetchWithCapture(() =>
        jsonApiResponse({
          id: 'pat-2',
          mrn: 'M-002',
          nationalId: null,
          givenName: 'Grace',
          familyName: 'Hopper',
          birthDate: '1906-12-09',
          sex: 'female',
          status: 'active',
          rowVersion: 0,
          deletedAt: null,
          createdAt: '2026-08-01T09:00:00Z',
          updatedAt: '2026-08-01T09:00:00Z',
        }),
      );

      const result = await createPatient({
        mrn: 'M-002',
        givenName: 'Grace',
        familyName: 'Hopper',
        birthDate: '1906-12-09',
        sex: 'female',
      });

      // CYN-55: POST /api/patients has no requestBody schema. The generated
      // SDK would otherwise send the generic JSON content type the API
      // Rejects with 415. The transport defaults to the JSON:API media type.
      expect(captured.method).toBe('POST');
      expect(captured.url).toContain('/api/patients');
      expect(captured.headers.get('Content-Type')).toBe(
        'application/vnd.api+json',
      );
      expect(JSON.parse(captured.bodyText)).toMatchObject({
        mrn: 'M-002',
        givenName: 'Grace',
        sex: 'female',
      });
      expect(result).toMatchObject({ mrn: 'M-002', status: 'active' });
    });
  });

  describe('taxonomy façade', () => {
    it('lists facilities with tenant headers', async () => {
      const captured = stubFetchWithCapture(() =>
        jsonApiResponse({
          facilities: [
            {
              id: 'fac-1',
              code: 'HOSP-N',
              name: 'Hospital Norte',
              status: 'active',
              rowVersion: 2,
              retiredAt: null,
              createdAt: '2026-08-01T09:00:00Z',
              updatedAt: '2026-08-01T09:00:00Z',
            },
          ],
        }),
      );

      const result = await listFacilities({ includeRetired: false });

      expect(captured.url).toContain('/api/facilities');
      expect(captured.url).toContain('includeRetired=false');
      expect(result.facilities[0].code).toBe('HOSP-N');
    });

    it('lists clinical areas', async () => {
      const captured = stubFetchWithCapture(() =>
        jsonApiResponse({
          clinicalAreas: [
            {
              id: 'ca-1',
              code: 'EMERG',
              name: 'Emergency',
              facilityId: 'fac-1',
              status: 'active',
              rowVersion: 1,
              retiredAt: null,
              createdAt: '2026-08-01T09:00:00Z',
              updatedAt: '2026-08-01T09:00:00Z',
            },
          ],
        }),
      );

      const result = await listClinicalAreas({ facilityId: 'fac-1' });

      expect(captured.url).toContain('/api/clinicalAreas');
      expect(captured.url).toContain('facilityId=fac-1');
      expect(result.clinicalAreas[0].code).toBe('EMERG');
    });
  });

  describe('capabilities façade', () => {
    it('returns the effective capability set', async () => {
      stubFetchWithCapture(() =>
        jsonApiResponse({
          actorId: 'designer-user',
          capabilities: ['form.catalog.read', 'encounter.write'],
        }),
      );

      const result = await getEffectiveCapabilities();

      expect(result.capabilities).toContain('form.catalog.read');
      expect(result.actorId).toBe('designer-user');
    });
  });

  describe('AI façade', () => {
    it('returns the form AI status', async () => {
      stubFetchWithCapture(() =>
        jsonApiResponse({
          configured: true,
          model: 'minimax-text-01',
          baseUrl: 'https://api.example.com',
          apiKeyConfigured: true,
          apiKeyMasked: '•••',
          jsonObject: true,
          source: 'database',
          baseUrlConfigured: true,
        }),
      );

      const result = await getFormAiStatus();

      expect(result.configured).toBeTruthy();
      expect(result.model).toBe('minimax-text-01');
    });
  });

  describe('forms façade', () => {
    it('navigates the JSON:API envelope and maps summaries', async () => {
      const captured = stubFetchWithCapture(() =>
        jsonApiResponse({
          links: { self: 'http://api.test/api/formDefinitions' },
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
        }),
      );

      const summaries = await listForms();

      expect(captured.url).toContain('/api/formDefinitions');
      expect(captured.url).toContain('include=versions');
      expect(captured.url).toContain('page[size]=100');
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({
        code: 'imc',
        editableVersionId: 'v-1',
        editableStatus: 'draft',
        editableRowVersion: 3,
        publishedVersions: [],
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

  describe('components façade', () => {
    it('navigates the JSON:API envelope and maps summaries', async () => {
      const captured = stubFetchWithCapture(() =>
        jsonApiResponse({
          links: { self: 'http://api.test/api/componentDefinitions' },
          data: [
            {
              id: 'c-1',
              type: 'componentDefinitions',
              attributes: {
                code: 'vital-signs',
                name: 'Vital signs',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-02T00:00:00Z',
              },
              relationships: {
                versions: {
                  data: [{ type: 'componentVersions', id: 'cv-1' }],
                },
              },
            },
          ],
          included: [
            {
              id: 'cv-1',
              type: 'componentVersions',
              attributes: {
                status: 'published',
                version: '1.0.0',
                clinicalSchemaJson: '{"schemaVersion":"1","fields":[]}',
                uiSchemaJson: null,
                contentHash: 'abc',
                rowVersion: 2,
                createdAt: '2026-01-01T00:00:00Z',
                publishedAt: '2026-01-02T00:00:00Z',
                retiredAt: null,
              },
            },
          ],
        }),
      );

      const summaries = await listComponents();

      expect(captured.url).toContain('/api/componentDefinitions');
      expect(summaries[0]).toMatchObject({
        code: 'vital-signs',
        draftVersionId: null,
        publishedVersions: ['1.0.0'],
      });
    });
  });

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
});
