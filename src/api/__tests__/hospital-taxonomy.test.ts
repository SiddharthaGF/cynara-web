import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  jsonApiResponse,
  stubFetchWithCapture,
} from '@/api/__tests__/hospital-test-utils.ts';
import { ApiError } from '@/api/client.ts';
import {
  createClinicalArea,
  createDiscipline,
  createFacility,
  isDuplicateTaxonomyCodeError,
  isForbiddenTaxonomyError,
  isStaleTaxonomyError,
  listDisciplines,
  patchFacility,
  retireFacility,
} from '@/api/taxonomy.ts';

describe('taxonomy façade mutations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a facility with the flat body', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse(
        {
          id: 'fac-1',
          code: 'HOSP-N',
          name: 'Hospital Norte',
          status: 'active',
          rowVersion: 0,
          retiredAt: null,
          createdAt: '2026-08-01T09:00:00Z',
          updatedAt: '2026-08-01T09:00:00Z',
        },
        201,
      ),
    );

    const facility = await createFacility({
      code: 'HOSP-N',
      name: 'Hospital Norte',
    });

    expect(captured.method).toBe('POST');
    expect(captured.url).toContain('/api/facilities');
    expect(JSON.parse(captured.bodyText)).toStrictEqual({
      code: 'HOSP-N',
      name: 'Hospital Norte',
    });
    expect(facility).toMatchObject({ code: 'HOSP-N', status: 'active' });
  });

  it('patches a facility name with the concurrency token', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        id: 'fac-1',
        code: 'HOSP-N',
        name: 'Hospital Norte Renovado',
        status: 'active',
        rowVersion: 1,
        retiredAt: null,
        createdAt: '2026-08-01T09:00:00Z',
        updatedAt: '2026-08-02T09:00:00Z',
      }),
    );

    const facility = await patchFacility('fac-1', {
      name: 'Hospital Norte Renovado',
      rowVersion: 0,
    });

    expect(captured.method).toBe('PATCH');
    expect(captured.url).toContain('/api/facilities/fac-1');
    expect(JSON.parse(captured.bodyText)).toStrictEqual({
      name: 'Hospital Norte Renovado',
      rowVersion: 0,
    });
    expect(facility.rowVersion).toBe(1);
  });

  it('retires a facility against the retire endpoint', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        id: 'fac-1',
        code: 'HOSP-N',
        name: 'Hospital Norte',
        status: 'retired',
        rowVersion: 2,
        retiredAt: '2026-08-03T09:00:00Z',
        createdAt: '2026-08-01T09:00:00Z',
        updatedAt: '2026-08-03T09:00:00Z',
      }),
    );

    const facility = await retireFacility('fac-1', 1);

    expect(captured.method).toBe('POST');
    expect(captured.url).toContain('/api/facilities/fac-1/retire');
    expect(JSON.parse(captured.bodyText)).toStrictEqual({ rowVersion: 1 });
    expect(facility.status).toBe('retired');
  });

  it('creates a discipline nested under a clinical area', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse(
        {
          id: 'disc-1',
          code: 'EMERG-MED',
          name: 'Emergency Medicine',
          clinicalAreaId: 'ca-1',
          status: 'active',
          rowVersion: 0,
          retiredAt: null,
          createdAt: '2026-08-01T09:00:00Z',
          updatedAt: '2026-08-01T09:00:00Z',
        },
        201,
      ),
    );

    const discipline = await createDiscipline({
      code: 'EMERG-MED',
      name: 'Emergency Medicine',
      clinicalAreaId: 'ca-1',
    });

    expect(captured.url).toContain('/api/disciplines');
    expect(JSON.parse(captured.bodyText)).toStrictEqual({
      code: 'EMERG-MED',
      name: 'Emergency Medicine',
      clinicalAreaId: 'ca-1',
    });
    expect(discipline).toMatchObject({ code: 'EMERG-MED' });
  });

  it('creates a clinical area nested under a facility', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse(
        {
          id: 'ca-1',
          code: 'EMERG',
          name: 'Emergency',
          facilityId: 'fac-1',
          status: 'active',
          rowVersion: 0,
          retiredAt: null,
          createdAt: '2026-08-01T09:00:00Z',
          updatedAt: '2026-08-01T09:00:00Z',
        },
        201,
      ),
    );

    const area = await createClinicalArea({
      code: 'EMERG',
      name: 'Emergency',
      facilityId: 'fac-1',
    });

    expect(captured.url).toContain('/api/clinicalAreas');
    expect(JSON.parse(captured.bodyText)).toStrictEqual({
      code: 'EMERG',
      name: 'Emergency',
      facilityId: 'fac-1',
    });
    expect(area).toMatchObject({ code: 'EMERG' });
  });

  it('lists disciplines with the facility filter', async () => {
    const captured = stubFetchWithCapture(() =>
      jsonApiResponse({
        disciplines: [
          {
            id: 'disc-1',
            code: 'EMERG-MED',
            name: 'Emergency Medicine',
            clinicalAreaId: 'ca-1',
            status: 'active',
            rowVersion: 2,
            retiredAt: null,
            createdAt: '2026-08-01T09:00:00Z',
            updatedAt: '2026-08-01T09:00:00Z',
          },
        ],
      }),
    );

    const result = await listDisciplines({ clinicalAreaId: 'ca-1' });

    expect(captured.url).toContain('/api/disciplines');
    expect(captured.url).toContain('clinicalAreaId=ca-1');
    expect(result.disciplines[0].code).toBe('EMERG-MED');
  });

  it('classifies taxonomy errors', () => {
    expect(
      isStaleTaxonomyError(new ApiError(409, 'Conflict', 'stale')),
    ).toBeTruthy();
    expect(
      isStaleTaxonomyError(new ApiError(400, 'Bad Request', 'no')),
    ).toBeFalsy();
    expect(
      isForbiddenTaxonomyError(new ApiError(401, 'Unauthorized', 'no')),
    ).toBeTruthy();
    expect(
      isDuplicateTaxonomyCodeError(
        new ApiError(
          409,
          'Conflict',
          'A facility with this code already exists',
        ),
      ),
    ).toBeTruthy();
    expect(
      isDuplicateTaxonomyCodeError(new ApiError(500, 'Server Error', 'no')),
    ).toBeFalsy();
  });
});
