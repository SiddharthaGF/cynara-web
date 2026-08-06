import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createFacility,
  isDuplicateTaxonomyCodeError,
  isForbiddenTaxonomyError,
  isStaleTaxonomyError,
  patchFacility,
  retireFacility,
  type CreateFacilityInput,
  type FacilityDto,
  type ListFacilitiesParams,
  type UpdateTaxonomyInput,
} from '@/api/taxonomy.ts';
import {
  useAdminListState,
  useAdminMutationState,
  useListFacilitiesQuery,
  type AdminListState,
  type AdminMutationState,
} from '@/features/hospital/useAdminQueryState.ts';

const taxonomyInvalidation = [
  ['facilities'] as const,
  ['clinicalAreas'] as const,
  ['disciplines'] as const,
];

async function invalidateTaxonomy(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all(
    taxonomyInvalidation.map(async (prefix) =>
      queryClient.invalidateQueries({ queryKey: prefix }),
    ),
  );
}

export function useFacilities(
  params: ListFacilitiesParams = {},
): AdminListState<FacilityDto> {
  return useAdminListState(useListFacilitiesQuery(params));
}

export function useCreateFacility(): AdminMutationState<
  CreateFacilityInput,
  FacilityDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<FacilityDto, Error, CreateFacilityInput>({
    mutationFn: createFacility,
    onSuccess: async () => invalidateTaxonomy(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}

export function usePatchFacility(): AdminMutationState<
  { id: string } & UpdateTaxonomyInput,
  FacilityDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    FacilityDto,
    Error,
    { id: string } & UpdateTaxonomyInput
  >({
    mutationFn: async ({ id, ...input }) => patchFacility(id, input),
    onSuccess: async () => invalidateTaxonomy(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}

export function useRetireFacility(): AdminMutationState<
  { id: string; rowVersion: number },
  FacilityDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    FacilityDto,
    Error,
    { id: string; rowVersion: number }
  >({
    mutationFn: async ({ id, rowVersion }) => retireFacility(id, rowVersion),
    onSuccess: async () => invalidateTaxonomy(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}
