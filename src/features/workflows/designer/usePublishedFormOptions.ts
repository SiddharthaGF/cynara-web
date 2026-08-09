import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  listFormVersionPickerOptions,
  type FormVersionPickerOption,
} from '@/api/formVersionPicker.ts';
import { queryKeys } from '@/api/query-keys.ts';

/**
 * Form definitions with their published versions, shared with the clinical
 * document catalog picker. Only published versions can back a workflow task,
 * so draft/review versions are omitted.
 */
export function usePublishedFormOptions(): UseQueryResult<
  FormVersionPickerOption[]
> {
  return useQuery({
    queryKey: queryKeys.formDefinitions.versionOptions(),
    queryFn: listFormVersionPickerOptions,
    staleTime: 5 * 60 * 1000,
  });
}
