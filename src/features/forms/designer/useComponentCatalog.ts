import { useQuery } from '@tanstack/react-query';

import { listComponents } from '@/api/components.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { ComponentSummary } from '@/features/forms/types.ts';

export function useComponentCatalog(): ComponentSummary[] {
  const query = useQuery({
    queryKey: queryKeys.components.list(),
    queryFn: listComponents,
  });

  return query.data ?? [];
}
