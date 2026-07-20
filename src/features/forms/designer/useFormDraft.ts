import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '@/api/client.ts';
import { getFormDraft, updateFormDraft } from '@/api/forms.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  createEmptyDraft,
  parseDraft,
  serializeDraft,
  syncRulesSchema,
  syncUiSchema,
} from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';
import { validateDraft } from '@/features/forms/validation/validateDraft.ts';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface UseFormDraftResult {
  model: FormDraftModel;
  rowVersion: number;
  saveState: SaveState;
  saveError: string | null;
  validationIssues: ReturnType<typeof validateDraft>;
  isReadOnly: boolean;
  setModel: (updater: (current: FormDraftModel) => FormDraftModel) => void;
  reloadDraft: () => Promise<void>;
  saveNow: () => Promise<void>;
  dismissConflict: () => void;
}

const AUTOSAVE_MS = 1500;

export function useFormDraft(formCode: string): UseFormDraftResult {
  const queryClient = useQueryClient();
  const [model, setModelState] = useState<FormDraftModel>(() =>
    createEmptyDraft(),
  );
  const [rowVersion, setRowVersion] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const modelRef = useRef(model);
  const rowVersionRef = useRef(rowVersion);
  const timerRef = useRef<number | null>(null);

  const draftQuery = useQuery({
    queryKey: queryKeys.forms.draft(formCode),
    queryFn: async () => {
      const version = await getFormDraft(formCode);
      return version;
    },
  });

  useEffect(() => {
    modelRef.current = model;
    rowVersionRef.current = rowVersion;
  }, [model, rowVersion]);

  const [prevDraftData, setPrevDraftData] = useState(draftQuery.data);
  if (draftQuery.data !== prevDraftData) {
    setPrevDraftData(draftQuery.data);
    if (draftQuery.data) {
      setModelState(parseDraft(draftQuery.data));
      setRowVersion(draftQuery.data.rowVersion);
      setIsReadOnly(draftQuery.data.status === 'review');
      setIsDirty(false);
      setConflictDismissed(false);
    }
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
      setModelState(parseDraft(saved));
      setRowVersion(saved.rowVersion);
      setSaveState('saved');
      setIsDirty(false);
      setConflictDismissed(false);
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
    setConflictDismissed(false);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.forms.draft(formCode),
    });
  }, [formCode, queryClient]);

  const saveNow = useCallback(async (): Promise<void> => {
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

    const payload = serializeDraft(synced);
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
      setModelState((current) => updater(current));
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
    setConflictDismissed(true);
    setSaveState('idle');
  }, []);

  return {
    model,
    rowVersion,
    saveState: saveMutation.isPending ? 'saving' : saveState,
    saveError,
    validationIssues,
    isReadOnly,
    setModel,
    reloadDraft,
    saveNow,
    dismissConflict:
      conflictDismissed && saveState !== 'conflict'
        ? dismissConflict
        : dismissConflict,
  };
}
