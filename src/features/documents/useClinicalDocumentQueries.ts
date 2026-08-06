import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import {
  cancelClinicalDocument,
  completeClinicalDocument,
  enterClinicalDocumentInError,
  getClinicalDocument,
  listClinicalDocuments,
  startClinicalDocument,
  type ClinicalDocumentDto,
  type ClinicalDocumentListResponse,
  type ListClinicalDocumentsParams,
  type StartClinicalDocumentInput,
  type TransitionClinicalDocumentInput,
} from '@/api/clinical-documents.ts';
import {
  getFormResponse,
  getPublishedFormVersion,
  updateFormResponse,
  type FormResponseDto,
  type UpdateFormResponseInput,
} from '@/api/form-responses.ts';
import { queryKeys } from '@/api/query-keys.ts';
import type { FormVersion } from '@/features/forms/types.ts';

export function useListClinicalDocumentsQuery(
  params: ListClinicalDocumentsParams,
  enabled = true,
): UseQueryResult<ClinicalDocumentListResponse> {
  return useQuery({
    queryKey: queryKeys.clinicalDocuments.list(params),
    queryFn: async () => listClinicalDocuments(params),
    enabled,
  });
}

export function useGetClinicalDocumentQuery(
  id: string,
  enabled = true,
): UseQueryResult<ClinicalDocumentDto> {
  return useQuery({
    queryKey: queryKeys.clinicalDocuments.detail(id),
    queryFn: async () => getClinicalDocument(id),
    enabled,
  });
}

export function useGetFormResponseQuery(
  id: string,
  enabled = true,
): UseQueryResult<FormResponseDto> {
  return useQuery({
    queryKey: queryKeys.formResponses.detail(id),
    queryFn: async () => getFormResponse(id),
    enabled,
  });
}

export function useGetPublishedFormVersionQuery(
  id: string,
  enabled = true,
): UseQueryResult<FormVersion> {
  return useQuery({
    queryKey: queryKeys.formVersions.detail(id),
    queryFn: async () => getPublishedFormVersion(id),
    enabled,
  });
}

async function invalidateClinicalDocumentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  document: ClinicalDocumentDto,
): Promise<void> {
  queryClient.setQueryData(
    queryKeys.clinicalDocuments.detail(document.id),
    document,
  );
  await queryClient.invalidateQueries({
    queryKey: queryKeys.clinicalDocuments.all,
  });
}

export function useStartClinicalDocumentMutation(): UseMutationResult<
  ClinicalDocumentDto,
  ApiError | Error,
  StartClinicalDocumentInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startClinicalDocument,
    onSuccess: async (data) => {
      await invalidateClinicalDocumentQueries(queryClient, data);
    },
  });
}

export function useCompleteClinicalDocumentMutation(): UseMutationResult<
  ClinicalDocumentDto,
  ApiError | Error,
  { id: string } & TransitionClinicalDocumentInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) => completeClinicalDocument(id, input),
    onSuccess: async (data) => {
      await invalidateClinicalDocumentQueries(queryClient, data);
    },
  });
}

export function useCancelClinicalDocumentMutation(): UseMutationResult<
  ClinicalDocumentDto,
  ApiError | Error,
  { id: string } & TransitionClinicalDocumentInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) => cancelClinicalDocument(id, input),
    onSuccess: async (data) => {
      await invalidateClinicalDocumentQueries(queryClient, data);
    },
  });
}

export function useEnterClinicalDocumentInErrorMutation(): UseMutationResult<
  ClinicalDocumentDto,
  ApiError | Error,
  { id: string } & TransitionClinicalDocumentInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) =>
      enterClinicalDocumentInError(id, input),
    onSuccess: async (data) => {
      await invalidateClinicalDocumentQueries(queryClient, data);
    },
  });
}

export function useUpdateFormResponseMutation(): UseMutationResult<
  FormResponseDto,
  ApiError | Error,
  { id: string } & UpdateFormResponseInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) => updateFormResponse(id, input),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.formResponses.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.formResponses.all,
      });
    },
  });
}
