import type { SearchSchemaInput } from '@tanstack/react-router';

import { DEFAULT_PATIENT_PAGE_SIZE } from '@/features/patients/usePatientsCatalog.ts';

export interface PatientListSearch {
  mrn?: string;
  givenName?: string;
  familyName?: string;
  nationalId?: string;
  page: number;
  pageSize: number;
}

export type PatientListSearchInput = Partial<PatientListSearch> &
  SearchSchemaInput;

function positiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

export function validatePatientListSearch(
  search: PatientListSearchInput,
): PatientListSearch {
  return {
    mrn: optionalString(search.mrn),
    givenName: optionalString(search.givenName),
    familyName: optionalString(search.familyName),
    nationalId: optionalString(search.nationalId),
    page: positiveInt(search.page, 1),
    pageSize: positiveInt(search.pageSize, DEFAULT_PATIENT_PAGE_SIZE),
  };
}
