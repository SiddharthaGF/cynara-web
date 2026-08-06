import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import type {
  ClinicalDocumentDto,
  StartClinicalDocumentInput,
  TransitionClinicalDocumentInput,
} from '@/api/clinical-documents.ts';
import { describeApiError } from '@/api/error-message.ts';
import type {
  FormResponseDto,
  UpdateFormResponseInput,
} from '@/api/form-responses.ts';
import {
  useCancelClinicalDocumentMutation,
  useCompleteClinicalDocumentMutation,
  useEnterClinicalDocumentInErrorMutation,
  useGetClinicalDocumentQuery,
  useGetFormResponseQuery,
  useGetPublishedFormVersionQuery,
  useListClinicalDocumentsQuery,
  useStartClinicalDocumentMutation,
  useUpdateFormResponseMutation,
} from '@/features/documents/useClinicalDocumentQueries.ts';
import type { FormVersion } from '@/features/forms/types.ts';

export function useEncounterDocuments(encounterId: string): {
  documents: ClinicalDocumentDto[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
} {
  const { t } = useTranslation(['documents', 'api']);
  const query = useListClinicalDocumentsQuery(
    { encounterId },
    encounterId.length > 0,
  );

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  const isForbidden =
    query.isError &&
    query.error instanceof ApiError &&
    (query.error.status === 401 || query.error.status === 403);

  return {
    documents: query.data?.documents ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    isForbidden,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function usePatientDocuments(patientId: string): {
  documents: ClinicalDocumentDto[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
} {
  const { t } = useTranslation(['documents', 'api']);
  const query = useListClinicalDocumentsQuery(
    { patientId },
    patientId.length > 0,
  );

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  const isForbidden =
    query.isError &&
    query.error instanceof ApiError &&
    (query.error.status === 401 || query.error.status === 403);

  return {
    documents: query.data?.documents ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error,
    isForbidden,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useClinicalDocumentDetail(id: string): {
  document: ClinicalDocumentDto | null;
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
} {
  const { t } = useTranslation(['documents', 'api']);
  const query = useGetClinicalDocumentQuery(id);

  const error = useMemo((): string | null => {
    if (query.isError) {
      return describeApiError(query.error, t);
    }
    return null;
  }, [query.isError, query.error, t]);

  const isForbidden =
    query.isError &&
    query.error instanceof ApiError &&
    (query.error.status === 401 || query.error.status === 403);

  return {
    document: query.data ?? null,
    isLoading: query.isLoading,
    error,
    isForbidden,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useStartClinicalDocument(): {
  startDocument: (
    input: StartClinicalDocumentInput,
  ) => Promise<ClinicalDocumentDto>;
  isStarting: boolean;
  error: string | null;
  reset: () => void;
} {
  const { t } = useTranslation(['documents', 'api']);
  const mutation = useStartClinicalDocumentMutation();

  const error = useMemo((): string | null => {
    if (mutation.isError) {
      return describeApiError(mutation.error, t);
    }
    return null;
  }, [mutation.isError, mutation.error, t]);

  return {
    startDocument: mutation.mutateAsync,
    isStarting: mutation.isPending,
    error,
    reset: mutation.reset,
  };
}

export function useClinicalDocumentTransitions(): {
  complete: (
    input: { id: string } & TransitionClinicalDocumentInput,
  ) => Promise<ClinicalDocumentDto>;
  cancel: (
    input: { id: string } & TransitionClinicalDocumentInput,
  ) => Promise<ClinicalDocumentDto>;
  enterInError: (
    input: { id: string } & TransitionClinicalDocumentInput,
  ) => Promise<ClinicalDocumentDto>;
  isTransitioning: boolean;
  error: string | null;
  reset: () => void;
} {
  const { t } = useTranslation(['documents', 'api']);
  const completeMutation = useCompleteClinicalDocumentMutation();
  const cancelMutation = useCancelClinicalDocumentMutation();
  const enterInErrorMutation = useEnterClinicalDocumentInErrorMutation();

  const activeError =
    completeMutation.error ??
    cancelMutation.error ??
    enterInErrorMutation.error;

  const error = useMemo((): string | null => {
    if (activeError) {
      return describeApiError(activeError, t);
    }
    return null;
  }, [activeError, t]);

  return {
    complete: completeMutation.mutateAsync,
    cancel: cancelMutation.mutateAsync,
    enterInError: enterInErrorMutation.mutateAsync,
    isTransitioning:
      completeMutation.isPending ||
      cancelMutation.isPending ||
      enterInErrorMutation.isPending,
    error,
    reset: () => {
      completeMutation.reset();
      cancelMutation.reset();
      enterInErrorMutation.reset();
    },
  };
}

/** Draft-answers mutation used by the in-progress document workspace. */
export function useUpdateFormResponse(): {
  saveAnswers: (
    input: { id: string } & UpdateFormResponseInput,
  ) => Promise<FormResponseDto>;
  isSaving: boolean;
  error: string | null;
  reset: () => void;
} {
  const { t } = useTranslation(['documents', 'api']);
  const mutation = useUpdateFormResponseMutation();

  const error = useMemo((): string | null => {
    if (mutation.isError) {
      return describeApiError(mutation.error, t);
    }
    return null;
  }, [mutation.isError, mutation.error, t]);

  return {
    saveAnswers: mutation.mutateAsync,
    isSaving: mutation.isPending,
    error,
    reset: mutation.reset,
  };
}

/**
 * Loads the live draft answers for an in-progress document alongside the
 * published form snapshot it was started on.
 */
export function useDocumentDraft(formResponseId: string): {
  response: FormResponseDto | null;
  formVersion: FormVersion | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { t } = useTranslation(['documents', 'api']);

  const responseQuery = useGetFormResponseQuery(formResponseId);
  const formVersionId = responseQuery.data?.formVersionId ?? '';
  const versionQuery = useGetPublishedFormVersionQuery(
    formVersionId,
    formVersionId.length > 0,
  );

  const error = useMemo((): string | null => {
    const active = responseQuery.error ?? versionQuery.error;
    if (active) {
      return describeApiError(active, t);
    }
    return null;
  }, [responseQuery.error, versionQuery.error, t]);

  return {
    response: responseQuery.data ?? null,
    formVersion: versionQuery.data ?? null,
    isLoading: responseQuery.isLoading || versionQuery.isLoading,
    error,
    refetch: () => {
      void responseQuery.refetch();
      void versionQuery.refetch();
    },
  };
}

export type {
  ClinicalDocumentDto,
  ListClinicalDocumentsParams,
  StartClinicalDocumentInput,
  TransitionClinicalDocumentInput,
} from '@/api/clinical-documents.ts';
