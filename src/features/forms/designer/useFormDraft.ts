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

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

interface UseFormDraftResult {
  model: FormDraftModel;
  rowVersion: number;
  saveState: SaveState;
  saveError: string | null;
  validationIssues: ReturnType<typeof validateDraft>;
  isLoading: boolean;
  loadError: string | null;
  isReadOnly: boolean;
  /** Lifecycle status of the applied draft (`draft` | `review` | …). */
  versionStatus: string;
  /** Semver label of the applied draft, when the backend has assigned one. */
  versionLabel: string | null;
  setModel: (updater: (current: FormDraftModel) => FormDraftModel) => void;
  reloadDraft: () => Promise<void>;
  /** Flushes pending edits. Resolves `true` when the draft was persisted. */
  saveNow: () => Promise<boolean>;
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
  const [initial] = useState(() => draftSnapshot(initialDraft));
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

  useEffect(() => {
    modelRef.current = model;
    rowVersionRef.current = rowVersion;
  }, [model, rowVersion]);

  // Adopt the server draft only when we are not mid-edit.
  // Otherwise, a setQueryData race can wipe an AI apply or show a loading flash.
  // Prefer render-time adjustment over an effect that copies props into state.
  if (
    !isDirty &&
    draftQuery.data !== undefined &&
    draftQuery.data !== appliedDraft
  ) {
    const next = draftSnapshot(draftQuery.data);
    setAppliedDraft(draftQuery.data);
    setModelState(next.model);
    setRowVersion(next.rowVersion);
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
      // Keep the local editor model instead of re-parsing it after the canvas
      // Paints the applied schemas.
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

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const { current } = modelRef;
    const issues = validateDraft(current);
    if (issues.length > 0) {
      setSaveState('error');
      setSaveError('Fix validation issues before saving.');
      return false;
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
    try {
      await saveMutation.mutateAsync({
        ...payload,
        rowVersion: rowVersionRef.current,
      });
      return true;
    } catch {
      // The mutation error handler exposes the failure in the editor state.
      return false;
    }
  }, [saveMutation]);

  const setModel = useCallback(
    (updater: (current: FormDraftModel) => FormDraftModel): void => {
      if (isReadOnly) {
        return;
      }
      const next = updater(modelRef.current);
      modelRef.current = next;
      setModelState(next);
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
      (draftQuery.isFetching && !isDirty && draftQuery.data === undefined),
    loadError,
    isReadOnly,
    versionStatus: appliedDraft.status,
    versionLabel: appliedDraft.version,
    setModel,
    reloadDraft,
    saveNow,
    dismissConflict,
  };
}
