import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '@/api/client.ts';
import { getFormDraft, updateFormDraft } from '@/api/forms.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  parseDraft,
  syncRulesSchema,
  syncUiSchema,
} from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel, FormVersion } from '@/features/forms/types.ts';
import { validateDraft } from '@/features/forms/validation/validateDraft.ts';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

interface UseFormDraftResult {
  model: FormDraftModel;
  rowVersion: number;
  saveState: SaveState;
  saveError: string | null;
  validationIssues: ReturnType<typeof validateDraft>;
  isLoading: boolean;
  loadError: string | null;
  isReadOnly: boolean;
  setModel: (updater: (current: FormDraftModel) => FormDraftModel) => void;
  reloadDraft: () => Promise<void>;
  saveNow: () => Promise<void>;
  dismissConflict: () => void;
}

const AUTOSAVE_MS = 1500;

function draftSnapshot(version: FormVersion): {
  model: FormDraftModel;
  rowVersion: number;
  isReadOnly: boolean;
} {
  return {
    model: parseDraft(version),
    rowVersion: version.rowVersion,
    isReadOnly: version.status === 'review',
  };
}

export function useFormDraft(
  formCode: string,
  initialDraft: FormVersion,
): UseFormDraftResult {
  const queryClient = useQueryClient();
  const initial = draftSnapshot(initialDraft);
  const [model, setModelState] = useState<FormDraftModel>(initial.model);
  const [rowVersion, setRowVersion] = useState(initial.rowVersion);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(initial.isReadOnly);
  const [isDirty, setIsDirty] = useState(false);
  // Track which server draft has been applied into local editor state.
  const [appliedDraft, setAppliedDraft] = useState<FormVersion>(initialDraft);
  const modelRef = useRef(model);
  const rowVersionRef = useRef(rowVersion);
  const timerRef = useRef<number | null>(null);
  const [trackedFormCode, setTrackedFormCode] = useState(formCode);

  const draftQuery = useQuery({
    queryKey: queryKeys.forms.draft(formCode),
    queryFn: async () => {
      const draft = await getFormDraft(formCode);
      return draft;
    },
    initialData: initialDraft,
    // Designer owns local edits; only reloadDraft / save should refresh cache.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (trackedFormCode !== formCode) {
    const next = draftSnapshot(initialDraft);
    setTrackedFormCode(formCode);
    setModelState(next.model);
    modelRef.current = next.model;
    setRowVersion(next.rowVersion);
    rowVersionRef.current = next.rowVersion;
    setSaveState('idle');
    setSaveError(null);
    setIsReadOnly(next.isReadOnly);
    setIsDirty(false);
    setAppliedDraft(initialDraft);
  }

  useEffect(() => {
    modelRef.current = model;
    rowVersionRef.current = rowVersion;
  }, [model, rowVersion]);

  // Adopt server draft only when we are not mid-edit. Otherwise a refetch /
  // setQueryData race can wipe an AI apply or show a loading flash.
  if (
    !isDirty &&
    draftQuery.data !== undefined &&
    draftQuery.data !== appliedDraft
  ) {
    const next = draftSnapshot(draftQuery.data);
    setAppliedDraft(draftQuery.data);
    setModelState(next.model);
    modelRef.current = next.model;
    setRowVersion(next.rowVersion);
    rowVersionRef.current = next.rowVersion;
    setIsReadOnly(next.isReadOnly);
  }

  const saveMutation = useMutation({
    mutationFn: async (input: {
      clinicalSchemaJson: string;
      uiSchemaJson: string | null;
      rulesSchemaJson: string | null;
      rowVersion: number;
    }) => {
      const saved = await updateFormDraft(formCode, input);
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.forms.draft(formCode), saved);
      // Keep the local editor model — re-parsing a large AI draft here freezes
      // the canvas right after it already painted the applied schemas.
      setAppliedDraft(saved);
      setRowVersion(saved.rowVersion);
      rowVersionRef.current = saved.rowVersion;
      setIsReadOnly(saved.status === 'review');
      setSaveState('saved');
      setIsDirty(false);
      setSaveError(null);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setSaveState('conflict');
        setSaveError(error.message);
        return;
      }

      if (error instanceof ApiError && error.status === 400) {
        setSaveState('error');
        setSaveError(error.message);
        return;
      }

      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Save failed.');
    },
  });

  const validationIssues = useMemo(() => validateDraft(model), [model]);

  const reloadDraft = useCallback(async (): Promise<void> => {
    setSaveState('idle');
    setSaveError(null);
    setIsDirty(false);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.forms.draft(formCode),
    });
  }, [formCode, queryClient]);

  const saveNow = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const { current } = modelRef;
    const issues = validateDraft(current);
    if (issues.length > 0) {
      setSaveState('error');
      setSaveError('Fix validation issues before saving.');
      return;
    }

    const synced: FormDraftModel = {
      clinical: current.clinical,
      ui: syncUiSchema(current.clinical, current.ui),
      rules: syncRulesSchema(current.clinical, current.rules),
    };

    setSaveState('saving');
    setSaveError(null);

    const payload = {
      clinicalSchemaJson: JSON.stringify(synced.clinical),
      uiSchemaJson: JSON.stringify(synced.ui),
      rulesSchemaJson: JSON.stringify(synced.rules),
    };
    await saveMutation.mutateAsync({
      ...payload,
      rowVersion: rowVersionRef.current,
    });
  }, [saveMutation]);

  const setModel = useCallback(
    (updater: (current: FormDraftModel) => FormDraftModel): void => {
      if (isReadOnly) {
        return;
      }
      setModelState((current) => {
        const next = updater(current);
        modelRef.current = next;
        return next;
      });
      setIsDirty(true);
      setSaveState('idle');
    },
    [isReadOnly],
  );

  useEffect(() => {
    if (isDirty && !isReadOnly && saveState !== 'conflict') {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        void saveNow();
      }, AUTOSAVE_MS);
    }

    return (): void => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [isDirty, isReadOnly, model, saveNow, saveState]);

  const dismissConflict = useCallback((): void => {
    setSaveState('idle');
  }, []);

  const isSynced =
    draftQuery.data !== undefined && appliedDraft === draftQuery.data;

  let loadError: string | null = null;
  if (draftQuery.isError && !draftQuery.data) {
    loadError =
      draftQuery.error instanceof Error
        ? draftQuery.error.message
        : 'Failed to load draft.';
  }

  return {
    model,
    rowVersion,
    saveState: saveMutation.isPending ? 'saving' : saveState,
    saveError,
    validationIssues,
    // Never flash the loader over dirty local edits (e.g. AI apply + refetch).
    isLoading:
      draftQuery.isPending ||
      (draftQuery.isFetching && !isSynced && !isDirty),
    loadError,
    isReadOnly,
    setModel,
    reloadDraft,
    saveNow,
    dismissConflict,
  };
}
