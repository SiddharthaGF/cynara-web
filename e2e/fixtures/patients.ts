import type { APIRequestContext } from '@playwright/test';

const JSON_API_MEDIA = 'application/vnd.api+json';
const ACTOR = 'designer-user';
const HOSPITAL = process.env.VITE_HOSPITAL_CODE ?? 'default';

export interface CreatedPatient {
  id: string;
  mrn: string;
  givenName: string;
  familyName: string;
}

export function uniqueMrn(prefix = 'E2E'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

/**
 * Create a patient against the real cynara-api (via Vite origin or absolute
 * VITE_API_ORIGIN). Uses the same media type and headers as the web client.
 */
export async function createPatientViaApi(
  request: APIRequestContext,
  baseURL: string,
  input: {
    mrn?: string;
    givenName?: string;
    familyName?: string;
    birthDate?: string;
    sex?: string;
    nationalId?: string | null;
  } = {},
): Promise<CreatedPatient> {
  const apiOrigin = process.env.VITE_API_ORIGIN?.replace(/\/$/u, '') || baseURL;
  const mrn = input.mrn ?? uniqueMrn();
  const givenName = input.givenName ?? 'Ada';
  const familyName = input.familyName ?? 'Lovelace';
  const response = await request.post(`${apiOrigin}/api/patients`, {
    data: {
      mrn,
      givenName,
      familyName,
      birthDate: input.birthDate ?? '1990-01-01',
      sex: input.sex ?? 'female',
      nationalId: input.nationalId ?? null,
    },
    headers: {
      'Accept': JSON_API_MEDIA,
      'Content-Type': JSON_API_MEDIA,
      'X-Actor-Id': ACTOR,
      'X-Hospital-Code': HOSPITAL,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create patient (${response.status()}): ${await response.text()}`,
    );
  }

  const body = (await response.json()) as {
    id: string;
    mrn: string;
    givenName: string;
    familyName: string;
  };

  return {
    id: body.id,
    mrn: body.mrn,
    givenName: body.givenName,
    familyName: body.familyName,
  };
}
