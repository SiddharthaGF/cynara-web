import {
  ACTOR_HEADER_NAME,
  DEFAULT_ACTOR_ID,
  HOSPITAL_HEADER_NAME,
  apiRequest,
  resolveHospitalCode,
} from '@/api/client.ts';
import { JSON_API_MEDIA } from '@/api/json-api.ts';

export interface FacilityDto {
  id: string;
  code: string;
  name: string;
  status: string;
  rowVersion: number;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalAreaDto {
  id: string;
  code: string;
  name: string;
  facilityId: string;
  status: string;
  rowVersion: number;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityListResponse {
  facilities: FacilityDto[];
}

export interface ClinicalAreaListResponse {
  clinicalAreas: ClinicalAreaDto[];
}

export interface ListFacilitiesParams {
  includeRetired?: boolean;
}

export interface ListClinicalAreasParams {
  facilityId?: string;
  includeRetired?: boolean;
}

function taxonomyHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.set('Accept', JSON_API_MEDIA);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', JSON_API_MEDIA);
  }
  if (!headers.has(HOSPITAL_HEADER_NAME)) {
    headers.set(HOSPITAL_HEADER_NAME, resolveHospitalCode());
  }
  if (!headers.has(ACTOR_HEADER_NAME)) {
    headers.set(ACTOR_HEADER_NAME, DEFAULT_ACTOR_ID);
  }
  return headers;
}

function appendQuery(path: string, query: string): string {
  if (query.length === 0) {
    return path;
  }
  return `${path}?${query}`;
}

export async function listFacilities(
  params: ListFacilitiesParams = {},
): Promise<FacilityListResponse> {
  const search = new URLSearchParams();
  if (params.includeRetired !== undefined) {
    search.set('includeRetired', params.includeRetired ? 'true' : 'false');
  }
  return apiRequest<FacilityListResponse>(
    appendQuery('/api/facilities', search.toString()),
    { headers: taxonomyHeaders() },
  );
}

export async function listClinicalAreas(
  params: ListClinicalAreasParams = {},
): Promise<ClinicalAreaListResponse> {
  const search = new URLSearchParams();
  if (params.facilityId) {
    search.set('facilityId', params.facilityId);
  }
  if (params.includeRetired !== undefined) {
    search.set('includeRetired', params.includeRetired ? 'true' : 'false');
  }
  return apiRequest<ClinicalAreaListResponse>(
    appendQuery('/api/clinicalAreas', search.toString()),
    { headers: taxonomyHeaders() },
  );
}
