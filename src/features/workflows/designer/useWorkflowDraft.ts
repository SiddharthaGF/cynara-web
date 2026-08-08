import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { ApiError } from '@/api/client.ts';
import { queryKeys } from '@/api/query-keys.ts';
import { getWorkflowDraft, updateWorkflowDraft } from '@/api/workflows.ts';
import {
  createDefaultWorkflowGraph,
  parseWorkflowGraph,
  serializeWorkflowGraph,
} from '@/features/workflows/model/workflowGraph.ts';
import {
  createWorkflowHistory,
  workflowHistoryReducer,
} from '@/features/workflows/model/workflowHistory.ts';
import type {
  WorkflowGraph,
  WorkflowValidationIssue,
  WorkflowVersion,
} from '@/features/workflows/types.ts';
import {
  blockingIssues,
  validateWorkflowGraph,
} from '@/features/workflows/validation/validateWorkflowGraph.ts';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface UseWorkflowDraftResult {
  graph: WorkflowGraph;
  rowVersion: number;
  saveState: SaveState;
  saveError: string | null;
  validationIssues: WorkflowValidationIssue[];
  isLoading: boolean;
  loadError: string | null;
  isReadOnly: boolean;
  setGraph: (updater: (current: WorkflowGraph) => WorkflowGraph) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reloadDraft: () => Promise<void>;
  saveNow: () => Promise<void>;
  dismissConflict: () => void;
}

const AUTOSAVE_MS = 1500;
const MAX_SAVE_ATTEMPTS = 3;
const SAVE_RETRY_BASE_MS = 600;

function draftSnapshot(version: WorkflowVersion): {
  graph: WorkflowGraph;
  rowVersion: number;
  isReadOnly: boolean;
} {
  return {
    graph: parseWorkflowGraph(version.workflowSchemaJson),
    rowVersion: version.rowVersion,
    isReadOnly: version.status !== 'draft',
  };
}

