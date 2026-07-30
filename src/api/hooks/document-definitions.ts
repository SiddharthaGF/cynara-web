import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { ApiError } from '@/api/client.ts';
import { withConcurrencyRetry } from '@/api/concurrency.ts';
import {
  createDocumentDefinition,
  deleteDocumentDefinition,
  getDocumentDefinition,
  listDocumentDefinitions,
  patchDocumentDefinition,
  patchDocumentDefinitionRelationship,
  retireDocumentDefinition,
  type CreateDocumentDefinitionInput,
  type DocumentDefinition,
  type DocumentDefinitionRelationship,
  type ListDocumentDefinitionsOptions,
  type PatchDocumentDefinitionInput,
} from '@/api/document-definitions.ts';
import { STALE_TIMES, type HookMutationOptions } from '@/api/hooks/_shared.ts';
import { queryKeys } from '@/api/query-keys.ts';

interface RefreshRowVersion {
  refreshRowVersion?: () => number;
}

// ---------- List / detail ----------

export interface UseDocumentDefinitionsQueryOptions extends Omit<
  UseQueryOptions<DocumentDefinition[], ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  listOptions?: ListDocumentDefinitionsOptions;
}

export function useDocumentDefinitionsQuery(
  options: UseDocumentDefinitionsQueryOptions = {},
) {
  const { listOptions, ...rest } = options;
  return useQuery<DocumentDefinition[], ApiError | Error>({
    queryKey: queryKeys.documentDefinitions.list({
      facilityId: listOptions?.facilityId,
      clinicalAreaId: listOptions?.clinicalAreaId,
      disciplineId: listOptions?.disciplineId,
      status: listOptions?.status,
    }),
    queryFn: async () => listDocumentDefinitions(listOptions ?? {}),
    staleTime: STALE_TIMES.thirtySeconds,
    ...rest,
  });
}

export interface UseDocumentDefinitionQueryOptions extends Omit<
  UseQueryOptions<DocumentDefinition, ApiError | Error>,
  'queryKey' | 'queryFn'
> {
  include?: readonly string[];
  enabled?: boolean;
}

export function useDocumentDefinitionQuery(
  id: string,
  options: UseDocumentDefinitionQueryOptions = {},
) {
  const { include, enabled, ...rest } = options;
  return useQuery<DocumentDefinition, ApiError | Error>({
    queryKey: queryKeys.documentDefinitions.detail(id),
    queryFn: async () => getDocumentDefinition(id, { include }),
    staleTime: STALE_TIMES.thirtySeconds,
    enabled: enabled ?? true,
    ...rest,
  });
}

// ---------- Mutations ----------

export type CreateDocumentDefinitionMutationOptions = HookMutationOptions<
  DocumentDefinition,
  ApiError | Error,
  CreateDocumentDefinitionInput
>;

export function useCreateDocumentDefinitionMutation(
  options: CreateDocumentDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    DocumentDefinition,
    ApiError | Error,
    CreateDocumentDefinitionInput
  >({
    mutationFn: async (input) => {
      const result = await createDocumentDefinition(input);
      return result;
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documentDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface PatchDocumentDefinitionMutationVariables extends RefreshRowVersion {
  id: string;
  input: PatchDocumentDefinitionInput;
}

export type PatchDocumentDefinitionMutationOptions = HookMutationOptions<
  DocumentDefinition,
  ApiError | Error,
  PatchDocumentDefinitionMutationVariables
>;

export function usePatchDocumentDefinitionMutation(
  options: PatchDocumentDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    DocumentDefinition,
    ApiError | Error,
    PatchDocumentDefinitionMutationVariables
  >({
    mutationFn: async ({ id, input, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        const result = await patchDocumentDefinition(id, input);
        return result;
      }
      return withConcurrencyRetry<DocumentDefinition>({
        refreshRowVersion,
        perform: async (latest) => {
          const result = await patchDocumentDefinition(id, {
            ...input,
            attributes: { ...input.attributes, rowVersion: latest },
          });
          return result;
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.documentDefinitions.detail(variables.id),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documentDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface PatchDocumentDefinitionRelationshipVariables {
  id: string;
  relationship: DocumentDefinitionRelationship;
  relatedId: string | null;
}

export type PatchDocumentDefinitionRelationshipMutationOptions =
  HookMutationOptions<
    DocumentDefinition,
    ApiError | Error,
    PatchDocumentDefinitionRelationshipVariables
  >;

export function usePatchDocumentDefinitionRelationshipMutation(
  options: PatchDocumentDefinitionRelationshipMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    DocumentDefinition,
    ApiError | Error,
    PatchDocumentDefinitionRelationshipVariables
  >({
    mutationFn: async ({ id, relationship, relatedId }) => {
      const result = await patchDocumentDefinitionRelationship(
        id,
        relationship,
        relatedId,
      );
      return result;
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.documentDefinitions.detail(variables.id),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documentDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface DeleteDocumentDefinitionMutationVariables {
  id: string;
  rowVersion?: number;
}

export type DeleteDocumentDefinitionMutationOptions = HookMutationOptions<
  void,
  ApiError | Error,
  DeleteDocumentDefinitionMutationVariables
>;

export function useDeleteDocumentDefinitionMutation(
  options: DeleteDocumentDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    // eslint-disable-next-line typescript/no-invalid-void-type
    void,
    ApiError | Error,
    DeleteDocumentDefinitionMutationVariables
  >({
    mutationFn: async ({ id, rowVersion }) => {
      await deleteDocumentDefinition(id, { rowVersion });
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: queryKeys.documentDefinitions.detail(variables.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documentDefinitions.all,
      });
      options.onSuccess?.(undefined, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}

export interface RetireDocumentDefinitionMutationVariables extends RefreshRowVersion {
  id: string;
  rowVersion: number;
}

export type RetireDocumentDefinitionMutationOptions = HookMutationOptions<
  DocumentDefinition,
  ApiError | Error,
  RetireDocumentDefinitionMutationVariables
>;

export function useRetireDocumentDefinitionMutation(
  options: RetireDocumentDefinitionMutationOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    DocumentDefinition,
    ApiError | Error,
    RetireDocumentDefinitionMutationVariables
  >({
    mutationFn: async ({ id, rowVersion, refreshRowVersion }) => {
      if (!refreshRowVersion) {
        const result = await retireDocumentDefinition(id, rowVersion);
        return result;
      }
      return withConcurrencyRetry<DocumentDefinition>({
        refreshRowVersion,
        perform: async (latest) => {
          const result = await retireDocumentDefinition(id, latest);
          return result;
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(
        queryKeys.documentDefinitions.detail(variables.id),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documentDefinitions.all,
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
    },
  });
}
