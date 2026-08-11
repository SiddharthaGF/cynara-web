import type { SearchSchemaInput } from '@tanstack/react-router';

export type PatientDetailTab =
  | 'overview'
  | 'encounters'
  | 'documents'
  | 'journeys';

const VALID_TABS: readonly PatientDetailTab[] = [
  'overview',
  'encounters',
  'documents',
  'journeys',
];

export interface PatientDetailSearch {
  tab: PatientDetailTab;
}

export type PatientDetailSearchInput = Partial<PatientDetailSearch> &
  SearchSchemaInput;

function isPatientDetailTab(value: unknown): value is PatientDetailTab {
  return (
    typeof value === 'string' &&
    (VALID_TABS as readonly string[]).includes(value)
  );
}

/**
 * The clinical-record chart keeps its active tab in the URL so that browser
 * back/forward and shared links preserve the clinician's context.
 */
export function validatePatientDetailSearch(
  search: PatientDetailSearchInput,
): PatientDetailSearch {
  return { tab: isPatientDetailTab(search.tab) ? search.tab : 'overview' };
}