export function useWorkflowDraft(
  code: string,
  initialDraft: WorkflowVersion,
): UseWorkflowDraftResult {
  const queryClient = useQueryClient();
  const [initial] = useState(() => draftSnapshot(initialDraft));
  const [history, dispatchHistory] = useReducer(
    workflowHistoryReducer<WorkflowGraph>,
    initial.graph,
    createWorkflowHistory,
  );
  const { present: graph } = history;
  const [rowVersion, setRowVersion] = useState(initial.rowVersion);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(initial.isReadOnly);
  const [isDirty, setIsDirty] = useState(false);
  const graphRef = useRef(graph);
  const rowVersionRef = useRef(rowVersion);
  const timerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const savedGraphRef = useRef(graph);

  const draftQuery = useQuery({
    queryKey: queryKeys.workflowDefinitions.draft(code),
    queryFn: async () => getWorkflowDraft(code),
    initialData: initialDraft,
    // Designer owns local edits; only reloadDraft / save should refresh cache.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    graphRef.current = graph;
    rowVersionRef.current = rowVersion;
  }, [graph, rowVersion]);

  const saveMutation = useMutation({
    mutationFn: async (input: {
      workflowSchemaJson: string;
      rowVersion: number;
    }) => {
      const saved = await updateWorkflowDraft(code, input);
      return saved;
    },
    onSuccess: (saved: WorkflowVersion) => {
      queryClient.setQueryData(
        queryKeys.workflowDefinitions.draft(code),
        saved,
      );
      setRowVersion(saved.rowVersion);
      rowVersionRef.current = saved.rowVersion;
      setIsReadOnly(saved.status !== 'draft');
      // Edits landing while a save is in flight keep the draft dirty.
      // The next autosave cycle then persists them instead of dropping them.
      setIsDirty(graphRef.current !== savedGraphRef.current);
      setSaveState('saved');
      setSaveError(null);
    },
  });

  const failSave = useCallback((error: unknown): void => {
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
  }, []);

  /**
   * Runs one save attempt and, for autosave, retries up to
   * `MAX_SAVE_ATTEMPTS` times with a short backoff. The whole attempt/retry
   * window stays in the single `saving` state so the error banner only
   * appears once the final attempt has failed.
   */
  const runSaveCycle = useCallback(
    async (attempt: number, retryOnFailure: boolean): Promise<void> => {
      if (saveInFlightRef.current) {
        return;
      }
      const { current } = graphRef;
      const issues = validateWorkflowGraph(current);
      if (blockingIssues(issues).length > 0) {
        // The validation indicator already surfaces the graph problems.
        // A separate save-error message would just duplicate it.
        setSaveState('error');
        setSaveError(null);
        return;
      }

      setSaveState('saving');
      setSaveError(null);
      savedGraphRef.current = current;
      saveInFlightRef.current = true;

      try {
        await saveMutation.mutateAsync({
          workflowSchemaJson: serializeWorkflowGraph(current),
          rowVersion: rowVersionRef.current,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          failSave(error);
          return;
        }
        if (retryOnFailure && attempt < MAX_SAVE_ATTEMPTS) {
          retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = null;
            void runSaveCycle(attempt + 1, retryOnFailure);
          }, SAVE_RETRY_BASE_MS * attempt);
          return;
        }
        failSave(error);
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [failSave, saveMutation],
  );

  const validationIssues = useMemo(() => validateWorkflowGraph(graph), [graph]);

  const reloadDraft = useCallback(async (): Promise<void> => {
    setSaveState('idle');
    setSaveError(null);
    setIsDirty(false);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.workflowDefinitions.draft(code),
    });
    const next = queryClient.getQueryData<WorkflowVersion>(
      queryKeys.workflowDefinitions.draft(code),
    );
    if (next !== undefined) {
      const snapshot = draftSnapshot(next);
      dispatchHistory({ type: 'reset', present: snapshot.graph });
      setRowVersion(snapshot.rowVersion);
      setIsReadOnly(snapshot.isReadOnly);
    }
  }, [code, queryClient]);

  const saveNow = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    await runSaveCycle(1, false);
  }, [runSaveCycle]);

  const setGraph = useCallback(
    (updater: (current: WorkflowGraph) => WorkflowGraph): void => {
      if (isReadOnly) {
        return;
      }
      const next = updater(graphRef.current);
      if (next === graphRef.current) {
        return;
      }
      graphRef.current = next;
      dispatchHistory({ type: 'commit', next });
      setIsDirty(true);
      setSaveState('idle');
    },
    [isReadOnly],
  );

  const undo = useCallback((): void => {
    if (isReadOnly || history.past.length === 0) {
      return;
    }
    setIsDirty(true);
    setSaveState('idle');
    dispatchHistory({ type: 'undo' });
  }, [isReadOnly, history.past.length]);

  const redo = useCallback((): void => {
    if (isReadOnly || history.future.length === 0) {
      return;
    }
    setIsDirty(true);
    setSaveState('idle');
    dispatchHistory({ type: 'redo' });
  }, [isReadOnly, history.future.length]);

  useEffect(() => {
    // Autosave only arms from an idle or saved state.
    // Errors and in-flight retries never re-arm the timer.
    // This prevents an endless save loop that flickers the error banner.
    if (
      !isDirty ||
      isReadOnly ||
      saveState === 'conflict' ||
      (saveState !== 'idle' && saveState !== 'saved')
    ) {
      return undefined;
    }
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      void runSaveCycle(1, true);
    }, AUTOSAVE_MS);
    return (): void => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [graph, isDirty, isReadOnly, runSaveCycle, saveState]);

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

  // Ensure a draft that has not been authored yet still renders a valid
  // Starting graph (e.g. a definition created without initial JSON). The
  // Fallback is memoized so an empty graph keeps a stable identity; allocating
  // A fresh object every render would re-project the flow on each pass.
  const emptyDraftFallback = useMemo(createDefaultWorkflowGraph, []);
  const resolvedGraph = graph.nodes.length === 0 ? emptyDraftFallback : graph;

  return {
    graph: resolvedGraph,
    rowVersion,
    saveState: saveMutation.isPending ? 'saving' : saveState,
    saveError,
    validationIssues,
    isLoading:
      draftQuery.isPending ||
      (draftQuery.isFetching && !isDirty && draftQuery.data === undefined),
    loadError,
    isReadOnly,
    setGraph,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reloadDraft,
    saveNow,
    dismissConflict,
  };
}
