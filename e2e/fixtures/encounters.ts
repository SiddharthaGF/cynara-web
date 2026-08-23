import type { APIRequestContext } from '@playwright/test';

import { apiHeaders, apiOrigin } from '../lib/auth';

export interface EncounterTaxonomyRefs {
  facilityId: string;
  facilityName: string;
  clinicalAreaId: string;
  clinicalAreaName: string;
}

export interface CreatedEncounter {
  id: string;
  status: string;
  rowVersion: number;
  type: string;
}

export function uniqueCode(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

export async function seedEncounterTaxonomy(
  request: APIRequestContext,
  baseURL: string,
): Promise<EncounterTaxonomyRefs> {
  const origin = apiOrigin(baseURL);
  const suffix = uniqueCode('enc');

  const facilityResponse = await request.post(`${origin}/api/facilities`, {
    data: {
      code: `fac-${suffix}`,
      name: `Facility ${suffix}`,
    },
    headers: await apiHeaders(),
  });
  if (!facilityResponse.ok()) {
    throw new Error(
      `Failed to create facility (${facilityResponse.status()}): ${await facilityResponse.text()}`,
    );
  }
  const facility = (await facilityResponse.json()) as {
    id: string;
    name: string;
  };

  const areaResponse = await request.post(`${origin}/api/clinicalAreas`, {
    data: {
      code: `area-${suffix}`,
      name: `Area ${suffix}`,
      facilityId: facility.id,
    },
    headers: await apiHeaders(),
  });
  if (!areaResponse.ok()) {
    throw new Error(
      `Failed to create clinical area (${areaResponse.status()}): ${await areaResponse.text()}`,
    );
  }
  const area = (await areaResponse.json()) as { id: string; name: string };

  return {
    facilityId: facility.id,
    facilityName: facility.name,
    clinicalAreaId: area.id,
    clinicalAreaName: area.name,
  };
}

export async function createEncounterViaApi(
  request: APIRequestContext,
  baseURL: string,
  input: {
    patientId: string;
    facilityId: string;
    clinicalAreaId: string;
    type?: string;
    responsibleProfessionalId?: string;
  },
): Promise<CreatedEncounter> {
  const origin = apiOrigin(baseURL);
  const response = await request.post(`${origin}/api/encounters`, {
    data: {
      patientId: input.patientId,
      facilityId: input.facilityId,
      clinicalAreaId: input.clinicalAreaId,
      type: input.type ?? 'ambulatory',
      responsibleProfessionalId:
        input.responsibleProfessionalId ?? 'designer-user',
    },
    headers: await apiHeaders(),
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create encounter (${response.status()}): ${await response.text()}`,
    );
  }

  const body = (await response.json()) as {
    id: string;
    status: string;
    rowVersion: number;
    type: string;
  };

  return {
    id: body.id,
    status: body.status,
    rowVersion: body.rowVersion,
    type: body.type,
  };
}

export async function completeEncounterViaApi(
  request: APIRequestContext,
  baseURL: string,
  encounterId: string,
  rowVersion: number,
): Promise<CreatedEncounter> {
  const origin = apiOrigin(baseURL);
  const response = await request.post(
    `${origin}/api/encounters/${encounterId}/complete`,
    {
      data: { rowVersion },
      headers: await apiHeaders(),
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to complete encounter (${response.status()}): ${await response.text()}`,
    );
  }

  const body = (await response.json()) as {
    id: string;
    status: string;
    rowVersion: number;
    type: string;
  };

  return {
    id: body.id,
    status: body.status,
    rowVersion: body.rowVersion,
    type: body.type,
  };
}
