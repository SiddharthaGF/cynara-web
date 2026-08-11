import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import {
  getEncounterJourney,
  getPatientJourney,
  isForbiddenPipelineError,
  type EncounterJourneyResponse,
  type PatientJourney,
  type PatientJourneyResponse,
} from '@/api/pipelines.ts';
import { queryKeys } from '@/api/query-keys.ts';

interface JourneyQueryState {
  journeys: PatientJourney[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
}

function useJourneyQuery(
  query: UseQueryResult<PatientJourneyResponse | EncounterJourneyResponse>,
): JourneyQueryState {
  const { t } = useTranslation(['journeys', 'api']);

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  const isForbidden = query.isError && isForbiddenPipelineError(query.error);

  return {
    journeys: query.data?.journeys ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    isForbidden,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** All pipeline journeys for a patient record (patient- and encounter-bound). */
export function usePatientJourney(
  patientId: string,
  enabled = true,
): JourneyQueryState {
  const query = useQuery({
    queryKey: queryKeys.journeys.list({ patientId }),
    queryFn: async () => getPatientJourney(patientId),
    enabled: enabled && patientId.length > 0,
  });
  return useJourneyQuery(query);
}

/** Pipeline journeys bound to a single encounter. */
export function useEncounterJourney(
  encounterId: string,
  enabled = true,
): JourneyQueryState {
  const query = useQuery({
    queryKey: queryKeys.journeys.list({ encounterId }),
    queryFn: async () => getEncounterJourney(encounterId),
    enabled: enabled && encounterId.length > 0,
  });
  return useJourneyQuery(query);
}
