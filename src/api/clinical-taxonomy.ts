import { apiRequest } from '@/api/client.ts';

export type ClinicalTaxonomyStatus = 'active' | 'retired';

interface TaxonomyDtoBase {
  id: string;
  code: string;
  name: string;
  status: string;
  rowVersion: number;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FacilityDto = TaxonomyDtoBase;

export interface ClinicalAreaDto extends TaxonomyDtoBase {
  facilityId: string;
}

export interface DisciplineDto extends TaxonomyDtoBase {
  clinicalAreaId: string;
}

export interface FacilityListResponse {
  facilities: FacilityDto[];
}

export interface ClinicalAreaListResponse {
  clinicalAreas: ClinicalAreaDto[];
}

export interface DisciplineListResponse {
  disciplines: DisciplineDto[];
}

export interface CreateFacilityInput {
  code: string;
  name: string;
}

export interface UpdateFacilityInput {
  name?: string;
  code?: string;
  rowVersion: number;
}

export interface CreateClinicalAreaInput {
  code: string;
  name: string;
  facilityId: string;
}

export interface UpdateClinicalAreaInput {
  name?: string;
  code?: string;
  rowVersion: number;
}

export interface CreateDisciplineInput {
  code: string;
  name: string;
  clinicalAreaId: string;
}

export interface UpdateDisciplineInput {
  name?: string;
  code?: string;
  rowVersion: number;
}

function buildQuery(params: {
  facilityId?: string;
  clinicalAreaId?: string;
  includeRetired?: boolean;
}): string {
  const search = new URLSearchParams();
  if (params.facilityId) {
    search.set('facilityId', params.facilityId);
  }
  if (params.clinicalAreaId) {
    search.set('clinicalAreaId', params.clinicalAreaId);
  }
  if (params.includeRetired !== undefined) {
    search.set('includeRetired', params.includeRetired ? 'true' : 'false');
  }
  return search.toString();
}

function append(path: string, query: string): string {
  if (!query) {
    return path;
  }
  return `${path}?${query}`;
}

// ---------- Facilities ----------

export async function listFacilities(
  options: {
    includeRetired?: boolean;
  } = {},
): Promise<FacilityDto[]> {
  const query = buildQuery({ includeRetired: options.includeRetired });
  const payload = await apiRequest<FacilityListResponse>(
    append('/api/facilities', query),
  );
  return payload.facilities;
}

export async function getFacility(id: string): Promise<FacilityDto> {
  const payload = await apiRequest<FacilityDto>(`/api/facilities/${id}`);
  return payload;
}

export async function createFacility(
  input: CreateFacilityInput,
): Promise<FacilityDto> {
  const payload = await apiRequest<FacilityDto>('/api/facilities', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload;
}

export async function updateFacility(
  id: string,
  input: UpdateFacilityInput,
): Promise<FacilityDto> {
  const payload = await apiRequest<FacilityDto>(`/api/facilities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload;
}

export async function retireFacility(
  id: string,
  rowVersion: number,
): Promise<FacilityDto> {
  const search = new URLSearchParams();
  search.set('rowVersion', String(rowVersion));
  const payload = await apiRequest<FacilityDto>(
    `/api/facilities/${id}/retire?${search.toString()}`,
    {
      method: 'POST',
      body: JSON.stringify({ rowVersion }),
    },
  );
  return payload;
}

// ---------- Clinical areas ----------

export async function listClinicalAreas(
  options: {
    facilityId?: string;
    includeRetired?: boolean;
  } = {},
): Promise<ClinicalAreaDto[]> {
  const query = buildQuery({
    facilityId: options.facilityId,
    includeRetired: options.includeRetired,
  });
  const payload = await apiRequest<ClinicalAreaListResponse>(
    append('/api/clinicalAreas', query),
  );
  return payload.clinicalAreas;
}

export async function getClinicalArea(id: string): Promise<ClinicalAreaDto> {
  const payload = await apiRequest<ClinicalAreaDto>(`/api/clinicalAreas/${id}`);
  return payload;
}

export async function createClinicalArea(
  input: CreateClinicalAreaInput,
): Promise<ClinicalAreaDto> {
  const payload = await apiRequest<ClinicalAreaDto>('/api/clinicalAreas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload;
}

export async function updateClinicalArea(
  id: string,
  input: UpdateClinicalAreaInput,
): Promise<ClinicalAreaDto> {
  const payload = await apiRequest<ClinicalAreaDto>(
    `/api/clinicalAreas/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return payload;
}

export async function retireClinicalArea(
  id: string,
  rowVersion: number,
): Promise<ClinicalAreaDto> {
  const search = new URLSearchParams();
  search.set('rowVersion', String(rowVersion));
  const payload = await apiRequest<ClinicalAreaDto>(
    `/api/clinicalAreas/${id}/retire?${search.toString()}`,
    {
      method: 'POST',
      body: JSON.stringify({ rowVersion }),
    },
  );
  return payload;
}

// ---------- Disciplines ----------

export async function listDisciplines(
  options: {
    clinicalAreaId?: string;
    includeRetired?: boolean;
  } = {},
): Promise<DisciplineDto[]> {
  const query = buildQuery({
    clinicalAreaId: options.clinicalAreaId,
    includeRetired: options.includeRetired,
  });
  const payload = await apiRequest<DisciplineListResponse>(
    append('/api/disciplines', query),
  );
  return payload.disciplines;
}

export async function getDiscipline(id: string): Promise<DisciplineDto> {
  const payload = await apiRequest<DisciplineDto>(`/api/disciplines/${id}`);
  return payload;
}

export async function createDiscipline(
  input: CreateDisciplineInput,
): Promise<DisciplineDto> {
  const payload = await apiRequest<DisciplineDto>('/api/disciplines', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload;
}

export async function updateDiscipline(
  id: string,
  input: UpdateDisciplineInput,
): Promise<DisciplineDto> {
  const payload = await apiRequest<DisciplineDto>(`/api/disciplines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload;
}

export async function retireDiscipline(
  id: string,
  rowVersion: number,
): Promise<DisciplineDto> {
  const search = new URLSearchParams();
  search.set('rowVersion', String(rowVersion));
  const payload = await apiRequest<DisciplineDto>(
    `/api/disciplines/${id}/retire?${search.toString()}`,
    {
      method: 'POST',
      body: JSON.stringify({ rowVersion }),
    },
  );
  return payload;
}
