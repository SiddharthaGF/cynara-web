import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createDiscipline,
  isDuplicateTaxonomyCodeError,
  isForbiddenTaxonomyError,
  isStaleTaxonomyError,
  patchDiscipline,
  retireDiscipline,
  type CreateDisciplineInput,
  type DisciplineDto,
  type ListDisciplinesParams,
  type UpdateTaxonomyInput,
} from '@/api/taxonomy.ts';
import {
  useAdminListState,
  useAdminMutationState,
  useListDisciplinesQuery,
  type AdminListState,
  type AdminMutationState,
} from '@/features/hospital/useAdminQueryState.ts';

async function invalidateDisciplines(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['disciplines'] });
}

export function useDisciplines(
  params: ListDisciplinesParams = {},
): AdminListState<DisciplineDto> {
  return useAdminListState(useListDisciplinesQuery(params));
}

export function useCreateDiscipline(): AdminMutationState<
  CreateDisciplineInput,
  DisciplineDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<DisciplineDto, Error, CreateDisciplineInput>({
    mutationFn: createDiscipline,
    onSuccess: async () => invalidateDisciplines(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}

export function usePatchDiscipline(): AdminMutationState<
  { id: string } & UpdateTaxonomyInput,
  DisciplineDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    DisciplineDto,
    Error,
    { id: string } & UpdateTaxonomyInput
  >({
    mutationFn: async ({ id, ...input }) => patchDiscipline(id, input),
    onSuccess: async () => invalidateDisciplines(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}

export function useRetireDiscipline(): AdminMutationState<
  { id: string; rowVersion: number },
  DisciplineDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    DisciplineDto,
    Error,
    { id: string; rowVersion: number }
  >({
    mutationFn: async ({ id, rowVersion }) => retireDiscipline(id, rowVersion),
    onSuccess: async () => invalidateDisciplines(queryClient),
  });
  return useAdminMutationState(
    mutation,
    isStaleTaxonomyError,
    isDuplicateTaxonomyCodeError,
    isForbiddenTaxonomyError,
  );
}
