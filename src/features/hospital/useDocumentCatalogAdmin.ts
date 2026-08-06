import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createDocumentDefinition,
  isDuplicateDocumentCodeError,
  isForbiddenDocumentCatalogError,
  isStaleDocumentCatalogError,
  patchDocumentDefinition,
  retireDocumentDefinition,
  type CreateDocumentDefinitionInput,
  type DocumentDefinitionDto,
  type ListDocumentDefinitionsParams,
  type UpdateDocumentDefinitionInput,
} from '@/api/document-catalog.ts';
import { describeApiError } from '@/api/error-message.ts';
import type { FormVersionPickerOption } from '@/api/forms.ts';
import {
  useAdminListState,
  useAdminMutationState,
  useFormVersionPickerOptionsQuery,
  useListDocumentDefinitionsQuery,
  type AdminListState,
  type AdminMutationState,
} from '@/features/hospital/useAdminQueryState.ts';

export function useDocumentDefinitions(
  params: ListDocumentDefinitionsParams = {},
): AdminListState<DocumentDefinitionDto> {
  return useAdminListState(useListDocumentDefinitionsQuery(params));
}

export function useFormVersionPickerOptions(): {
  options: FormVersionPickerOption[];
  isLoading: boolean;
  error: string | null;
} {
  const { t } = useTranslation(['hospital', 'api']);
  const query = useFormVersionPickerOptionsQuery();

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  return {
    options: query.data ?? [],
    isLoading: query.isLoading,
    error,
  };
}

export function useCreateDocumentDefinition(): AdminMutationState<
  CreateDocumentDefinitionInput,
  DocumentDefinitionDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    DocumentDefinitionDto,
    Error,
    CreateDocumentDefinitionInput
  >({
    mutationFn: createDocumentDefinition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['documentDefinitions'],
      });
    },
  });
  return useAdminMutationState(
    mutation,
    isStaleDocumentCatalogError,
    isDuplicateDocumentCodeError,
    isForbiddenDocumentCatalogError,
  );
}

export function usePatchDocumentDefinition(): AdminMutationState<
  { id: string } & UpdateDocumentDefinitionInput,
  DocumentDefinitionDto
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    DocumentDefinitionDto,
    Error,
    { id: string } & UpdateDocumentDefinitionInput
  >({
    mutationFn: async ({ id, ...input }) => patchDocumentDefinition(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['documentDefinitions'],
      });
    },
  });
  return useAdminMutationState(
    mutation,
    isStaleDocumentCatalogError,
    isDuplicateDocumentCodeError,
    isForbiddenDocumentCatalogError,
  );
}

export function useRetireDocumentDefinition(): AdminMutationState<
  { id: string; rowVersion: number },
  unknown
> {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    unknown,
    Error,
    { id: string; rowVersion: number }
  >({
    mutationFn: async ({ id, rowVersion }) =>
      retireDocumentDefinition(id, rowVersion),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['documentDefinitions'],
      });
    },
  });
  return useAdminMutationState(
    mutation,
    isStaleDocumentCatalogError,
    isDuplicateDocumentCodeError,
    isForbiddenDocumentCatalogError,
  );
}
