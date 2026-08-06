import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createClinicalArea,
  isDuplicateTaxonomyCodeError,
  isForbiddenTaxonomyError,
  isStaleTaxonomyError,
  patchClinicalArea,
  retireClinicalArea,
  type ClinicalAreaDto,
  type CreateClinicalAreaInput,
  type ListClinicalAreasParams,
  type UpdateTaxonomyInput,
} from '@/api/taxonomy.ts';
import {
  useAdminListState,
  useAdminMutationState,
  useListClinicalAreasQuery,
  type AdminListState,
  type AdminMutationState,
} from '@/features/hospital/useAdminQueryState.ts';

async function invalidateClinicalAreasAndBelow(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['clinicalAreas'] });
  await queryClient.invalidateQueries({ queryKey: ['disciplines'] });
}

export function useClinicalAreas(
  params: ListClinicalAreasParams = {},
): AdminListState<ClinicalAreaDto> {
  return useAdminListState(useListClinicalAreasQuery(params));
}

export function useCreateClinicalArea(): AdminMutationState<
  CreateClinicalAreaInput,
  ClinicalAreaDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<ClinicalAreaDto, Error, CreateClinicalAreaInput>(
    {
      mutationFn: createClinicalArea,
      onSuccess: async () => invalidateClinicalAreasAndBelow(queryClient),
    },
  );
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}

export function usePatchClinicalArea(): AdminMutationState<
  { id: string } & UpdateTaxonomyInput,
  ClinicalAreaDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    ClinicalAreaDto,
    Error,
    { id: string } & UpdateTaxonomyInput
  >({
    mutationFn: async ({ id, ...input }) => patchClinicalArea(id, input),
    onSuccess: async () => invalidateClinicalAreasAndBelow(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}

export function useRetireClinicalArea(): AdminMutationState<
  { id: string; rowVersion: number },
  ClinicalAreaDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    ClinicalAreaDto,
    Error,
    { id: string; rowVersion: number }
  >({
    mutationFn: async ({ id, rowVersion }) =>
      retireClinicalArea(id, rowVersion),
    onSuccess: async () => invalidateClinicalAreasAndBelow(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}
